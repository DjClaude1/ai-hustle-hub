import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const event = await req.json();
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
