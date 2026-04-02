import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = "free" | "pro" | "business";

interface SubscriptionData {
  tier: SubscriptionTier;
  isAdmin: boolean;
  loading: boolean;
  isPro: boolean;
  isBusiness: boolean;
  isPaid: boolean;
  dailyLimit: number;
}

export const useSubscription = (): SubscriptionData => {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>("free");
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
      // Load profile tier
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, is_premium")
        .eq("id", user.id)
        .single();

      if (profile) {
        setTier((profile.subscription_tier as SubscriptionTier) || "free");
      }

      // Check admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      setIsAdmin(roles?.some((r: any) => r.role === "admin") || false);
      setLoading(false);
    };

    load();
  }, [user]);

  const isPro = tier === "pro" || tier === "business" || isAdmin;
  const isBusiness = tier === "business" || isAdmin;
  const isPaid = tier !== "free" || isAdmin;

  return {
    tier,
    isAdmin,
    loading,
    isPro,
    isBusiness,
    isPaid,
    dailyLimit: isBusiness || isAdmin ? 999999 : isPro ? 50 : 5,
  };
};
