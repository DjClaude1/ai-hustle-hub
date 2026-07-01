import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, type PlanTier, canAccessTool, getRequiredPlan, tierMeets } from "@/lib/plans";

interface SubscriptionData {
  tier: PlanTier;
  isAdmin: boolean;
  loading: boolean;
  isFree: boolean;
  isCreator: boolean;
  isPro: boolean;
  isPaid: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  historyDays: number;
  canExportPdf: boolean;
  canExportDocx: boolean;
  canFavorite: boolean;
  /** Premium trial state */
  trialActive: boolean;
  trialUsed: number;
  trialLimit: number;
  trialRemaining: number;
  trialAvailable: boolean;
  trialEndsAt: string | null;
  subscriptionStatus: string;
  /** Reload subscription (call after PayPal return or usage change). */
  refresh: () => Promise<void>;
  /** Helpers */
  canAccessTool: (toolId: string) => boolean;
  getRequiredPlan: (toolId: string) => PlanTier;
  meetsTier: (required: PlanTier) => boolean;
}

export type SubscriptionTier = PlanTier;

const normalizeTier = (raw: string | null | undefined): PlanTier => {
  if (raw === "business") return "pro";
  if (raw === "creator" || raw === "pro" || raw === "free") return raw;
  return "free";
};

export const useSubscription = (): SubscriptionData => {
  const { user } = useAuth();
  const [tier, setTier] = useState<PlanTier>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trialActive, setTrialActive] = useState(false);
  const [trialUsed, setTrialUsed] = useState(0);
  const [trialLimit, setTrialLimit] = useState(3);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("none");

  const load = async () => {
    if (!user) {
      setTier("free");
      setIsAdmin(false);
      setTrialActive(false);
      setTrialUsed(0);
      setTrialEndsAt(null);
      setSubscriptionStatus("none");
      setLoading(false);
      return;
    }
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("subscription_tier, premium_trial_used, premium_trial_limit, trial_active, trial_ends_at, subscription_status")
        .eq("id", user.id)
        .single(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    const admin = roles?.some((r: any) => r.role === "admin") || false;
    setIsAdmin(admin);
    setTier(admin ? "pro" : normalizeTier(profile?.subscription_tier));
    setTrialUsed(profile?.premium_trial_used ?? 0);
    setTrialLimit(profile?.premium_trial_limit ?? 3);
    setTrialEndsAt(profile?.trial_ends_at ?? null);
    setSubscriptionStatus(profile?.subscription_status ?? "none");
    const trialExpired = profile?.trial_ends_at ? new Date(profile.trial_ends_at) < new Date() : false;
    setTrialActive(Boolean(profile?.trial_active) && !trialExpired);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

  const plan = PLANS[tier];
  const trialRemaining = Math.max(0, trialLimit - trialUsed);

  const access = (toolId: string): boolean => {
    if (canAccessTool(tier, toolId)) return true;
    // During trial, allow premium tools until credits run out.
    return trialActive && trialRemaining > 0;
  };

  return {
    tier,
    isAdmin,
    loading,
    isFree: tier === "free" && !isAdmin,
    isCreator: tier === "creator" || isAdmin,
    isPro: tier === "pro" || isAdmin,
    isPaid: tier !== "free" || isAdmin,
    dailyLimit: plan.dailyLimit,
    monthlyLimit: plan.monthlyLimit,
    historyDays: plan.historyDays,
    canExportPdf: plan.features.pdfExport,
    canExportDocx: plan.features.docxExport,
    canFavorite: plan.features.favorites,
    trialActive,
    trialUsed,
    trialLimit,
    trialRemaining,
    trialAvailable: !trialActive && trialUsed === 0 && tier === "free" && !isAdmin,
    trialEndsAt,
    subscriptionStatus,
    refresh: load,
    canAccessTool: access,
    getRequiredPlan,
    meetsTier: (required) => tierMeets(tier, required),
  };
};
