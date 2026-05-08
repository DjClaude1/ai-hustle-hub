
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'payfast',
  ADD COLUMN IF NOT EXISTS subscription_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS payments_subscription_id_idx ON public.payments (subscription_id);

CREATE TABLE IF NOT EXISTS public.paypal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL UNIQUE,
  product_id text NOT NULL,
  plan_id text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paypal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read paypal plans"
  ON public.paypal_plans FOR SELECT TO authenticated USING (true);
