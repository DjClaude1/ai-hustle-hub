const PAYFAST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payfast-payment`;

export interface PayfastCheckoutResponse {
  checkoutUrl: string;
  paymentData: Record<string, string>;
  paymentId: string;
}

interface CreatePayfastCheckoutParams {
  accessToken: string;
  cancelUrl: string;
  returnUrl: string;
  tier: string;
}

export const createPayfastCheckout = async ({
  accessToken,
  cancelUrl,
  returnUrl,
  tier,
}: CreatePayfastCheckoutParams): Promise<PayfastCheckoutResponse> => {
  const response = await fetch(PAYFAST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ tier, returnUrl, cancelUrl }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Failed to create payment");
  }

  if (!data.checkoutUrl || !data.paymentData || !data.paymentId) {
    throw new Error("Payment provider returned an incomplete checkout session");
  }

  return data as PayfastCheckoutResponse;
};

export const submitPayfastCheckout = ({
  checkoutUrl,
  paymentData,
}: PayfastCheckoutResponse) => {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkoutUrl;
  form.style.display = "none";

  Object.entries(paymentData).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
};