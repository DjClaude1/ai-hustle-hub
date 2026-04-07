import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Provider definitions ─────────────────────── */
interface ProviderConfig {
  name: string;
  url: string;
  model: string;
  getKey: () => string | undefined;
  timeout: number;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: "openai",
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    model: "openai/gpt-5-mini",
    getKey: () => Deno.env.get("LOVABLE_API_KEY"),
    timeout: 10000,
  },
  {
    name: "gemini",
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    model: "google/gemini-3-flash-preview",
    getKey: () => Deno.env.get("LOVABLE_API_KEY"),
    timeout: 10000,
  },
  {
    name: "gemini-flash",
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    model: "google/gemini-2.5-flash",
    getKey: () => Deno.env.get("LOVABLE_API_KEY"),
    timeout: 10000,
  },
  {
    name: "together",
    url: "https://api.together.xyz/v1/chat/completions",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    getKey: () => Deno.env.get("TOGETHER_API_KEY"),
    timeout: 10000,
  },
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    getKey: () => Deno.env.get("GROQ_API_KEY"),
    timeout: 10000,
  },
];

/* ── Fetch with timeout ───────────────────────── */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ── Try a single provider ────────────────────── */
async function tryProvider(
  provider: ProviderConfig,
  apiKey: string,
  systemPrompt: string,
  userInput: string,
  stream: boolean,
): Promise<{ response: Response; provider: string } | { error: string; status: number; provider: string }> {
  try {
    const response = await fetchWithTimeout(
      provider.url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput },
          ],
          stream,
        }),
      },
      provider.timeout,
    );

    if (response.ok) {
      return { response, provider: provider.name };
    }

    const text = await response.text();
    console.error(`[${provider.name}] error ${response.status}:`, text.slice(0, 200));
    return { error: text, status: response.status, provider: provider.name };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[${provider.name}] exception:`, msg);
    return { error: msg, status: 0, provider: provider.name };
  }
}

/* ── Usage rollback ───────────────────────────── */
async function rollbackUsageIncrement(userId: string | null) {
  if (!userId) return;
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, serviceKey);
    const today = new Date().toISOString().split("T")[0];
    const { data: profile } = await admin
      .from("profiles")
      .select("generations_today, last_generation_date")
      .eq("id", userId)
      .single();
    if (profile && profile.last_generation_date === today && profile.generations_today > 0) {
      await admin
        .from("profiles")
        .update({ generations_today: profile.generations_today - 1 })
        .eq("id", userId);
    }
  } catch (e) {
    console.error("Rollback error:", e);
  }
}

/* ── Main handler ─────────────────────────────── */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { toolName, toolPrompt, userInput, userApiKey, preferredProvider } = await req.json();

    if (!toolName || !userInput) {
      return new Response(
        JSON.stringify({ error: "toolName and userInput are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Auth check & usage limit
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    let userId: string | null = null;
    if (authHeader && authHeader !== `Bearer ${supabaseKey}`) {
      const userClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    // Check usage
    if (userId) {
      const { data: usageResult, error: usageError } = await adminClient.rpc(
        "check_and_increment_usage",
        { p_user_id: userId },
      );

      if (usageError) {
        console.error("Usage check error:", usageError);
      } else if (usageResult && !usageResult.allowed) {
        return new Response(
          JSON.stringify({
            error: "Daily limit reached. Upgrade to Premium for unlimited generations.",
            code: "LIMIT_REACHED",
            remaining: 0,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const systemPrompt = `You are an expert AI assistant powering "${toolName}" — a premium professional tool inside AI Hustle Studio. Users are paying for this service and expect production-ready, full-length output.

Your task: ${toolPrompt}

CRITICAL GUIDELINES — FOLLOW THESE WITHOUT EXCEPTION:
- Generate COMPLETE, FULL-LENGTH, PRODUCTION-READY content — never outlines, summaries, or abbreviated versions.
- For eBooks: Write the ENTIRE book with full chapters, each chapter containing multiple pages of actual prose/content (minimum 15+ pages total). Include full paragraphs, examples, case studies, actionable steps, and transitions between sections. Each chapter should be 800-2000+ words.
- For courses: Write COMPLETE lesson scripts, full module content, all assignment briefs, and detailed curriculum.
- For blog posts: Write the FULL article with every section fully written out.
- For sales pages / landing pages: Write ALL copy sections fully, word-for-word ready to paste.
- For email sequences: Write EVERY email in full — complete subject lines, full body copy, CTAs.
- For scripts (YouTube, TikTok): Write the COMPLETE word-for-word script.
- For resumes/cover letters: Write the COMPLETE document, fully formatted and ready to use.
- For business plans: Write FULL sections with real analysis, projections, and strategies.
- For any generator: Deliver the ACTUAL finished product, not a framework or template to fill in later.
- Use rich formatting: headings (##), subheadings (###), bullet points, numbered lists, bold, italics.
- Be hyper-specific, actionable, and deeply detailed throughout.
- Include real-world examples, data points, case studies, and actionable exercises where relevant.
- Tailor everything precisely to the user's input — never give generic filler content.
- Do NOT add disclaimers like "I'm an AI" or "this is not professional advice."
- Do NOT say "insert here" or "add your own" or leave ANY placeholders — fill everything in.
- Write as if you are a top-tier industry expert delivering premium, paid content.
- There is NO length limit — write as much as needed to deliver a complete, professional product.`;

    // Build provider list: BYOK first, then system providers
    const providerQueue: { config: ProviderConfig; apiKey: string }[] = [];

    // If user supplied their own API key with a preferred provider
    if (userApiKey && preferredProvider) {
      const byokProvider: ProviderConfig = {
        name: `byok-${preferredProvider}`,
        url: preferredProvider === "together"
          ? "https://api.together.xyz/v1/chat/completions"
          : preferredProvider === "groq"
          ? "https://api.groq.com/openai/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions",
        model: preferredProvider === "together"
          ? "meta-llama/Llama-3.3-70B-Instruct-Turbo"
          : preferredProvider === "groq"
          ? "llama-3.3-70b-versatile"
          : "gpt-4o-mini",
        getKey: () => userApiKey,
        timeout: 10000,
      };
      providerQueue.push({ config: byokProvider, apiKey: userApiKey });
    }

    // Add system providers (skip ones without keys)
    for (const p of PROVIDERS) {
      const key = p.getKey();
      if (key) providerQueue.push({ config: p, apiKey: key });
    }

    if (providerQueue.length === 0) {
      await rollbackUsageIncrement(userId);
      return new Response(
        JSON.stringify({ error: "No AI providers available. Please configure at least one API key." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Try providers in sequence with fallback
    const failures: { provider: string; error: string; status: number }[] = [];
    let allCreditsExhausted = true;

    for (const { config, apiKey } of providerQueue) {
      console.log(`[fallback] trying provider: ${config.name} (${config.model})`);

      const result = await tryProvider(config, apiKey, systemPrompt, userInput, true);

      if ("response" in result) {
        console.log(`[fallback] success with ${config.name}`);

        // Inject provider info header
        const headers = new Headers(corsHeaders);
        headers.set("Content-Type", "text/event-stream");
        headers.set("X-AI-Provider", config.name);

        return new Response(result.response.body, { headers });
      }

      // Track failure
      failures.push({ provider: config.name, error: result.error.slice(0, 200), status: result.status });

      // If it's not a 402, at least one provider had a different issue
      if (result.status !== 402) allCreditsExhausted = false;

      console.log(`[fallback] ${config.name} failed (${result.status}), trying next...`);
    }

    // All providers failed
    await rollbackUsageIncrement(userId);

    console.error("[fallback] all providers failed:", JSON.stringify(failures));

    if (allCreditsExhausted) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted across all providers. Please add funds or configure additional API keys." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "AI generation failed after trying all providers." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
