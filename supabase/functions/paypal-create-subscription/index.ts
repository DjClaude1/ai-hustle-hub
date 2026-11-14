import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const PRICES = {
  monthly: { amount: "199.00", interval_unit: "MONTH", interval_count: 1, label: "Premium Monthly" },
  annual: { amount: "1990.00", interval_unit: "YEAR", interval_count: 1, label: "Premium Annual" },
} as const;
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const paypalBase = () => Deno.env.get("PAYPAL_ENVIRONMENT") === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

async function getAccessToken() {
  const id = Deno.env.get("PAYPAL_CLIENT_ID"), secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials are not configured. Add the PayPal sandbox or live credentials in Supabase Secrets.");
  const res = await fetch(paypalBase() + "/v1/oauth2/token", {
    method: "POST", headers: { Authorization: "Basic " + btoa(id + ":" + secret), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error("PayPal authentication failed. Check the client ID, secret, and environment.");
  return data.access_token as string;
}

async function getPlan(admin: any, token: string, period: "monthly" | "annual") {
  const cfg = PRICES[period], cacheKey = "pro_" + period;
  const { data: cached, error } = await admin.from("paypal_plans").select("*").eq("tier", cacheKey).eq("currency", "ZAR").eq("amount", Number(cfg.amount)).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("Unable to read the PayPal plan cache.");
  if (cached?.plan_id) {
    const check = await fetch(paypalBase() + "/v1/billing/plans/" + cached.plan_id, { headers: { Authorization: "Bearer " + token } });
    const plan = await check.json();
    if (check.ok && plan.status === "ACTIVE") return cached.plan_id as string;
  }
  const productRes = await fetch(paypalBase() + "/v1/catalogs/products", {
    method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "AI Hustle Hub Premium", description: "Premium access to AI Hustle Hub", type: "SERVICE", category: "SOFTWARE" }),
  });
  const product = await productRes.json();
  if (!productRes.ok || !product.id) throw new Error("PayPal could not create the Premium product.");
  const planRes = await fetch(paypalBase() + "/v1/billing/plans", {
    method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      product_id: product.id, name: cfg.label, description: "AI Hustle Hub Premium " + period + " subscription", status: "ACTIVE",
      billing_cycles: [{ frequency: { interval_unit: cfg.interval_unit, interval_count: cfg.interval_count }, tenure_type: "REGULAR", sequence: 1, total_cycles: 0, pricing_scheme: { fixed_price: { value: cfg.amount, currency_code: "ZAR" } } }],
      payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: "CONTINUE", payment_failure_threshold: 2 },
    }),
  });
  const plan = await planRes.json();
  if (!planRes.ok || !plan.id) {
    console.error("PayPal plan creation rejected", JSON.stringify(plan));
    throw new Error(plan.message || plan.details?.[0]?.description || "PayPal could not create the ZAR subscription plan. Confirm ZAR recurring billing support with PayPal.");
  }
  const row = { tier: cacheKey, product_id: product.id, plan_id: plan.id, amount: Number(cfg.amount), currency: "ZAR" };
  const saved = cached?.id ? await admin.from("paypal_plans").update(row).eq("id", cached.id) : await admin.from("paypal_plans").insert(row);
  if (saved.error) throw new Error("PayPal plan was created but could not be cached. Please retry.");
  return plan.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  if (Deno.env.get("PAYPAL_BILLING_ENABLED") !== "true") return reply({ error: "PayPal checkout is being prepared. Please try again soon." }, 503);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return reply({ error: "Please sign in before subscribing." }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return reply({ error: "Your sign-in session is invalid. Please sign in again." }, 401);
    const body = await req.json();
    const period = body.period as "monthly" | "annual";
    if (!Object.prototype.hasOwnProperty.call(PRICES, period) || typeof body.returnUrl !== "string" || typeof body.cancelUrl !== "string") return reply({ error: "Invalid Premium checkout request." }, 400);
    const allowed = new Set(["https://ai-hustle-hub-delta.vercel.app", "http://localhost:5173"]);
    const returnUrl = new URL(body.returnUrl), cancelUrl = new URL(body.cancelUrl);
    if (!allowed.has(returnUrl.origin) || returnUrl.origin !== cancelUrl.origin || returnUrl.pathname !== "/subscription" || cancelUrl.pathname !== "/subscription") return reply({ error: "Invalid return URL." }, 400);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin.from("profiles").select("subscription_tier,subscription_status,trial_active").eq("id", user.id).maybeSingle();
    if (profile?.trial_active || (profile?.subscription_tier === "pro" && profile.subscription_status === "active")) return reply({ error: "You already have an active Premium subscription." }, 409);
    const token = await getAccessToken();
    const planId = await getPlan(admin, token, period);
    const approvedReturn = new URL(returnUrl.toString()), cancelledReturn = new URL(cancelUrl.toString());
    approvedReturn.searchParams.set("payment", "processing");
    cancelledReturn.searchParams.set("payment", "cancelled");
    const subRes = await fetch(paypalBase() + "/v1/billing/subscriptions", {
      method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        plan_id: planId, custom_id: user.id + "|pro|" + period,
        subscriber: user.email ? { email_address: user.email } : undefined,
        application_context: { brand_name: "AI Hustle Hub", locale: "en-ZA", shipping_preference: "NO_SHIPPING", user_action: "SUBSCRIBE_NOW", return_url: approvedReturn.toString(), cancel_url: cancelledReturn.toString() },
      }),
    });
    const subscription = await subRes.json();
    if (!subRes.ok || !subscription.id) {
      console.error("PayPal subscription creation rejected", JSON.stringify(subscription));
      throw new Error(subscription.message || subscription.details?.[0]?.description || "PayPal could not start your subscription.");
    }
    const approveUrl = subscription.links?.find((link: any) => link.rel === "approve")?.href;
    if (!approveUrl) throw new Error("PayPal did not return an approval link.");
    const cfg = PRICES[period];
    const { error: paymentError } = await admin.from("payments").insert({
      user_id: user.id, tier: "pro", amount: Number(cfg.amount), status: "pending", provider: "paypal",
      subscription_id: subscription.id, payment_id: subscription.id,
      metadata: { billingPeriod: period, currency: "ZAR", planId, recurring: true },
    });
    if (paymentError) throw new Error("Could not save the subscription reference. Contact support before retrying.");
    return reply({ subscriptionId: subscription.id, approveUrl });
  } catch (error) {
    console.error("paypal-create-subscription error", error);
    return reply({ error: error instanceof Error ? error.message : "Unable to start PayPal checkout." }, 500);
  }
});
