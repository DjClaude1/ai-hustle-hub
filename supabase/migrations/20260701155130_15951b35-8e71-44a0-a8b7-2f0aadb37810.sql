
-- Add trial fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_trial_used int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS premium_trial_limit int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS trial_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_plan text,
  ADD COLUMN IF NOT EXISTS paypal_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none';

-- Updated usage checker with trial support
CREATE OR REPLACE FUNCTION public.check_and_increment_usage_v2(p_user_id uuid, p_tool_id text, p_required_plan text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_trial_remaining int;
  v_trial_expired boolean;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Profile not found');
  END IF;

  SELECT public.has_role(p_user_id, 'admin') INTO v_is_admin;
  v_tier := COALESCE(v_profile.subscription_tier, 'free');
  IF v_is_admin THEN v_tier := 'pro'; END IF;

  v_tier_rank := CASE v_tier WHEN 'pro' THEN 2 WHEN 'creator' THEN 1 ELSE 0 END;
  v_required_rank := CASE p_required_plan WHEN 'pro' THEN 2 WHEN 'creator' THEN 1 ELSE 0 END;

  -- Premium tool requested but user's tier doesn't meet it -> check trial
  IF v_tier_rank < v_required_rank THEN
    v_trial_expired := v_profile.trial_ends_at IS NOT NULL AND v_profile.trial_ends_at < now();
    v_trial_remaining := GREATEST(0, COALESCE(v_profile.premium_trial_limit, 3) - COALESCE(v_profile.premium_trial_used, 0));

    IF v_profile.trial_active AND NOT v_trial_expired AND v_trial_remaining > 0 THEN
      -- Consume one trial credit
      UPDATE profiles
         SET premium_trial_used = COALESCE(premium_trial_used, 0) + 1,
             updated_at = now()
       WHERE id = p_user_id;

      RETURN jsonb_build_object(
        'allowed', true,
        'tier', v_tier,
        'trial', true,
        'trial_remaining', v_trial_remaining - 1
      );
    END IF;

    RETURN jsonb_build_object(
      'allowed', false,
      'code', CASE WHEN v_profile.trial_active THEN 'TRIAL_EXHAUSTED' ELSE 'UPGRADE_REQUIRED' END,
      'tier', v_tier,
      'required', p_required_plan,
      'trial_available', NOT v_profile.trial_active AND COALESCE(v_profile.premium_trial_used, 0) = 0,
      'error', CASE WHEN v_profile.trial_active THEN 'Free trial exhausted' ELSE 'Start free trial or upgrade' END
    );
  END IF;

  -- Standard tier-limit path
  IF v_tier = 'pro' THEN
    v_daily_limit := -1; v_monthly_limit := -1;
  ELSIF v_tier = 'creator' THEN
    v_daily_limit := -1; v_monthly_limit := 100;
  ELSE
    v_daily_limit := 5; v_monthly_limit := -1;
  END IF;

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

  IF v_daily_limit > 0 AND v_used_today >= v_daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'DAILY_LIMIT', 'tier', v_tier, 'error', 'Daily limit reached');
  END IF;
  IF v_monthly_limit > 0 AND v_used_month >= v_monthly_limit THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'MONTHLY_LIMIT', 'tier', v_tier, 'error', 'Monthly limit reached');
  END IF;

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
$function$;
