
-- Add subscription_tier to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free';

-- Create user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: users can read their own roles
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all roles
CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_id text,
  status text NOT NULL DEFAULT 'pending',
  amount numeric NOT NULL,
  tier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update check_and_increment_usage to use subscription_tier
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles;
  v_today date := current_date;
  v_daily_limit int;
  v_is_admin boolean;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Profile not found');
  END IF;

  -- Check admin
  SELECT public.has_role(p_user_id, 'admin') INTO v_is_admin;
  IF v_is_admin THEN
    UPDATE profiles SET generations_today = CASE WHEN last_generation_date = v_today THEN generations_today + 1 ELSE 1 END, last_generation_date = v_today, updated_at = now() WHERE id = p_user_id;
    RETURN jsonb_build_object('allowed', true, 'remaining', -1, 'is_premium', true);
  END IF;

  -- Set limits based on tier
  IF v_profile.subscription_tier = 'business' OR v_profile.is_premium THEN
    v_daily_limit := 999999;
  ELSIF v_profile.subscription_tier = 'pro' THEN
    v_daily_limit := 50;
  ELSE
    v_daily_limit := 5;
  END IF;

  IF v_profile.last_generation_date IS NULL OR v_profile.last_generation_date < v_today THEN
    UPDATE profiles SET generations_today = 1, last_generation_date = v_today, updated_at = now() WHERE id = p_user_id;
    RETURN jsonb_build_object('allowed', true, 'remaining', v_daily_limit - 1, 'is_premium', v_profile.subscription_tier != 'free');
  END IF;

  IF v_profile.generations_today >= v_daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'is_premium', v_profile.subscription_tier != 'free', 'error', 'Daily limit reached');
  END IF;

  UPDATE profiles SET generations_today = generations_today + 1, updated_at = now() WHERE id = p_user_id;
  RETURN jsonb_build_object('allowed', true, 'remaining', v_daily_limit - 1 - v_profile.generations_today, 'is_premium', v_profile.subscription_tier != 'free');
END;
$$;
