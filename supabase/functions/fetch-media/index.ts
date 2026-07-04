import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "content-length, content-type",
};

// CORS passthrough for Pexels MP4s so ffmpeg.wasm can fetch them from the browser.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const target = url.searchParams.get("url");
  if (!target) {
    return new Response("missing url", { status: 400, headers: corsHeaders });
  }
  // Allowlist Pexels hosts only
  const parsed = new URL(target);
  if (!/(^|\.)pexels\.com$/i.test(parsed.hostname) && !/(^|\.)videos\.pexels\.com$/i.test(parsed.hostname)) {
    return new Response("forbidden host", { status: 403, headers: corsHeaders });
  }

  try {
    const upstream = await fetch(target);
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", upstream.headers.get("content-type") || "video/mp4");
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
    headers.set("Cache-Control", "public, max-age=3600");
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (e) {
    return new Response("fetch failed: " + (e instanceof Error ? e.message : String(e)), {
      status: 502, headers: corsHeaders,
    });
  }
});
