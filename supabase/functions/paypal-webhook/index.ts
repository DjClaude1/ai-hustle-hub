import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, paypal-auth-algo, paypal-cert-url, paypal-transmission-id, paypal-transmission-sig, paypal-transmission-time", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (body: string, status = 200) => new Response(body, { status, headers: cors });
const base = () => Deno.env.get("PAYPAL_ENVIRONMENT") === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
async function getToken() {
  const id = Deno.env.get("PAYPAL_CLIENT_ID"), secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials are not configured.");
  const res = await fetch(base() + "/v1/oauth2/token", { method: "POST", headers: { Authorization: "Basic " + btoa(id + ":" + secret), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error("PayPal authentication failed.");
  return data.access_token as string;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply("Method not allowed", 405);
  try {
    const event = JSON.parse(await req.text());
    const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
    if (!webhookId) return reply("PayPal webhook is not configured", 503);
    const verificationPayload = {
      auth_algo: req.headers.get("paypal-auth-algo"),
      cert_url: req.headers.get("paypal-cert-url"),
      transmission_id: req.headers.get("paypal-transmission-id"),
      transmission_sig: req.headers.get("paypal-transmission-sig"),
      transmission_time: req.headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    };
    if (Object.values(verificationPayload).some(value => !value)) return reply("Missing PayPal signature headers", 400);
    const token = await getToken();
    const verifyRes = await fetch(base() + "/v1/notifications/verify-webhook-signature", {
      method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(verificationPayload),
    });
    const verification = await verifyRes.json();
    if (!verifyRes.ok || verification.verification_status !== "SUCCESS") return reply("Invalid PayPal webhook signature", 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const type = String(event.event_type || ""), resource = event.resource || {};
    const subscriptionId = resource.billing_agreement_id || resource.id || resource.supplementary_data?.related_ids?.subscription_id;
    if (!subscriptionId) return reply("Ignored: no subscription reference");
    const { data: payment } = await admin.from("payments").select("id,user_id,tier,amount,metadata").eq("subscription_id", subscriptionId).eq("provider", "paypal").maybeSingle();
    const [customUserId, customTier, customPeriod] = String(resource.custom_id || "").split("|");
    const userId = payment?.user_id || customUserId;
    if (!userId || (payment && payment.tier !== "pro") || (customTier && customTier !== "pro")) return reply("Ignored: subscription is not mapped to Premium");
    const { data: profile } = await admin.from("profiles").select("id,paypal_subscription_id,subscription_tier").eq("id", userId).maybeSingle();
    if (!profile) return reply("Ignored: user profile not found");
    const period = String(payment?.metadata?.billingPeriod || customPeriod || "");
    if (!["monthly", "annual"].includes(period) || !payment) return reply("Ignored: no matching subscription payment");
    const expected = period === "annual" ? 117.5 : 11.75;

    if (type === "PAYMENT.SALE.COMPLETED") {
      const amount = Number(resource.amount?.total || resource.amount?.value || 0);
      const currency = String(resource.amount?.currency || resource.amount?.currency_code || "USD");
      if (currency !== "USD" || (amount && Math.abs(amount - expected) > 0.01)) return reply("Payment amount or currency mismatch", 400);
      await admin.from("profiles").update({ subscription_tier: "pro", is_premium: true, trial_active: false, subscription_status: "active", paypal_subscription_id: subscriptionId, subscription_period: period, updated_at: new Date().toISOString() }).eq("id", userId);
      await admin.from("payments").update({ status: "complete", updated_at: new Date().toISOString(), metadata: { ...(payment.metadata || {}), billingPeriod: period, currency: "USD", lastEventId: event.id } }).eq("id", payment.id);
    } else if (["BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.EXPIRED", "BILLING.SUBSCRIPTION.SUSPENDED", "BILLING.SUBSCRIPTION.PAYMENT.FAILED", "PAYMENT.SALE.REFUNDED", "PAYMENT.SALE.REVERSED"].includes(type)) {
      if (profile.paypal_subscription_id && profile.paypal_subscription_id !== subscriptionId) return reply("Ignored: subscription is no longer current");
      const status = type === "BILLING.SUBSCRIPTION.CANCELLED" ? "cancelled" :
        type === "BILLING.SUBSCRIPTION.PAYMENT.FAILED" || type === "BILLING.SUBSCRIPTION.SUSPENDED" ? "past_due" :
        type === "PAYMENT.SALE.REFUNDED" || type === "PAYMENT.SALE.REVERSED" ? "refunded" : "expired";
      await admin.from("profiles").update({ subscription_tier: "free", is_premium: false, trial_active: false, subscription_status: status, paypal_subscription_id: null, subscription_period: null, updated_at: new Date().toISOString() }).eq("id", userId);
      await admin.from("payments").update({ status, updated_at: new Date().toISOString() }).eq("id", payment.id);
    }
    return reply("ok");
  } catch (error) {
    console.error("paypal-webhook error", error);
    return reply("Webhook processing failed", 500);
  }
});
