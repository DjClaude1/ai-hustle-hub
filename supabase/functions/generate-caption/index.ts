import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, toolName, output, context, style, useCase } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "social-caption") {
      systemPrompt = "You are a social media copywriter. Write punchy, engaging captions.";
      userPrompt = `Write a punchy, engaging social media caption for this AI-generated ${toolName} content.

Content snippet:
${output}

Rules:
- Max 220 characters (Twitter-safe)
- Start with a strong hook or emoji
- Conversational and exciting tone
- End with a question OR a CTA like "Drop a comment 👇" or "Save this 🔖"
- Do NOT include hashtags (those are added separately)
- Return ONLY the caption text, nothing else`;
    } else if (type === "image-prompt") {
      systemPrompt = "You are an expert image prompt engineer for AI image generation.";
      userPrompt = `Write a vivid, detailed image generation prompt for: ${context}.
Style: ${style}.
Use case: ${useCase}.
Rules: max 80 words, highly descriptive, specific colors/lighting/composition, no banned words.
Return ONLY the prompt text.`;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(
      JSON.stringify({ caption }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-caption error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
