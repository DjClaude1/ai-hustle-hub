# AI Hustle Hub Premium — PayFast launch checklist

## Current state

Premium pricing and recurring checkout are deployed, but PayFast checkout is deliberately disabled until the merchant account is approved and a sandbox subscription has been tested. Do not enable live billing before completing the checks below.

## Prices and entitlements

- Premium monthly: **R199**
- Premium annual: **R1,990**
- Free: 20 AI generations per day
- Premium: up to 600 AI generations per month and the advanced automation / production tools listed on the subscription page.

## 1. Finish PayFast merchant onboarding

1. Sign in to the PayFast merchant dashboard.
2. Confirm the merchant account is approved and permitted to receive payments.
3. Enable recurring card payments / subscriptions for the merchant account.
4. If the dashboard still says the account cannot receive payments, contact PayFast merchant support and resolve that restriction before proceeding.
5. Create or access the PayFast sandbox merchant and buyer accounts for testing.

## 2. Add secrets in Supabase

Open Supabase project `ixhzyzctdcxyxqzviaph` → **Project Settings → Edge Functions → Secrets**.

Add the following values. Keep all credentials in Supabase Secrets; never put them in GitHub, Vercel frontend variables, source code, or chat.

| Secret | Value |
|---|---|
| `PAYFAST_MERCHANT_ID` | Merchant ID from the selected PayFast account |
| `PAYFAST_MERCHANT_KEY` | Merchant key from the selected PayFast account |
| `PAYFAST_PASSPHRASE` | Exact passphrase configured for ITN / recurring signatures |
| `PAYFAST_SANDBOX` | `true` while testing; `false` for live |
| `PAYFAST_BILLING_ENABLED` | Keep `false` until sandbox tests pass; then set `true` to enable checkout |

The payment function uses a separate `PAYFAST_BILLING_ENABLED` switch so another provider's billing flag cannot accidentally turn PayFast checkout on.

## 3. Test in sandbox

1. Use sandbox merchant credentials and set `PAYFAST_SANDBOX=true`.
2. Keep `PAYFAST_BILLING_ENABLED=false` while confirming the secrets are saved.
3. After you are ready to run a sandbox checkout, set `PAYFAST_BILLING_ENABLED=true`.
4. Sign in to AI Hustle Hub and open `/subscription`.
5. Test one monthly and one annual sandbox subscription using PayFast's sandbox buyer details.
6. Confirm the PayFast ITN reaches:
   `https://ixhzyzctdcxyxqzviaph.supabase.co/functions/v1/payfast-notify`
7. Confirm the account becomes Premium only after a server-validated COMPLETE ITN. Check that the profile stores `subscription_tier=pro`, `subscription_status=active`, the PayFast subscription token, and the billing period.
8. Test cancellation and confirm the validated CANCELLED ITN returns the profile to Free.

The ITN handler checks PayFast's source IP, signature, merchant ID, server-side validation response, account, amount, and subscription token before granting or removing Premium access.

## 4. Switch to live

Only after sandbox purchase and cancellation tests pass:

1. Replace sandbox credentials with the approved live merchant ID, merchant key, and passphrase.
2. Set `PAYFAST_SANDBOX=false`.
3. Confirm the live merchant account is approved for recurring billing.
4. Set `PAYFAST_BILLING_ENABLED=true`.
5. Run one owner-approved live checkout only if you are comfortable with the real R199 / R1,990 charge.

## 5. Customer cancellations

Customers can cancel recurring subscriptions from their PayFast buyer account. PayFast sends the cancellation ITN; the app then removes Premium entitlement after validating the notification.

## Support / operations

- Production app: https://ai-hustle-hub-delta.vercel.app
- Subscription page: https://ai-hustle-hub-delta.vercel.app/subscription
- Supabase project: `ixhzyzctdcxyxqzviaph`
- PayFast ITN endpoint: `https://ixhzyzctdcxyxqzviaph.supabase.co/functions/v1/payfast-notify`

Never ask a customer to send card details to AI Hustle Hub support. PayFast handles card entry and recurring charges.
