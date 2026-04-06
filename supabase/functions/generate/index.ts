import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const { toolName, toolPrompt, userInput } = await req.json();

    if (!toolName || !userInput) {
      return new Response(
        JSON.stringify({ error: "toolName and userInput are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth check & usage limit
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Try to get user from JWT
    let userId: string | null = null;
    if (authHeader && authHeader !== `Bearer ${supabaseKey}`) {
      const userClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    // Check usage if user is authenticated
    if (userId) {
      const { data: usageResult, error: usageError } = await adminClient.rpc(
        "check_and_increment_usage",
        { p_user_id: userId }
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
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert AI assistant powering "${toolName}" — a premium professional tool inside AI Hustle Studio. Users are paying for this service and expect production-ready, full-length output.

Your task: ${toolPrompt}

CRITICAL GUIDELINES — FOLLOW THESE WITHOUT EXCEPTION:
- Generate COMPLETE, FULL-LENGTH, PRODUCTION-READY content — never outlines, summaries, or abbreviated versions.
- For eBooks: Write the ENTIRE book with full chapters, each chapter containing multiple pages of actual prose/content (minimum 15+ pages total, as many as the user requests). Include full paragraphs, examples, case studies, actionable steps, and transitions between sections. Each chapter should be 800-2000+ words.
- For courses: Write COMPLETE lesson scripts, full module content, all assignment briefs, and detailed curriculum — not just titles and descriptions.
- For blog posts: Write the FULL article with every section fully written out, not placeholders.
- For sales pages / landing pages: Write ALL copy sections fully, word-for-word ready to paste.
- For email sequences: Write EVERY email in full — complete subject lines, full body copy, CTAs.
- For scripts (YouTube, TikTok): Write the COMPLETE word-for-word script, not bullet points.
- For resumes/cover letters: Write the COMPLETE document, fully formatted and ready to use.
- For business plans: Write FULL sections with real analysis, projections, and strategies — not templates.
- For any generator: Deliver the ACTUAL finished product, not a framework or template to fill in later.
- Use rich formatting: headings (##), subheadings (###), bullet points, numbered lists, bold, italics.
- Be hyper-specific, actionable, and deeply detailed throughout.
- Include real-world examples, data points, case studies, and actionable exercises where relevant.
- Tailor everything precisely to the user's input — never give generic filler content.
- Do NOT add disclaimers like "I'm an AI" or "this is not professional advice."
- Do NOT say "insert here" or "add your own" or leave ANY placeholders — fill everything in.
- Write as if you are a top-tier industry expert delivering premium, paid content.
- There is NO length limit — write as much as needed to deliver a complete, professional product.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput },
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      await rollbackUsageIncrement(userId);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
