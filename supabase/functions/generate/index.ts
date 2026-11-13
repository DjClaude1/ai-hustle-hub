import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProviderConfig { name: string; url: string; model: string; getKey: () => string | undefined; timeout: number; }
const PROVIDERS: ProviderConfig[] = [
  { name: "openai-gpt5", url: "https://ai.gateway.lovable.dev/v1/chat/completions", model: "openai/gpt-5", getKey: () => Deno.env.get("LOVABLE_API_KEY"), timeout: 15000 },
  { name: "openai-mini", url: "https://ai.gateway.lovable.dev/v1/chat/completions", model: "openai/gpt-5-mini", getKey: () => Deno.env.get("LOVABLE_API_KEY"), timeout: 12000 },
  { name: "gemini", url: "https://ai.gateway.lovable.dev/v1/chat/completions", model: "google/gemini-3-flash-preview", getKey: () => Deno.env.get("LOVABLE_API_KEY"), timeout: 12000 },
  { name: "gemini-flash", url: "https://ai.gateway.lovable.dev/v1/chat/completions", model: "google/gemini-2.5-flash", getKey: () => Deno.env.get("LOVABLE_API_KEY"), timeout: 10000 },
  { name: "together", url: "https://api.together.xyz/v1/chat/completions", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", getKey: () => Deno.env.get("TOGETHER_API_KEY"), timeout: 10000 },
  { name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile", getKey: () => Deno.env.get("GROQ_API_KEY"), timeout: 10000 },
];

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timer); }
}
async function tryProvider(provider: ProviderConfig, apiKey: string, systemPrompt: string, userInput: string, stream: boolean): Promise<{ response: Response; provider: string } | { error: string; status: number; provider: string }> {
  try {
    const response = await fetchWithTimeout(provider.url, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: provider.model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userInput }], stream }) }, provider.timeout);
    if (response.ok) return { response, provider: provider.name };
    const text = await response.text(); console.error(`[${provider.name}] error ${response.status}:`, text.slice(0, 200)); return { error: text, status: response.status, provider: provider.name };
  } catch (e) { const msg = e instanceof Error ? e.message : String(e); console.error(`[${provider.name}] exception:`, msg); return { error: msg, status: 0, provider: provider.name }; }
}
async function rollbackUsageIncrement(userId: string | null) {
  if (!userId) return;
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; const supabaseUrl = Deno.env.get("SUPABASE_URL")!; const admin = createClient(supabaseUrl, serviceKey); const today = new Date().toISOString().split("T")[0]; const month = today.slice(0, 7);
    const { data: profile } = await admin.from("profiles").select("generations_today, last_generation_date, generations_this_month, last_generation_month").eq("id", userId).single(); if (!profile) return;
    const updates: Record<string, number> = {};
    if (profile.last_generation_date === today && profile.generations_today > 0) updates.generations_today = profile.generations_today - 1;
    if (profile.last_generation_month === month && profile.generations_this_month > 0) updates.generations_this_month = profile.generations_this_month - 1;
    if (Object.keys(updates).length > 0) await admin.from("profiles").update(updates).eq("id", userId);
  } catch (e) { console.error("Rollback error:", e); }
}

const FREE_TOOLS = new Set<string>();
const PRO_TOOLS = new Set(["business-in-a-box", "faceless-video-studio", "ebook-generator", "course-generator", "pdf-guide-creator"]);
function requiredPlanFor(toolId: string): "free" | "creator" | "pro" { if (!toolId) return "free"; if (PRO_TOOLS.has(toolId)) return "pro"; return "free"; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { toolId, toolName, toolPrompt, userInput, userApiKey, preferredProvider } = await req.json();
    if (!toolName || !userInput) return new Response(JSON.stringify({ error: "toolName and userInput are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const authHeader = req.headers.get("Authorization"); const supabaseUrl = Deno.env.get("SUPABASE_URL")!; const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!; const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; const adminClient = createClient(supabaseUrl, serviceKey);
    let userId: string | null = null;
    if (authHeader && authHeader !== `Bearer ${supabaseKey}`) { const userClient = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } }); const { data: { user } } = await userClient.auth.getUser(); userId = user?.id ?? null; }
    if (!userId) return new Response(JSON.stringify({ error: "Sign in required", code: "AUTH_REQUIRED" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const required = requiredPlanFor(toolId || "");
    const { data: usageResult, error: usageError } = await adminClient.rpc("check_and_increment_usage_v2", { p_user_id: userId, p_tool_id: toolId || "", p_required_plan: required });
    if (usageError) return new Response(JSON.stringify({ error: "Usage check failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (usageResult && !usageResult.allowed) { const code = usageResult.code || "UPGRADE_REQUIRED"; const status = code === "UPGRADE_REQUIRED" ? 403 : 429; return new Response(JSON.stringify({ error: usageResult.error || "Upgrade required", code, tier: usageResult.tier, required: usageResult.required }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
    const systemPrompt = `You are an expert AI assistant powering "${toolName}" — a premium professional tool inside AI Hustle Studio. Users expect production-ready, full-length output.\n\nYour task: ${toolPrompt}\n\nCRITICAL GUIDELINES:\n- Generate COMPLETE, FULL-LENGTH, PRODUCTION-READY content — never outlines or abbreviated versions.\n- For eBooks: write the entire book with full chapters, prose, examples, case studies and actionable exercises.\n- For courses: write complete lesson scripts, assignments and curriculum.\n- For blogs, sales pages, landing pages and email sequences: write every section and every email in full.\n- For scripts, resumes and cover letters: write the complete finished document.\n- For business plans: write full sections with concrete analysis, projections and strategies.\n- Use rich formatting with headings, bullets and numbered lists.\n- Be hyper-specific, actionable and tailored to the user's inputs.\n- Do not leave placeholders or generic filler.\n- Write as a top-tier industry expert delivering premium paid content.`;
    const providerQueue: { config: ProviderConfig; apiKey: string }[] = [];
    if (userApiKey && preferredProvider) { const byokProvider: ProviderConfig = { name: `byok-${preferredProvider}`, url: preferredProvider === "together" ? "https://api.together.xyz/v1/chat/completions" : preferredProvider === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions", model: preferredProvider === "together" ? "meta-llama/Llama-3.3-70B-Instruct-Turbo" : preferredProvider === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini", getKey: () => userApiKey, timeout: 10000 }; providerQueue.push({ config: byokProvider, apiKey: userApiKey }); }
    for (const p of PROVIDERS) { const key = p.getKey(); if (key) providerQueue.push({ config: p, apiKey: key }); }
    if (providerQueue.length === 0) { await rollbackUsageIncrement(userId); return new Response(JSON.stringify({ error: "No AI providers available. Please configure at least one API key." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
    const failures: { provider: string; error: string; status: number }[] = []; let allCreditsExhausted = true;
    for (const { config, apiKey } of providerQueue) { const result = await tryProvider(config, apiKey, systemPrompt, userInput, true); if ("response" in result) { const headers = new Headers(corsHeaders); headers.set("Content-Type", "text/event-stream"); headers.set("X-AI-Provider", config.name); return new Response(result.response.body, { headers }); } failures.push({ provider: config.name, error: result.error.slice(0, 200), status: result.status }); if (result.status !== 402) allCreditsExhausted = false; }
    await rollbackUsageIncrement(userId); console.error("[fallback] all providers failed:", JSON.stringify(failures));
    if (allCreditsExhausted) return new Response(JSON.stringify({ error: "AI credits exhausted across all providers. Please add funds or configure additional API keys." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ error: "AI generation failed after trying all providers." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) { console.error("generate error:", e); return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});