import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIERS: Record<string, { name: string; amount: number }> = {
  pro: { name: "Pro Plan", amount: 14900 }, // R149 in cents
  business: { name: "Business Plan", amount: 49900 }, // R499 in cents
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tier, returnUrl, cancelUrl } = await req.json();

    if (!tier || !TIERS[tier]) {
      return new Response(
        JSON.stringify({ error: "Invalid tier. Choose 'pro' or 'business'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!authHeader || authHeader === `Bearer ${supabaseKey}`) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY");

    if (!merchantId || !merchantKey) {
      throw new Error("PayFast credentials not configured");
    }

    const tierInfo = TIERS[tier];
    const amountInRands = (tierInfo.amount / 100).toFixed(2);

    const notifyUrl = `${supabaseUrl}/functions/v1/payfast-notify`;

    // Build PayFast data
    const pfData: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: returnUrl || `${supabaseUrl.replace('.supabase.co', '')}/dashboard?payment=success`,
      cancel_url: cancelUrl || `${supabaseUrl.replace('.supabase.co', '')}/dashboard?payment=cancelled`,
      notify_url: notifyUrl,
      name_first: user.user_metadata?.full_name?.split(" ")[0] || "User",
      email_address: user.email || "",
      m_payment_id: `${user.id}_${tier}_${Date.now()}`,
      amount: amountInRands,
      item_name: `AI Hustle Studio - ${tierInfo.name}`,
      item_description: `Monthly subscription to ${tierInfo.name}`,
      subscription_type: "1",
      recurring_amount: amountInRands,
      frequency: "3", // Monthly
      cycles: "0", // Indefinite
      custom_str1: user.id,
      custom_str2: tier,
    };

    // Generate signature
    const paramString = Object.entries(pfData)
      .filter(([_, v]) => v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, "+")}`)
      .join("&");

    const encoder = new TextEncoder();
    const data = encoder.encode(paramString);
    const hashBuffer = await crypto.subtle.digest("MD5", data);
    const signature = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    pfData.signature = signature;

    // Build PayFast URL
    const pfUrl = "https://www.payfast.co.za/eng/process";
    const queryString = Object.entries(pfData)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    return new Response(
      JSON.stringify({
        paymentUrl: `${pfUrl}?${queryString}`,
        paymentId: pfData.m_payment_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("PayFast payment error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Payment creation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
