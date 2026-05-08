import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_BASE = "https://api-m.paypal.com";

async function getAccessToken() {
  const id = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  return (await res.json()).access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { subscriptionId } = await req.json();
    if (!subscriptionId) return new Response(JSON.stringify({ error: "Missing subscriptionId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = await getAccessToken();
    const r = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const sub = await r.json();
    if (!r.ok) throw new Error(`Lookup failed: ${JSON.stringify(sub)}`);

    const [customUserId, tier] = String(sub.custom_id || "").split("|");
    if (customUserId !== user.id) {
      return new Response(JSON.stringify({ error: "Subscription does not belong to user" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const active = sub.status === "ACTIVE" || sub.status === "APPROVED";

    await supabase.from("payments").update({
      status: active ? "COMPLETE" : sub.status, updated_at: new Date().toISOString(),
    }).eq("subscription_id", subscriptionId);

    if (active && (tier === "pro" || tier === "business")) {
      await supabase.from("profiles").update({
        subscription_tier: tier, is_premium: true, updated_at: new Date().toISOString(),
      }).eq("id", user.id);
    }

    return new Response(JSON.stringify({ status: sub.status, tier, active }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
