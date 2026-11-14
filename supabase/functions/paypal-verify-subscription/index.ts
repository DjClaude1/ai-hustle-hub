import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const base = () => Deno.env.get("PAYPAL_ENVIRONMENT") === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
async function getToken() {
  const id = Deno.env.get("PAYPAL_CLIENT_ID"), secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal is not configured.");
  const res = await fetch(base() + "/v1/oauth2/token", { method: "POST", headers: { Authorization: "Basic " + btoa(id + ":" + secret), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error("PayPal authentication failed.");
  return data.access_token as string;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { subscriptionId } = await req.json();
    if (typeof subscriptionId !== "string" || !/^I-[A-Z0-9]+$/i.test(subscriptionId)) return json({ error: "Invalid subscription reference." }, 400);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: payment } = await admin.from("payments").select("id,user_id,tier,amount,metadata").eq("subscription_id", subscriptionId).eq("user_id", user.id).eq("provider", "paypal").maybeSingle();
    if (!payment || payment.tier !== "pro") return json({ error: "This subscription does not belong to your account." }, 403);
    const token = await getToken();
    const res = await fetch(base() + "/v1/billing/subscriptions/" + subscriptionId, { headers: { Authorization: "Bearer " + token } });
    const sub = await res.json();
    if (!res.ok) throw new Error("PayPal could not verify this subscription.");
    const [ownerId, tier, period] = String(sub.custom_id || "").split("|");
    if (ownerId !== user.id || tier !== "pro" || !["monthly", "annual"].includes(period)) return json({ error: "PayPal subscription ownership could not be confirmed." }, 403);
    const expected = period === "annual" ? 117.5 : 11.75;
    const paidAmount = Number(sub.billing_info?.last_payment?.amount?.value ?? 0);
    const paidCurrency = String(sub.billing_info?.last_payment?.amount?.currency_code || "");
    const paymentCompleted = sub.billing_info?.last_payment?.status === "COMPLETED" && paidCurrency === "USD" && Math.abs(paidAmount - expected) < 0.01;
    const active = sub.status === "ACTIVE" && paymentCompleted;
    if (active) {
      await admin.from("profiles").update({ subscription_tier: "pro", is_premium: true, trial_active: false, subscription_status: "active", paypal_subscription_id: subscriptionId, subscription_period: period, updated_at: new Date().toISOString() }).eq("id", user.id);
      await admin.from("payments").update({ status: "complete", updated_at: new Date().toISOString(), metadata: { ...(payment.metadata || {}), billingPeriod: period, currency: "USD", verified: true } }).eq("id", payment.id);
    } else if (["CANCELLED", "EXPIRED", "SUSPENDED"].includes(sub.status)) {
      await admin.from("payments").update({ status: String(sub.status).toLowerCase(), updated_at: new Date().toISOString() }).eq("id", payment.id);
    }
    return json({ status: sub.status, active, period, currency: "USD" });
  } catch (error) {
    console.error("paypal-verify-subscription error", error);
    return json({ error: error instanceof Error ? error.message : "Subscription verification failed." }, 500);
  }
});
