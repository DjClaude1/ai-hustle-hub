import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_BASE = "https://api-m.paypal.com"; // live
const TIERS: Record<string, { name: string; amount: string }> = {
  creator: { name: "AI Hustle Studio Creator", amount: "19.00" },
  pro: { name: "AI Hustle Studio Pro", amount: "49.00" },
};

async function getAccessToken() {
  const id = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(j)}`);
  return j.access_token as string;
}

async function ensurePlan(supabase: any, token: string, tier: "pro" | "business") {
  const { data: cached } = await supabase.from("paypal_plans").select("*").eq("tier", tier).maybeSingle();
  if (cached?.plan_id) return cached.plan_id as string;

  const cfg = TIERS[tier];
  // Create product
  const prodRes = await fetch(`${PAYPAL_BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: cfg.name, type: "SERVICE", category: "SOFTWARE" }),
  });
  const product = await prodRes.json();
  if (!prodRes.ok) throw new Error(`Product create failed: ${JSON.stringify(product)}`);

  // Create plan (monthly recurring USD)
  const planRes = await fetch(`${PAYPAL_BASE}/v1/billing/plans`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      product_id: product.id,
      name: `${cfg.name} Monthly`,
      status: "ACTIVE",
      billing_cycles: [{
        frequency: { interval_unit: "MONTH", interval_count: 1 },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: cfg.amount, currency_code: "USD" } },
      }],
      payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: "CONTINUE", payment_failure_threshold: 2 },
    }),
  });
  const plan = await planRes.json();
  if (!planRes.ok) throw new Error(`Plan create failed: ${JSON.stringify(plan)}`);

  await supabase.from("paypal_plans").insert({
    tier, product_id: product.id, plan_id: plan.id, amount: Number(cfg.amount), currency: "USD",
  });
  return plan.id as string;
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

    const { tier, returnUrl, cancelUrl } = await req.json();
    if (!["creator", "pro"].includes(tier)) {
      return new Response(JSON.stringify({ error: "Invalid tier" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = await getAccessToken();
    const planId = await ensurePlan(supabase, token, tier);

    const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: `${user.id}|${tier}`,
        subscriber: { email_address: user.email },
        application_context: {
          brand_name: "AI Hustle Studio",
          user_action: "SUBSCRIBE_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
    });
    const sub = await subRes.json();
    if (!subRes.ok) throw new Error(`Subscription create failed: ${JSON.stringify(sub)}`);

    const approveLink = sub.links?.find((l: any) => l.rel === "approve")?.href;

    await supabase.from("payments").insert({
      user_id: user.id, tier, amount: Number(TIERS[tier].amount),
      status: "pending", provider: "paypal", subscription_id: sub.id, payment_id: sub.id,
    });

    return new Response(JSON.stringify({ subscriptionId: sub.id, approveUrl: approveLink }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
