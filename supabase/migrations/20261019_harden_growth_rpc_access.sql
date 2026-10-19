revoke all on function public.claim_referral(text) from anon;
revoke all on function public.get_referral_stats() from anon;
revoke all on function public.claim_challenge_day(integer) from anon;
revoke select on table public.referrals from anon;
