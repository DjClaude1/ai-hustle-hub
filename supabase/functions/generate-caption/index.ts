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

async function tryProviders(systemPrompt: string, userPrompt: string) {
  for (const p of PROVIDERS) {
    const key = p.getKey();
    if (!key) continue;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), p.timeout);
      const resp = await fetch(p.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: p.model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (resp.ok) {
        const data = await resp.json();
        return { data, provider: p.name };
      }
      console.error(`[caption][${p.name}] ${resp.status}`);
    } catch (e) {
      console.error(`[caption][${p.name}] error:`, e);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, toolName, output, context, style, useCase } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "social-caption") {
      systemPrompt = "You are a social media copywriter. Write punchy, engaging captions.";
      userPrompt = `Write a punchy, engaging social media caption for this AI-generated ${toolName} content.\n\nContent snippet:\n${output}\n\nRules:\n- Max 220 characters (Twitter-safe)\n- Start with a strong hook or emoji\n- Conversational and exciting tone\n- End with a question OR a CTA\n- Do NOT include hashtags\n- Return ONLY the caption text`;
    } else if (type === "image-prompt") {
      systemPrompt = "You are an expert image prompt engineer for AI image generation.";
      userPrompt = `Write a vivid, detailed image generation prompt for: ${context}.\nStyle: ${style}.\nUse case: ${useCase}.\nRules: max 80 words, highly descriptive, specific colors/lighting/composition.\nReturn ONLY the prompt text.`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await tryProviders(systemPrompt, userPrompt);
    if (!result) {
      return new Response(JSON.stringify({ error: "All AI providers failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const caption = result.data.choices?.[0]?.message?.content?.trim() || "";
    return new Response(JSON.stringify({ caption, provider: result.provider }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-caption error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
