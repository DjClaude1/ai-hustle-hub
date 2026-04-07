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
}

const PROVIDERS: ProviderConfig[] = [
  { name: "openai", url: "https://ai.gateway.lovable.dev/v1/chat/completions", model: "openai/gpt-5-mini", getKey: () => Deno.env.get("LOVABLE_API_KEY"), timeout: 10000 },
  { name: "gemini", url: "https://ai.gateway.lovable.dev/v1/chat/completions", model: "google/gemini-3-flash-preview", getKey: () => Deno.env.get("LOVABLE_API_KEY"), timeout: 10000 },
  { name: "together", url: "https://api.together.xyz/v1/chat/completions", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", getKey: () => Deno.env.get("TOGETHER_API_KEY"), timeout: 10000 },
  { name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile", getKey: () => Deno.env.get("GROQ_API_KEY"), timeout: 10000 },
];

const CV_SYSTEM_PROMPT = `You are a CV/resume parser. Extract structured data from the provided CV text. Return ONLY a valid JSON object with these fields (use empty string if not found):
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
- "role": the most recent job title or target role
- "experience": a summary of all work experience as plain text
- "skills": comma-separated list of skills
- "education": education history as plain text
- "summary": professional summary or objective if present
Return ONLY the JSON, no markdown, no explanation.`;

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

function parseResponse(result: any): Record<string, string> | null {
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try { return JSON.parse(toolCall.function.arguments); } catch { /* fall through */ }
  }
  const content = result.choices?.[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cvText } = await req.json();
    if (!cvText || cvText.trim().length < 20) {
      return new Response(JSON.stringify({ error: "CV text is too short to parse" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    for (const p of PROVIDERS) {
      const key = p.getKey();
      if (!key) continue;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), p.timeout);

        const body: any = {
          model: p.model,
          messages: [{ role: "system", content: CV_SYSTEM_PROMPT }, { role: "user", content: cvText }],
        };
        // Tool calling works best with OpenAI-compatible APIs
        if (p.name === "openai" || p.name === "gemini" || p.name === "together") {
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
          return new Response(JSON.stringify({ ...parsed, _provider: p.name }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
