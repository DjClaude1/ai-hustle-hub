import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, format, tone } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: "topic required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth + Pro gate
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    let userId: string | null = null;
    if (authHeader && authHeader !== `Bearer ${anonKey}`) {
      const uc = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await uc.auth.getUser();
      userId = user?.id ?? null;
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "Sign in required", code: "AUTH_REQUIRED" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: usage, error: uerr } = await admin.rpc("check_and_increment_usage_v2", {
      p_user_id: userId, p_tool_id: "faceless-video-studio", p_required_plan: "pro",
    });
    if (uerr) {
      return new Response(JSON.stringify({ error: "Usage check failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (usage && !usage.allowed) {
      return new Response(JSON.stringify({
        error: usage.error || "Upgrade required",
        code: usage.code || "UPGRADE_REQUIRED",
        tier: usage.tier, required: usage.required,
        trial_available: usage.trial_available,
      }), { status: usage.code === "UPGRADE_REQUIRED" ? 403 : 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isShort = format === "short";
    const targetDuration = isShort ? "45 seconds" : "5 minutes";
    const sceneCount = isShort ? "6-8" : "18-24";
    const sceneLen = isShort ? "5-8" : "12-18";

    const systemPrompt = `You write faceless viral video scripts split into short scenes. Return STRICT JSON only — no markdown, no commentary.

Schema:
{
  "title": string,
  "hook": string,          // one-line thumbnail/title hook
  "format": "short" | "long",
  "total_seconds": number,
  "scenes": [
    {
      "narration": string,     // 1-3 short sentences to speak out loud
      "visual_query": string,  // 2-5 word Pexels stock-footage search query
      "duration_sec": number,  // ${sceneLen} seconds per scene
      "caption": string        // short on-screen caption (max 60 chars)
    }
  ]
}

Rules:
- Target total duration ~ ${targetDuration}.
- Produce ${sceneCount} scenes. Each scene ${sceneLen} seconds.
- Narration must be spoken word only (no "scene 1:", no camera notes).
- visual_query must be concrete filmable nouns (e.g. "money falling desk", "person typing laptop", "sunrise city skyline"). NEVER abstract concepts.
- Total narration should fit the target duration at natural speaking pace (~150 wpm).
- Output pure JSON — no code fences.`;

    const userPrompt = `Topic: ${topic}
Format: ${isShort ? "TikTok/Shorts vertical" : "YouTube long-form horizontal"}
Tone: ${tone || "engaging, informative"}
Write the full script now as JSON.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI error", aiResp.status, text);
      return new Response(JSON.stringify({ error: "Script generation failed", detail: text.slice(0, 200) }), {
        status: aiResp.status === 402 ? 402 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch {
      // try to extract JSON block
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      return new Response(JSON.stringify({ error: "AI returned no scenes" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clamp durations
    parsed.scenes = parsed.scenes.map((s: any) => ({
      narration: String(s.narration || "").slice(0, 800),
      visual_query: String(s.visual_query || "b-roll").slice(0, 80),
      duration_sec: Math.min(20, Math.max(3, Number(s.duration_sec) || (isShort ? 6 : 15))),
      caption: String(s.caption || "").slice(0, 90),
    }));
    parsed.total_seconds = parsed.scenes.reduce((a: number, s: any) => a + s.duration_sec, 0);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("faceless-script error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
