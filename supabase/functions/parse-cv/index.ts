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
    const { cvText } = await req.json();

    if (!cvText || cvText.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "CV text is too short to parse" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a CV/resume parser. Extract structured data from the provided CV text. Return ONLY a valid JSON object with these fields (use empty string if not found):
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
- "experience": a summary of all work experience (company, role, dates, achievements) as plain text
- "skills": comma-separated list of skills
- "education": education history as plain text
- "summary": professional summary or objective if present
Return ONLY the JSON, no markdown, no explanation.`,
            },
            { role: "user", content: cvText },
          ],
          tools: [
            {
              type: "function",
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
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_cv_data" } },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Failed to parse CV" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse from content
    const content = result.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return new Response(jsonMatch[0], {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Could not extract CV data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-cv error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
