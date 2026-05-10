import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, type PlanTier, canAccessTool, getRequiredPlan, tierMeets } from "@/lib/plans";

interface SubscriptionData {
  tier: PlanTier;
  isAdmin: boolean;
  loading: boolean;
  /** Convenience flags */
  isFree: boolean;
  isCreator: boolean;
  isPro: boolean;
  isPaid: boolean;
  /** Limits sourced from PLANS */
  dailyLimit: number;
  monthlyLimit: number;
  historyDays: number;
  /** Feature flags */
  canExportPdf: boolean;
  canExportDocx: boolean;
  canFavorite: boolean;
  /** Helpers */
  canAccessTool: (toolId: string) => boolean;
  getRequiredPlan: (toolId: string) => PlanTier;
  meetsTier: (required: PlanTier) => boolean;
}

export type SubscriptionTier = PlanTier;

const normalizeTier = (raw: string | null | undefined): PlanTier => {
  // Map any legacy values defensively.
  if (raw === "business") return "pro";
  if (raw === "creator" || raw === "pro" || raw === "free") return raw;
  return "free";
};

export const useSubscription = (): SubscriptionData => {
  const { user } = useAuth();
  const [tier, setTier] = useState<PlanTier>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTier("free");
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const load = async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("subscription_tier").eq("id", user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const admin = roles?.some((r: any) => r.role === "admin") || false;
      setIsAdmin(admin);
      setTier(admin ? "pro" : normalizeTier(profile?.subscription_tier));
      setLoading(false);
    };

    load();
  }, [user]);

  const plan = PLANS[tier];

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
    canAccessTool: (toolId) => canAccessTool(tier, toolId),
    getRequiredPlan,
    meetsTier: (required) => tierMeets(tier, required),
  };
};
