import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { crypto as stdCrypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIERS: Record<string, { name: string; amount: number }> = {
  pro: { name: "Pro Plan", amount: 14900 },
  business: { name: "Business Plan", amount: 49900 },
};

const encodePayfastValue = (value: string) =>
  encodeURIComponent(value.trim()).replace(/%20/g, "+");

const appendQueryParams = (url: string, params: Record<string, string>) => {
  const parsedUrl = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    parsedUrl.searchParams.set(key, value);
  });
  return parsedUrl.toString();
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

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE")?.trim();
    const sandboxMode = Deno.env.get("PAYFAST_SANDBOX") === "true";

    if (!merchantId || !merchantKey) {
      throw new Error("PayFast credentials not configured");
    }

    const tierInfo = TIERS[tier];
    const amountInRands = (tierInfo.amount / 100).toFixed(2);
    const paymentId = `${user.id}_${tier}_${Date.now()}`;

    const notifyUrl = `${supabaseUrl}/functions/v1/payfast-notify`;
    const fallbackDashboardUrl = `${req.headers.get("origin") || "https://example.com"}/dashboard`;
    const successUrl = appendQueryParams(returnUrl || fallbackDashboardUrl, {
      payment: "processing",
      paymentId,
      tier,
    });
    const cancelledUrl = appendQueryParams(cancelUrl || fallbackDashboardUrl, {
      payment: "cancelled",
      paymentId,
      tier,
    });

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { error: paymentInsertError } = await adminClient.from("payments").insert({
      user_id: user.id,
      payment_id: paymentId,
      status: "pending",
      amount: Number(amountInRands),
      tier,
    });

    if (paymentInsertError) {
      console.error("Failed to create pending payment:", paymentInsertError);
      throw new Error("Failed to initialize payment");
    }

    const fullName = user.user_metadata?.full_name?.trim() || "User";
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.slice(1).join(" ");

    // Build PayFast data - order matters for signature
    const pfData: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: successUrl,
      cancel_url: cancelledUrl,
      notify_url: notifyUrl,
      name_first: firstName,
      name_last: lastName,
      email_address: user.email || "",
      m_payment_id: paymentId,
      amount: amountInRands,
      item_name: `AI Hustle Studio - ${tierInfo.name}`,
      item_description: `Monthly subscription to ${tierInfo.name}`,
      custom_str1: user.id,
      custom_str2: tier,
    };

    // Generate MD5 signature using Deno std hash
    const paramString = Object.entries(pfData)
      .filter(([_, v]) => v !== "")
      .map(([k, v]) => `${k}=${encodePayfastValue(v)}`)
      .join("&");
    const signaturePayload = passphrase ? `${paramString}&passphrase=${encodePayfastValue(passphrase)}` : paramString;

    const encoder = new TextEncoder();
    const data = encoder.encode(signaturePayload);
    const hashBuffer = await stdCrypto.subtle.digest("MD5", data);
    const signature = new TextDecoder().decode(hexEncode(new Uint8Array(hashBuffer)));

    pfData.signature = signature;

    const pfUrl = sandboxMode
      ? "https://sandbox.payfast.co.za/eng/process"
      : "https://www.payfast.co.za/eng/process";

    console.log("PayFast payment URL generated for user:", user.id, "tier:", tier);

    return new Response(
      JSON.stringify({
        checkoutUrl: pfUrl,
        paymentData: pfData,
        paymentId,
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
