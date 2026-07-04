import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, voice } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cleanText = text.slice(0, 2000);
    const allowedVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const chosen = allowedVoices.includes(voice) ? voice : "alloy";

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: cleanText,
        voice: chosen,
        response_format: "mp3",
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("TTS failed", resp.status, errText);
      return new Response(JSON.stringify({ error: "TTS failed", status: resp.status, detail: errText.slice(0, 200) }), {
        status: resp.status === 402 ? 402 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = new Uint8Array(await resp.arrayBuffer());
    // Base64 encode for JSON transport
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    const b64 = btoa(binary);

    return new Response(JSON.stringify({ audio_base64: b64, mime: "audio/mpeg" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tts-narrate error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
