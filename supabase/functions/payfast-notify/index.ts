import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHash } from "node:crypto";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const ALLOWED_RANGES = ["197.97.145.144/28", "41.74.179.192/27", "102.216.36.0/28", "102.216.36.128/28"];
const ALLOWED_SINGLE = new Set(["144.126.193.139"]);
function ipToNumber(ip: string) { const parts = ip.split(".").map(Number); if (parts.length !== 4 || parts.some(p => !Number.isInteger(p) || p < 0 || p > 255)) return null; return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0; }
function inCidr(ip: string, cidr: string) { const [base, bitsRaw] = cidr.split("/"); const bits = Number(bitsRaw); const a = ipToNumber(ip), b = ipToNumber(base); if (a === null || b === null) return false; const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0; return (a & mask) === (b & mask); }
function validSourceIp(req: Request) {
  const raw = req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "";
  const ip = raw.trim();
  return ALLOWED_SINGLE.has(ip) || ALLOWED_RANGES.some(range => inCidr(ip, range));
}
function encodeValue(value: string) { return encodeURIComponent(value.trim()).replace(/%20/g, "+"); }
function md5(value: string) { return createHash("md5").update(value).digest("hex"); }
async function validSignature(params: URLSearchParams, passphrase: string) {
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) { if (key === "signature") break; pairs.push(`${key}=${encodeValue(value)}`); }
  const expected = md5(`${pairs.join("&")}&passphrase=${encodeValue(passphrase)}`);
  return expected === (params.get("signature") || "").toLowerCase();
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  try {
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE");
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
    if (!passphrase || !merchantId) return new Response("Payment notification not configured", { status: 503, headers: corsHeaders });
    if (!validSourceIp(req)) return new Response("Rejected source IP", { status: 403, headers: corsHeaders });
    if (!(await validSignature(params, passphrase))) return new Response("Invalid signature", { status: 400, headers: corsHeaders });
    if (params.get("merchant_id") !== merchantId) return new Response("Merchant mismatch", { status: 400, headers: corsHeaders });
    const host = Deno.env.get("PAYFAST_SANDBOX") === "true" ? "sandbox.payfast.co.za" : "www.payfast.co.za";
    const validation = await fetch(`https://${host}/eng/query/validate`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: rawBody });
    const validationText = (await validation.text()).trim();
    if (!validation.ok || validationText !== "VALID") return new Response("PayFast server validation failed", { status: 400, headers: corsHeaders });

    let userId = params.get("custom_str1");
    let period = params.get("custom_str2");
    const tier = params.get("custom_str3") || "pro";
    const paymentId = params.get("m_payment_id");
    const status = params.get("payment_status");
    const token = params.get("token");
    const gross = Number(params.get("amount_gross"));
    if (!paymentId || tier !== "pro" || !["COMPLETE", "CANCELLED", "FAILED"].includes(status || "")) return new Response("Invalid payment details", { status: 400, headers: corsHeaders });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let profile: any = null;
    if (userId) {
      const { data } = await supabase.from("profiles").select("id,subscription_tier,subscription_status,payfast_subscription_token,subscription_period").eq("id", userId).maybeSingle();
      profile = data;
    }
    if (!profile && token) {
      const { data } = await supabase.from("profiles").select("id,subscription_tier,subscription_status,payfast_subscription_token,subscription_period").eq("payfast_subscription_token", token).maybeSingle();
      profile = data;
      userId = data?.id ?? null;
    }
    if (!profile || !userId) return new Response("Unknown account", { status: 404, headers: corsHeaders });
    period = period || profile.subscription_period;
    if (!["monthly", "annual"].includes(period || "")) return new Response("Unknown billing period", { status: 400, headers: corsHeaders });
    const expectedAmount = period === "annual" ? 1990 : 199;
    if (status === "COMPLETE" && (!Number.isFinite(gross) || Math.abs(gross - expectedAmount) > 0.01)) return new Response("Payment amount mismatch", { status: 400, headers: corsHeaders });
    const { data: payment } = await supabase.from("payments").select("id,user_id,amount,tier,metadata,subscription_id").eq("payment_id", paymentId).maybeSingle();
    const isInitialPayment = Boolean(payment && payment.user_id === userId && payment.tier === "pro" && Math.abs(Number(payment.amount) - expectedAmount) <= 0.01);
    const isKnownRecurring = Boolean(token && profile.payfast_subscription_token === token && profile.subscription_period === period);
    if (!isInitialPayment && !isKnownRecurring) return new Response("Payment reference not recognized", { status: 404, headers: corsHeaders });

    if (status === "COMPLETE") {
      if (!token) return new Response("Missing subscription token", { status: 400, headers: corsHeaders });
      await supabase.from("profiles").update({
        subscription_tier: "pro", is_premium: true, trial_active: false, subscription_status: "active",
        payfast_subscription_token: token, subscription_period: period, updated_at: new Date().toISOString(),
      }).eq("id", userId);
      if (payment) await supabase.from("payments").update({ status: "complete", subscription_id: token, provider: "payfast", updated_at: new Date().toISOString(), metadata: { ...(payment.metadata || {}), billingPeriod: period, recurring: true } }).eq("id", payment.id);
      else await supabase.from("payments").insert({ user_id: userId, payment_id: paymentId, status: "complete", amount: expectedAmount, tier: "pro", provider: "payfast", subscription_id: token, metadata: { billingPeriod: period, recurring: true } });
    } else if (status === "CANCELLED") {
      if (token && profile.payfast_subscription_token && token !== profile.payfast_subscription_token) return new Response("Subscription token mismatch", { status: 409, headers: corsHeaders });
      await supabase.from("profiles").update({ subscription_tier: "free", is_premium: false, trial_active: false, subscription_status: "cancelled", payfast_subscription_token: null, subscription_period: null, updated_at: new Date().toISOString() }).eq("id", userId);
      if (payment) await supabase.from("payments").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", payment.id);
    } else {
      if (payment) await supabase.from("payments").update({ status: String(status || "unknown").toLowerCase(), updated_at: new Date().toISOString() }).eq("id", payment.id);
    }
    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("payfast-notify error", error);
    return new Response("Notification processing failed", { status: 500, headers: corsHeaders });
  }
});
