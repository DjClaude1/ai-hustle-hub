import { corsHeaders, json, requirePro } from "../_shared/proAccess.ts";

const PROMPTS = {
  landing: `You are a senior conversion copywriter and front-end designer. From the business plan provided, build ONE complete, production-ready, single-file HTML landing page for this business.
Rules:
- Output ONLY raw HTML starting with <!DOCTYPE html>. No markdown fences, no commentary.
- All CSS in one <style> tag. No external JS. Google Fonts allowed via <link>. Use the brand colours/fonts from the plan when present.
- Mobile-first, responsive, polished modern design with real visual hierarchy.
- Sections: sticky nav with brand name, hero (headline, subheadline, primary CTA button), problem/pain, solution & benefits (3-6 cards), what's included / product breakdown, pricing (from the plan), testimonial-style social proof framed as "what you'll achieve" (no fake names or fake reviews), FAQ (5+), final CTA, footer.
- CTA buttons link to "#buy". Include an email capture form (action="#").
- Use only facts from the plan; no lorem ipsum, no placeholders like [Your Name].`,
  product: `You are an expert author and course creator. From the business plan provided, CREATE THE ACTUAL DIGITAL PRODUCT the business sells (e.g. the full eBook, guide, course, templates or toolkit) — not an outline, the real finished content ready to sell.
Rules:
- Output in clean Markdown: # Title, a short intro, ## chapters/modules, ### sections, bullets, numbered steps, worksheets/checklists and examples where useful.
- Aim for 3,500-6,000 words of genuinely useful, specific, actionable content. Minimum 7 chapters/modules.
- Include a "How to use this" section at the start and a "Next steps / action plan" at the end.
- No placeholders, no filler, no "in this chapter we will" padding.`,
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const gate = await requirePro(req);
    if (gate instanceof Response) return gate;
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI is not configured" }, 500);

    const { kind, plan } = await req.json();
    if (kind !== "landing" && kind !== "product") return json({ error: "kind must be landing or product" }, 400);
    if (!plan || typeof plan !== "string" || plan.length < 100) return json({ error: "Generate the business plan first" }, 400);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: PROMPTS[kind as keyof typeof PROMPTS],
        input: `BUSINESS PLAN:\n${plan.slice(0, 20000)}`,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
      }),
    });
    if (!resp.ok || !resp.body) {
      const t = await resp.text();
      console.error("AI error", resp.status, t.slice(0, 300));
      const msg = resp.status === 429 ? "Too many requests, please try again shortly." : resp.status === 402 ? "AI credits exhausted." : "Generation failed";
      return json({ error: msg }, resp.status);
    }

    // Pass the text deltas straight through as a plain text stream.
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            const p = line.slice(5).trim();
            if (p === "[DONE]") continue;
            try {
              const ev = JSON.parse(p);
              if (ev.type === "response.output_text.delta") controller.enqueue(enc.encode(ev.delta));
              if (ev.type === "error" || ev.type === "response.failed") console.error("AI stream error", p.slice(0, 300));
            } catch { /* partial */ }
          }
        }
        controller.close();
      },
    });
    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" } });
  } catch (e) {
    console.error("business-execute error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
