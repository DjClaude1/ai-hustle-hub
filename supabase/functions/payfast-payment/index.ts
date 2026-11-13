import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHash } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const PLANS: Record<string, { amount: number; frequency: string; label: string }> = {
  monthly: { amount: 199, frequency: "3", label: "Monthly Premium" },
  annual: { amount: 1990, frequency: "6", label: "Annual Premium" },
};
const encodeValue = (value: string) => encodeURIComponent(value.trim()).replace(/%20/g, "+");
function md5(value: string) { return createHash("md5").update(value).digest("hex"); }
function makeSignature(data: Record<string, string>, passphrase: string) {
  const params = Object.entries(data).filter(([, value]) => value !== "").map(([key, value]) => `${key}=${encodeValue(value)}`).join("&");
  return md5(`${params}&passphrase=${encodeValue(passphrase)}`);
}
function appendParams(url: string, params: Record<string, string>) {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params)) parsed.searchParams.set(key, value);
  return parsed.toString();
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (Deno.env.get("BILLING_ENABLED") !== "true") return json({ error: "Premium checkout is being prepared. Please try again soon." }, 503);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Please sign in before subscribing." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Your sign-in session is invalid. Please sign in again." }, 401);
    const { period, returnUrl, cancelUrl } = await req.json();
    const plan = PLANS[String(period)];
    if (!plan || typeof returnUrl !== "string" || typeof cancelUrl !== "string") return json({ error: "Invalid Premium checkout request." }, 400);
    const allowedOrigins = new Set(["https://ai-hustle-hub-delta.vercel.app", "http://localhost:5173"]);
    const origin = req.headers.get("origin");
    if (origin && !allowedOrigins.has(origin)) return json({ error: "Checkout is only available from the official AI Hustle Hub site." }, 403);
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY");
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE");
    if (!merchantId || !merchantKey || !passphrase) return json({ error: "PayFast is not fully configured. The owner must finish merchant setup first." }, 503);
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin.from("profiles").select("subscription_tier,subscription_status,payfast_subscription_token").eq("id", user.id).maybeSingle();
    if (profile?.subscription_tier === "pro" && profile.subscription_status === "active") return json({ error: "You already have an active Premium subscription." }, 409);
    const paymentId = `ahh_${user.id.replaceAll("-", "").slice(0, 16)}_${Date.now()}`;
    const fullName = String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const originForReturn = "https://ai-hustle-hub-delta.vercel.app";
    const safeReturn = new URL(returnUrl);
    const safeCancel = new URL(cancelUrl);
    if (![originForReturn, "http://localhost:5173"].includes(safeReturn.origin) || safeReturn.origin !== safeCancel.origin) return json({ error: "Invalid return URL." }, 400);
    const successUrl = appendParams(safeReturn.toString(), { payment: "processing", paymentId, tier: "pro", period: String(period) });
    const cancelledUrl = appendParams(safeCancel.toString(), { payment: "cancelled", paymentId, tier: "pro", period: String(period) });
    const amount = plan.amount.toFixed(2);
    const data: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: successUrl,
      cancel_url: cancelledUrl,
      notify_url: `${supabaseUrl}/functions/v1/payfast-notify`,
      name_first: parts[0] || "AI Hustle",
      name_last: parts.slice(1).join(" "),
      email_address: user.email || "",
      m_payment_id: paymentId,
      amount,
      item_name: plan.label,
      item_description: `AI Hustle Hub Premium ${period} subscription`,
      subscription_type: "1",
      recurring_amount: amount,
      frequency: plan.frequency,
      cycles: "0",
      subscription_notify_email: "true",
      subscription_notify_webhook: "true",
      subscription_notify_buyer: "true",
      custom_str1: user.id,
      custom_str2: String(period),
      custom_str3: "pro",
    };
    data.signature = await makeSignature(data, passphrase);
    const { error: insertError } = await admin.from("payments").insert({
      user_id: user.id, payment_id: paymentId, status: "pending", amount: plan.amount, tier: "pro", provider: "payfast",
      metadata: { billingPeriod: period, currency: "ZAR", recurring: true },
    });
    if (insertError) throw new Error("Could not create the payment record. Please try again.");
    const sandbox = Deno.env.get("PAYFAST_SANDBOX") === "true";
    return json({ checkoutUrl: sandbox ? "https://sandbox.payfast.co.za/eng/process" : "https://www.payfast.co.za/eng/process", paymentData: data, paymentId });
  } catch (error) {
    console.error("payfast-payment error", error);
    return json({ error: error instanceof Error ? error.message : "Unable to start checkout." }, 500);
  }
});
