import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProviderConfig {
  name: string;
  url: string;
  model: string;
  getKey: () => string | undefined;
  timeout: number;
  supportsTools: boolean;
}

const PROVIDERS: ProviderConfig[] = [
  { name: "openai", url: "https://ai.gateway.lovable.dev/v1/chat/completions", model: "openai/gpt-5-mini", getKey: () => Deno.env.get("LOVABLE_API_KEY"), timeout: 15000, supportsTools: true },
  { name: "gemini", url: "https://ai.gateway.lovable.dev/v1/chat/completions", model: "google/gemini-2.5-flash", getKey: () => Deno.env.get("LOVABLE_API_KEY"), timeout: 15000, supportsTools: true },
  { name: "together", url: "https://api.together.xyz/v1/chat/completions", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", getKey: () => Deno.env.get("TOGETHER_API_KEY"), timeout: 15000, supportsTools: false },
  { name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile", getKey: () => Deno.env.get("GROQ_API_KEY"), timeout: 15000, supportsTools: false },
];

const CV_SYSTEM_PROMPT = `You are a CV/resume parser. Extract structured data from the provided CV text. Return ONLY a valid JSON object with these fields (use empty string "" if not found):
{
  "fullName": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedIn": "",
  "portfolio": "",
  "role": "",
  "experience": "",
  "skills": "",
  "education": "",
  "summary": ""
}
Rules:
- "fullName": the person's full name
- "role": the most recent job title or target role
- "experience": a summary of ALL work experience as plain text, include company names, dates, and responsibilities
- "skills": comma-separated list of skills
- "education": education history as plain text including institution names and degrees
- "summary": professional summary or objective if present
- Return ONLY the JSON object, no markdown fences, no explanation, no extra text.`;

const CV_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_cv_data",
    description: "Extract structured CV data from text",
    parameters: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        linkedIn: { type: "string" },
        portfolio: { type: "string" },
        role: { type: "string" },
        experience: { type: "string" },
        skills: { type: "string" },
        education: { type: "string" },
        summary: { type: "string" },
      },
      required: ["fullName", "email", "role", "experience", "skills", "education"],
    },
  },
};

const EXPECTED_KEYS = ["fullName", "email", "phone", "location", "linkedIn", "portfolio", "role", "experience", "skills", "education", "summary"];

function looksLikeCvData(obj: Record<string, unknown>): boolean {
  const matched = EXPECTED_KEYS.filter((k) => k in obj);
  return matched.length >= 4;
}

function parseResponse(result: any): Record<string, string> | null {
  // 1. Try tool call arguments
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      if (looksLikeCvData(parsed)) return parsed;
    } catch { /* fall through */ }
  }

  // 2. Try content as JSON (for providers that don't use tools)
  const content = result.choices?.[0]?.message?.content || "";
  
  // Strip markdown code fences if present
  const cleaned = content.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();
  
  // Find JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (looksLikeCvData(parsed)) return parsed;
    } catch { /* fall through */ }
  }

  console.error("[parse-cv] Could not extract JSON from content:", content.slice(0, 300));
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cvText } = await req.json();
    if (!cvText || cvText.trim().length < 20) {
      return new Response(JSON.stringify({ error: "CV text is too short to parse" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Truncate very long CVs to avoid token limits
    const trimmedCv = cvText.length > 8000 ? cvText.slice(0, 8000) : cvText;

    for (const p of PROVIDERS) {
      const key = p.getKey();
      if (!key) continue;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), p.timeout);

        const body: any = {
          model: p.model,
          messages: [
            { role: "system", content: CV_SYSTEM_PROMPT },
            { role: "user", content: `Parse this CV and return the JSON:\n\n${trimmedCv}` },
          ],
          temperature: 0.1,
        };

        // Only use tool calling for providers that support it well
        if (p.supportsTools) {
          body.tools = [CV_TOOL];
          body.tool_choice = { type: "function", function: { name: "extract_cv_data" } };
        }

        const resp = await fetch(p.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!resp.ok) {
          console.error(`[parse-cv][${p.name}] ${resp.status}`);
          continue;
        }

        const result = await resp.json();
        const parsed = parseResponse(result);
        if (parsed) {
          // Normalize: ensure all expected keys exist
          const normalized: Record<string, string> = {};
          for (const k of EXPECTED_KEYS) {
            normalized[k] = typeof parsed[k] === "string" ? parsed[k] : "";
          }
          normalized._provider = p.name;
          return new Response(JSON.stringify(normalized), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        console.error(`[parse-cv][${p.name}] could not parse response`);
      } catch (e) {
        console.error(`[parse-cv][${p.name}] error:`, e);
      }
    }

    return new Response(JSON.stringify({ error: "All AI providers failed to parse CV" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("parse-cv error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
