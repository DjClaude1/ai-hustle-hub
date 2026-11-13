import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Returns userId if the caller is Pro/Business, on an active trial, or admin. */
export async function requirePro(req: Request): Promise<{ userId: string } | Response> {
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Sign in required", code: "AUTH_REQUIRED" }, 401);
  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Sign in required", code: "AUTH_REQUIRED" }, 401);
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const [{ data: profile }, { data: isAdmin }] = await Promise.all([
    admin.from("profiles").select("subscription_tier, is_premium, trial_active, trial_ends_at").eq("id", user.id).maybeSingle(),
    admin.rpc("has_role", { _user_id: user.id, _role: "admin" }),
  ]);
  const trialValid = Boolean(profile?.trial_active) && (!profile?.trial_ends_at || new Date(profile.trial_ends_at).getTime() > Date.now());
  const ok = Boolean(isAdmin) || Boolean(profile?.is_premium) ||
    ["pro", "business"].includes(profile?.subscription_tier ?? "") || trialValid;
  if (!ok) return json({ error: "This workflow is included with AI Hustle Hub Premium", code: "UPGRADE_REQUIRED", required: "pro" }, 403);
  return { userId: user.id };
}
