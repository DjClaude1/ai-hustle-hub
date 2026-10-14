import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_BASE = "https://api-m.paypal.com";

async function getPayPalAccessToken() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("PayPal credentials are not configured");
  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Unable to authenticate with PayPal");
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // PayPal webhooks are public endpoints, so validate the cryptographic signature
    // with PayPal before trusting event data or touching subscription records.
    const rawBody = await req.text();
    const event = JSON.parse(rawBody);
    const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
    if (!webhookId) {
      return new Response("PayPal webhook is not configured", { status: 503, headers: corsHeaders });
    }
    const authAlgo = req.headers.get("paypal-auth-algo");
    const certUrl = req.headers.get("paypal-cert-url");
    const transmissionId = req.headers.get("paypal-transmission-id");
    const transmissionSig = req.headers.get("paypal-transmission-sig");
    const transmissionTime = req.headers.get("paypal-transmission-time");
    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
      return new Response("Missing PayPal signature headers", { status: 400, headers: corsHeaders });
    }
    const accessToken = await getPayPalAccessToken();
    const verificationResponse = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: event,
      }),
    });
    const verification = await verificationResponse.json();
    if (!verificationResponse.ok || verification.verification_status !== "SUCCESS") {
      console.warn("Rejected PayPal webhook: signature verification failed");
      return new Response("Invalid PayPal webhook signature", { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const type = event.event_type as string;
    const resource = event.resource ?? {};

    // For subscription-scoped events, subscription id is resource.id.
    // For PAYMENT.SALE.COMPLETED, subscription id lives in billing_agreement_id.
    const subscriptionId: string | undefined =
      resource.billing_agreement_id || resource.id;
    const customId: string = resource.custom_id || "";
    const [userId, tier] = customId.split("|");

    if (!subscriptionId) {
      return new Response("ignored: no subscription id", { headers: corsHeaders });
    }

    // Fallback: look up user via stored paypal_subscription_id if custom_id absent
    let resolvedUserId = userId;
    let resolvedTier = tier;
    if (!resolvedUserId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, trial_plan")
        .eq("paypal_subscription_id", subscriptionId)
        .maybeSingle();
      if (profile) {
        resolvedUserId = profile.id;
        resolvedTier = resolvedTier || profile.trial_plan;
      }
    }
    if (!resolvedUserId) return new Response("ignored: no user", { headers: corsHeaders });

    // Trial began (subscription approved & moved to ACTIVE with $0 trial cycle).
    if (type === "BILLING.SUBSCRIPTION.ACTIVATED" && (resolvedTier === "creator" || resolvedTier === "pro")) {
      await supabase.from("profiles").update({
        trial_active: true,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        trial_plan: resolvedTier,
        paypal_subscription_id: subscriptionId,
        subscription_status: "trial",
        updated_at: new Date().toISOString(),
      }).eq("id", resolvedUserId);
      await supabase.from("payments").update({ status: "TRIAL", updated_at: new Date().toISOString() }).eq("subscription_id", subscriptionId);
    }

    // Real charge succeeded → activate paid tier.
    if (type === "PAYMENT.SALE.COMPLETED" && (resolvedTier === "creator" || resolvedTier === "pro")) {
      await supabase.from("profiles").update({
        subscription_tier: resolvedTier,
        is_premium: true,
        trial_active: false,
        subscription_status: "active",
        paypal_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      }).eq("id", resolvedUserId);
      await supabase.from("payments").update({ status: "COMPLETE", updated_at: new Date().toISOString() }).eq("subscription_id", subscriptionId);
    }

    // Cancellation / expiry / payment failure → downgrade to free.
    const cancel = [
      "BILLING.SUBSCRIPTION.CANCELLED",
      "BILLING.SUBSCRIPTION.EXPIRED",
      "BILLING.SUBSCRIPTION.SUSPENDED",
      "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
    ].includes(type);
    if (cancel) {
      await supabase.from("profiles").update({
        subscription_tier: "free",
        is_premium: false,
        trial_active: false,
        subscription_status: type === "BILLING.SUBSCRIPTION.CANCELLED" ? "cancelled" : "expired",
        updated_at: new Date().toISOString(),
      }).eq("id", resolvedUserId);
      await supabase.from("payments").update({ status: "CANCELLED", updated_at: new Date().toISOString() }).eq("subscription_id", subscriptionId);
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
