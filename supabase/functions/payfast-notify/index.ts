import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const paymentStatus = params.get("payment_status");
    const mPaymentId = params.get("m_payment_id");
    const pfPaymentId = params.get("pf_payment_id");
    const amountGross = params.get("amount_gross");
    const userId = params.get("custom_str1");
    const tier = params.get("custom_str2");

    console.log("PayFast ITN received:", {
      paymentStatus,
      mPaymentId,
      pfPaymentId,
      userId,
      tier,
    });

    if (!userId || !tier) {
      console.error("Missing user_id or tier in ITN");
      return new Response("OK", { status: 200 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const paymentUpdate = {
      status: paymentStatus || "unknown",
      amount: parseFloat(amountGross || "0"),
      tier: tier,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedPayment, error: updateError } = await adminClient
      .from("payments")
      .update(paymentUpdate)
      .eq("user_id", userId)
      .eq("payment_id", mPaymentId)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("Failed to update payment:", updateError);
    }

    if (!updatedPayment) {
      const { error: payInsertError } = await adminClient.from("payments").insert({
        user_id: userId,
        payment_id: mPaymentId,
        status: paymentStatus || "unknown",
        amount: parseFloat(amountGross || "0"),
        tier: tier,
      });

      if (payInsertError) {
        console.error("Failed to record payment:", payInsertError);
      }
    }

    // If payment is complete, upgrade user
    if (paymentStatus === "COMPLETE") {
      const { error } = await adminClient
        .from("profiles")
        .update({
          subscription_tier: tier,
          is_premium: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("Failed to upgrade user:", error);
      } else {
        console.log(`User ${userId} upgraded to ${tier}`);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("PayFast notify error:", e);
    return new Response("OK", { status: 200 });
  }
});
