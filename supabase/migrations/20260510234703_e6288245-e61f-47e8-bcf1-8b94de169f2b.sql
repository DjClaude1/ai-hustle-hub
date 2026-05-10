
-- Add monthly tracking columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS generations_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_generation_month text;

-- Migrate legacy tier values to the new 3-tier model
UPDATE public.profiles SET subscription_tier = 'pro' WHERE subscription_tier = 'business';
UPDATE public.profiles SET subscription_tier = 'creator' WHERE subscription_tier = 'pro' AND is_premium = true AND id NOT IN (
  SELECT user_id FROM public.payments WHERE tier = 'business' AND status IN ('COMPLETE','complete')
);
-- Above is a best-effort guess; safer fallback: any remaining 'pro' rows that paid $9 stay as 'creator' default
-- (no-op for fresh installs).

-- New tool-aware usage check
CREATE OR REPLACE FUNCTION public.check_and_increment_usage_v2(
  p_user_id uuid,
  p_tool_id text,
  p_required_plan text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile profiles;
  v_today date := current_date;
  v_month text := to_char(current_date, 'YYYY-MM');
  v_is_admin boolean;
  v_tier text;
  v_tier_rank int;
  v_required_rank int;
  v_daily_limit int;
  v_monthly_limit int;
  v_used_today int;
  v_used_month int;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Profile not found');
  END IF;

  SELECT public.has_role(p_user_id, 'admin') INTO v_is_admin;
  v_tier := COALESCE(v_profile.subscription_tier, 'free');

  -- Admin bypass
  IF v_is_admin THEN
    v_tier := 'pro';
  END IF;

  -- Compute ranks: free=0, creator=1, pro=2
  v_tier_rank := CASE v_tier WHEN 'pro' THEN 2 WHEN 'creator' THEN 1 ELSE 0 END;
  v_required_rank := CASE p_required_plan WHEN 'pro' THEN 2 WHEN 'creator' THEN 1 ELSE 0 END;

  -- Plan gating
  IF v_tier_rank < v_required_rank THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'code', 'UPGRADE_REQUIRED',
      'tier', v_tier,
      'required', p_required_plan,
      'error', 'Upgrade required to use this tool'
    );
  END IF;

  -- Determine limits
  IF v_tier = 'pro' THEN
    v_daily_limit := -1; v_monthly_limit := -1;
  ELSIF v_tier = 'creator' THEN
    v_daily_limit := -1; v_monthly_limit := 100;
  ELSE
    v_daily_limit := 5; v_monthly_limit := -1;
  END IF;

  -- Compute current usage windows
  IF v_profile.last_generation_date IS NULL OR v_profile.last_generation_date < v_today THEN
    v_used_today := 0;
  ELSE
    v_used_today := COALESCE(v_profile.generations_today, 0);
  END IF;

  IF v_profile.last_generation_month IS NULL OR v_profile.last_generation_month <> v_month THEN
    v_used_month := 0;
  ELSE
    v_used_month := COALESCE(v_profile.generations_this_month, 0);
  END IF;

  -- Enforce limits
  IF v_daily_limit > 0 AND v_used_today >= v_daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'DAILY_LIMIT', 'tier', v_tier, 'error', 'Daily limit reached');
  END IF;
  IF v_monthly_limit > 0 AND v_used_month >= v_monthly_limit THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'MONTHLY_LIMIT', 'tier', v_tier, 'error', 'Monthly limit reached');
  END IF;

  -- Increment counters
  UPDATE profiles
    SET generations_today = v_used_today + 1,
        last_generation_date = v_today,
        generations_this_month = v_used_month + 1,
        last_generation_month = v_month,
        updated_at = now()
    WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'tier', v_tier,
    'remaining_today', CASE WHEN v_daily_limit > 0 THEN v_daily_limit - (v_used_today + 1) ELSE -1 END,
    'remaining_month', CASE WHEN v_monthly_limit > 0 THEN v_monthly_limit - (v_used_month + 1) ELSE -1 END
  );
END;
$$;
