export type BillingPeriod = "monthly" | "annual";
export interface PayPalCheckoutResponse { subscriptionId: string; approveUrl: string; }
type CheckoutParams = { accessToken: string; period: BillingPeriod; returnUrl: string; cancelUrl: string; };

async function requestCheckout(endpoint: string, params: CheckoutParams): Promise<PayPalCheckoutResponse> {
  const response = await fetch(import.meta.env.VITE_SUPABASE_URL + "/functions/v1/" + endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: "Bearer " + params.accessToken,
    },
    body: JSON.stringify({ period: params.period, returnUrl: params.returnUrl, cancelUrl: params.cancelUrl }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Unable to start PayPal checkout.");
  if (!data.subscriptionId || !data.approveUrl) throw new Error("PayPal returned an incomplete subscription session.");
  return data as PayPalCheckoutResponse;
}

/** Sandbox-only checkout. It never uses Live PayPal endpoints or production entitlements. */
export function createPayPalSandboxCheckout(params: CheckoutParams): Promise<PayPalCheckoutResponse> {
  return requestCheckout("paypal-sandbox-create-subscription", params);
}
