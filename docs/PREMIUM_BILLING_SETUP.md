# AI Hustle Hub Premium — PayPal launch checklist

## Current state

Premium checkout now uses PayPal Subscriptions. Live charging is deliberately disabled until PayPal credentials are configured, the webhook is registered, and sandbox purchase/cancellation tests pass.

## Prices and entitlements

- Premium monthly: **US$11.75** (approximately R199)
- Premium annual: **US$117.50** (approximately R1,990; save US$23.50 / about R398 versus 12 monthly payments)
- Free: 20 AI generations per day
- Premium: up to 600 AI generations per month and the advanced workflows shown on the subscription page.

The app creates and caches separate monthly and annual PayPal plans in the existing `paypal_plans` table. PayPal REST subscription plans are billed in USD because ZAR is absent from PayPal supported REST payment currencies. The USD prices approximate R199 and R1,990 using a recent indicative exchange rate; the ZAR equivalent can change with PayPal or bank conversion rates and fees.

## 1. Create PayPal app credentials

1. Sign in to the PayPal Developer Dashboard.
2. Create or select a REST API app under the PayPal Business account that will receive the subscriptions.
3. Copy the sandbox Client ID and Secret first.
4. Add a webhook to the app pointing to:
   `https://ixhzyzctdcxyxqzviaph.supabase.co/functions/v1/paypal-webhook`
5. Subscribe to these event types:
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.REFUNDED`
   - `PAYMENT.SALE.REVERSED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
6. Copy the webhook ID. Use the sandbox webhook ID with sandbox credentials and the live webhook ID with the live app.

## 2. Add secrets in Supabase

Open Supabase project `ixhzyzctdcxyxqzviaph` → **Project Settings → Edge Functions → Secrets**.

| Secret | Sandbox value / purpose |
|---|---|
| `PAYPAL_CLIENT_ID` | PayPal sandbox REST app Client ID |
| `PAYPAL_CLIENT_SECRET` | Matching sandbox Secret |
| `PAYPAL_WEBHOOK_ID` | Webhook ID created for the sandbox REST app |
| `PAYPAL_ENVIRONMENT` | `sandbox` |
| `PAYPAL_BILLING_ENABLED` | Keep `false` until ready to test; set `true` for sandbox checkout |

Keep credentials in Supabase Secrets only. Never commit them to GitHub, place them in frontend variables, or send them in chat.

## 3. Test in sandbox

1. Save sandbox credentials and set `PAYPAL_ENVIRONMENT=sandbox`.
2. Set `PAYPAL_BILLING_ENABLED=true` only when ready to test.
3. Sign in to AI Hustle Hub and open `/subscription`.
4. Test monthly and annual subscriptions using a PayPal sandbox buyer account.
5. Confirm PayPal sends signed events to the webhook URL and signature verification succeeds.
6. Confirm Premium is granted only after PayPal confirms a completed payment.
7. Test cancellation, suspension, failed payment, refund and reversal handling.

The return page verifies the subscription directly with PayPal. A browser redirect alone never grants Premium.

## 4. Switch to live

Only after sandbox checkout, payment, webhook and cancellation tests pass:

1. Replace sandbox Client ID and Secret with the approved live REST app credentials.
2. Replace `PAYPAL_WEBHOOK_ID` with the live app's webhook ID.
3. Set `PAYPAL_ENVIRONMENT=live`.
4. Confirm the PayPal Business account is approved to receive commercial and recurring payments in South Africa.
5. Set `PAYPAL_BILLING_ENABLED=true`.
6. Complete an owner-approved live checkout only if comfortable with the real US$11.75 / US$117.50 charge.

## Customer cancellations

Customers can manage or cancel recurring subscriptions through their PayPal account. The app removes Premium entitlement after it verifies PayPal's cancellation webhook.

## Operations

- Production app: https://ai-hustle-hub-delta.vercel.app
- Subscription page: https://ai-hustle-hub-delta.vercel.app/subscription
- Supabase project: `ixhzyzctdcxyxqzviaph`
- PayPal webhook: https://ixhzyzctdcxyxqzviaph.supabase.co/functions/v1/paypal-webhook

Never ask a customer to send PayPal passwords, card details, or API credentials to support.
