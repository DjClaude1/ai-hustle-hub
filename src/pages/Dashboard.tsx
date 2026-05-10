import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { categories, tools, type ToolCategory } from "@/data/tools";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Lock, Crown, Sparkles, Zap } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UpgradeModal } from "@/components/UpgradeModal";
import { PLANS, getRequiredPlan, type PlanTier } from "@/lib/plans";

const Dashboard = () => {
  const [activeCategory, setActiveCategory] = useState<ToolCategory | "All">("All");
  const filtered = activeCategory === "All" ? tools : tools.filter((t) => t.category === activeCategory);
  const { tier, isAdmin, canAccessTool } = useSubscription();
  const { user, session } = useAuth();
  const handledUpgradeRef = useRef<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalRequired, setModalRequired] = useState<PlanTier>("creator");
  const [modalReason, setModalReason] = useState<string | undefined>();

  const searchParams = new URLSearchParams(window.location.search);
  const requestedUpgrade = searchParams.get("upgrade");
  const paypalSubId = searchParams.get("subscription_id");
  const paypalCancel = searchParams.get("paypal") === "cancelled";

  const clearDashboardQuery = () => {
    window.history.replaceState({}, "", "/dashboard");
  };

  const handleUpgrade = async (upgradeTier: "creator" | "pro") => {
    if (!user || !session) return;
    try {
      const { data, error } = await supabase.functions.invoke("paypal-create-subscription", {
        body: {
          tier: upgradeTier,
          returnUrl: `${window.location.origin}/dashboard`,
          cancelUrl: `${window.location.origin}/dashboard?paypal=cancelled`,
        },
      });
      if (error) throw error;
      if (!data?.approveUrl) throw new Error("No PayPal approval URL returned");
      window.location.href = data.approveUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment initiation failed");
    }
  };

  const openUpgradeFor = (toolId: string) => {
    const required = getRequiredPlan(toolId);
    setModalRequired(required);
    setModalReason(
      required === "pro"
        ? "Upgrade to PRO for unlimited AI generation and advanced business systems."
        : "Upgrade to unlock advanced AI business tools.",
    );
    setModalOpen(true);
  };

  useEffect(() => {
    if (!requestedUpgrade || !user || !session) return;
    if (!["creator", "pro"].includes(requestedUpgrade)) return;
    if (handledUpgradeRef.current === requestedUpgrade) return;
    handledUpgradeRef.current = requestedUpgrade;
    clearDashboardQuery();
    void handleUpgrade(requestedUpgrade as "creator" | "pro");
  }, [requestedUpgrade, session, user]);

  useEffect(() => {
    if (paypalCancel) {
      toast.error("Payment was cancelled.");
      clearDashboardQuery();
      return;
    }
    if (!paypalSubId || !user) return;
    (async () => {
      toast.message("Confirming your PayPal subscription…");
      const { data, error } = await supabase.functions.invoke("paypal-verify-subscription", {
        body: { subscriptionId: paypalSubId },
      });
      if (error) {
        toast.error("Could not verify subscription. It will activate automatically once PayPal confirms.");
      } else if (data?.active) {
        toast.success(`Welcome to ${PLANS[(data.tier as PlanTier) ?? "creator"]?.name ?? "your new plan"}! Your plan is active.`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.message("Subscription pending PayPal approval. It will activate shortly.");
      }
      clearDashboardQuery();
    })();
  }, [paypalSubId, paypalCancel, user]);

  const planName = isAdmin ? "Admin" : PLANS[tier].name;
  const planBadge = isAdmin ? "bg-destructive/10 text-destructive" : PLANS[tier].badgeClass;

  return (
    <div className="min-h-screen pt-20 pb-16 bg-background">
      <div className="container">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">AI Tools</h1>
            <p className="mt-1.5 text-muted-foreground">Pick a tool and start generating.</p>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${planBadge}`}>
                {planName}
              </span>
              {tier === "free" && !isAdmin && (
                <>
                  <Button variant="hero" size="sm" onClick={() => { setModalRequired("creator"); setModalReason(undefined); setModalOpen(true); }} className="gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Creator $19
                  </Button>
                  <Button variant="accent" size="sm" onClick={() => { setModalRequired("pro"); setModalReason(undefined); setModalOpen(true); }} className="gap-1">
                    <Crown className="h-3.5 w-3.5" /> Pro $49
                  </Button>
                </>
              )}
              {tier === "creator" && !isAdmin && (
                <Button variant="accent" size="sm" onClick={() => { setModalRequired("pro"); setModalReason(undefined); setModalOpen(true); }} className="gap-1">
                  <Crown className="h-3.5 w-3.5" /> Upgrade to Pro
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Free upgrade banner */}
        {user && tier === "free" && !isAdmin && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display text-sm font-semibold text-foreground">You're on the Free plan</div>
                <div className="text-xs text-muted-foreground">5 generations/day · 7 free tools · 7-day history. Upgrade for full access.</div>
              </div>
            </div>
            <Button variant="hero" size="sm" onClick={() => { setModalRequired("creator"); setModalReason(undefined); setModalOpen(true); }}>
              View plans
            </Button>
          </div>
        )}

        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("All")}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
              activeCategory === "All"
                ? "bg-primary text-primary-foreground shadow-soft"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            All ({tools.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                activeCategory === cat.name
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((tool, i) => {
            const required = getRequiredPlan(tool.id);
            const accessible = canAccessTool(tool.id);
            const locked = !accessible;
            const badgeText = required === "pro" ? "Pro" : required === "creator" ? "Creator" : null;
            const badgeColor =
              required === "pro" ? "bg-accent/10 text-accent" :
              required === "creator" ? "bg-primary/10 text-primary" : "";

            const card = (
              <div
                className={`group relative flex flex-col rounded-xl border bg-card p-5 shadow-soft transition-all duration-300 hover:shadow-card hover:-translate-y-0.5 active:scale-[0.98] ${
                  locked ? "border-border/50 opacity-75" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                    locked ? "bg-muted text-muted-foreground" : "bg-primary/8 text-primary group-hover:bg-primary/12"
                  }`}>
                    <tool.icon className="h-5 w-5" />
                  </div>
                  {badgeText && (
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      locked ? "bg-muted text-muted-foreground" : badgeColor
                    }`}>
                      {locked ? <Lock className="h-3 w-3" /> : required === "pro" ? <Crown className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />} {badgeText}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-display text-sm font-semibold leading-tight text-foreground">{tool.name}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                {locked && (
                  <span className="mt-3 inline-flex w-fit items-center gap-1 text-xs font-medium text-accent">
                    <Lock className="h-3 w-3" /> Upgrade required
                  </span>
                )}
              </div>
            );

            return (
              <ScrollReveal key={tool.id} delay={Math.min(i * 40, 300)}>
                {locked ? (
                  <button onClick={() => openUpgradeFor(tool.id)} className="text-left w-full">
                    {card}
                  </button>
                ) : (
                  <Link to={`/tool/${tool.id}`} className="block">
                    {card}
                  </Link>
                )}
              </ScrollReveal>
            );
          })}
        </div>
      </div>

      <UpgradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpgrade={(t) => { setModalOpen(false); void handleUpgrade(t); }}
        requiredPlan={modalRequired}
        reason={modalReason}
      />
    </div>
  );
};

export default Dashboard;
