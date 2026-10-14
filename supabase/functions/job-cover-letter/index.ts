import { corsHeaders, json, requirePro } from "../_shared/proAccess.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const gate = await requirePro(req);
    if (gate instanceof Response) return gate;
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI is not configured" }, 500);

    const { job, cvText, fullName, tone = "Professional" } = await req.json();
    if (!job?.title || !cvText) return json({ error: "job and cvText are required" }, 400);

    const instructions = `You write tailored, specific job application cover letters. Output only the letter in plain text (no markdown headings), 250-380 words, ${tone} tone. Connect the candidate's real experience from their CV to the job's requirements with concrete examples. Never invent employers, degrees or numbers that are not in the CV. No placeholders like [Company]; if a detail is unknown, write around it. Sign off with the candidate's name.`;
    const input = `JOB TITLE: ${job.title}\nCOMPANY: ${job.company ?? "Unknown"}\nLOCATION: ${job.location ?? ""}\nJOB DESCRIPTION:\n${String(job.description ?? "").slice(0, 4000)}\n\nCANDIDATE NAME: ${fullName || "(use name from CV)"}\nCANDIDATE CV:\n${String(cvText).slice(0, 9000)}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions,
        input,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
      }),
    });
    if (!resp.ok || !resp.body) {
      const t = await resp.text();
      console.error("AI error", resp.status, t.slice(0, 300));
      const msg = resp.status === 429 ? "Too many requests, please try again shortly." : resp.status === 402 ? "AI credits exhausted." : "Cover letter generation failed";
      return json({ error: msg, status: resp.status }, resp.status);
    }

    // Consume SSE and collect text
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta;
          if (ev.type === "error" || ev.type === "response.failed") console.error("AI stream error", payload.slice(0, 300));
        } catch { /* partial */ }
      }
    }
    if (!text.trim()) return json({ error: "The AI returned an empty letter" }, 502);
    return json({ coverLetter: text.trim() });
  } catch (e) {
    console.error("job-cover-letter error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
