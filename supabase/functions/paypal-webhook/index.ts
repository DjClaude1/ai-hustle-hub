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
    const subscriptionId = resource.id;
    const customId: string = resource.custom_id || "";
    const [userId, tier] = customId.split("|");

    if (!userId || !subscriptionId) {
      return new Response("ignored", { headers: corsHeaders });
    }

    const activate = ["BILLING.SUBSCRIPTION.ACTIVATED", "PAYMENT.SALE.COMPLETED", "BILLING.SUBSCRIPTION.UPDATED"].includes(type) && (resource.status === "ACTIVE" || type === "PAYMENT.SALE.COMPLETED");
    const cancel = ["BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.EXPIRED", "BILLING.SUBSCRIPTION.SUSPENDED"].includes(type);

    if (activate && (tier === "creator" || tier === "pro")) {
      await supabase.from("profiles").update({
        subscription_tier: tier, is_premium: true, updated_at: new Date().toISOString(),
      }).eq("id", userId);
      await supabase.from("payments").update({ status: "COMPLETE", updated_at: new Date().toISOString() }).eq("subscription_id", subscriptionId);
    }
    if (cancel) {
      await supabase.from("profiles").update({
        subscription_tier: "free", is_premium: false, updated_at: new Date().toISOString(),
      }).eq("id", userId);
      await supabase.from("payments").update({ status: "CANCELLED", updated_at: new Date().toISOString() }).eq("subscription_id", subscriptionId);
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
