import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, orientation, perPage } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const key = Deno.env.get("PEXELS_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "PEXELS_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const or = orientation === "landscape" ? "landscape" : orientation === "portrait" ? "portrait" : "landscape";
    const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${Math.min(15, perPage || 5)}&orientation=${or}`;

    const resp = await fetch(url, { headers: { Authorization: key } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("Pexels error", resp.status, t);
      return new Response(JSON.stringify({ error: "Pexels error", detail: t.slice(0, 200) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();

    // Pick best HD/SD mp4 file per video
    const results = (data.videos || []).map((v: any) => {
      const files = (v.video_files || []).filter((f: any) => f.file_type === "video/mp4");
      // prefer HD ~1280 width
      const sorted = files.sort((a: any, b: any) => Math.abs((a.width || 0) - 1280) - Math.abs((b.width || 0) - 1280));
      const best = sorted[0];
      if (!best) return null;
      const preview = (v.video_pictures || [])[0]?.picture;
      return {
        id: v.id,
        url: best.link,
        width: best.width,
        height: best.height,
        duration: v.duration,
        preview,
      };
    }).filter(Boolean);

    return new Response(JSON.stringify({ query, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pexels-search error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
