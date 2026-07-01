import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { categories, tools, type ToolCategory } from "@/data/tools";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Lock, Crown, Sparkles, Zap, Search, Star, Clock, ArrowRight } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UpgradeModal } from "@/components/UpgradeModal";
import { WelcomeTour, hasSeenTour } from "@/components/WelcomeTour";
import { useFavorites } from "@/hooks/useFavorites";
import { PLANS, getRequiredPlan, type PlanTier } from "@/lib/plans";

const Dashboard = () => {
  const [activeCategory, setActiveCategory] = useState<ToolCategory | "All" | "Favorites">("All");
  const [query, setQuery] = useState("");
  const {
    tier, isAdmin, canAccessTool, refresh,
    trialActive, trialAvailable, trialRemaining, trialLimit, trialEndsAt,
  } = useSubscription();
  const { user, session } = useAuth();
  const { favorites, toggle: toggleFav, isFavorite } = useFavorites();
  const handledUpgradeRef = useRef<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [recents, setRecents] = useState<Array<{ tool_id: string; tool_name: string; created_at: string }>>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalRequired, setModalRequired] = useState<PlanTier>("creator");
  const [modalReason, setModalReason] = useState<string | undefined>();
  const trialExhausted = !trialActive && (trialLimit - trialRemaining) >= trialLimit && !trialAvailable;

  const searchParams = new URLSearchParams(window.location.search);
  const requestedUpgrade = searchParams.get("upgrade");
  const paypalSubId = searchParams.get("subscription_id");
  const paypalCancel = searchParams.get("paypal") === "cancelled";

  const clearDashboardQuery = () => window.history.replaceState({}, "", "/dashboard");

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

  // Show welcome tour on first visit
  useEffect(() => {
    if (user && !hasSeenTour()) {
      const t = setTimeout(() => setTourOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, [user]);

  // Load recent generations
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("generations")
        .select("tool_id, tool_name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4);
      if (data) setRecents(data);
    })();
  }, [user]);

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
      } else if (data?.inTrial) {
        toast.success("Free trial started! You have 3 premium generations.");
        await refresh();
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

  const filtered = useMemo(() => {
    let list = tools;
    if (activeCategory === "Favorites") {
      list = list.filter((t) => favorites.includes(t.id));
    } else if (activeCategory !== "All") {
      list = list.filter((t) => t.category === activeCategory);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [activeCategory, query, favorites]);

  const recentTools = useMemo(() => {
    const seen = new Set<string>();
    return recents
      .filter((r) => {
        if (seen.has(r.tool_id)) return false;
        seen.add(r.tool_id);
        return true;
      })
      .map((r) => ({ ...r, tool: tools.find((t) => t.id === r.tool_id) }))
      .filter((r) => r.tool)
      .slice(0, 4);
  }, [recents]);

  return (
    <div className="min-h-screen pt-20 pb-16 bg-background md:pl-56">
      <div className="container">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">AI Tools</h1>
            <p className="mt-1.5 text-muted-foreground">Pick a tool and start generating.</p>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${planBadge}`}>{planName}</span>
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

        {/* Trial active banner */}
        {user && trialActive && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-gradient-to-r from-accent/10 via-primary/5 to-transparent p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display text-sm font-semibold text-foreground">
                  Premium trial active — {trialRemaining} generation{trialRemaining !== 1 ? "s" : ""} remaining
                </div>
                <div className="text-xs text-muted-foreground">
                  {trialEndsAt ? `Trial ends ${new Date(trialEndsAt).toLocaleDateString()}. ` : ""}
                  After 3 generations or 7 days, your subscription activates automatically.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trial exhausted banner */}
        {user && !trialActive && trialLimit - trialRemaining >= trialLimit && tier === "free" && !isAdmin && !trialAvailable && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-destructive" />
              <div>
                <div className="font-display text-sm font-semibold text-foreground">Free trial used up</div>
                <div className="text-xs text-muted-foreground">Subscribe to keep unlimited premium access.</div>
              </div>
            </div>
            <Button variant="hero" size="sm" onClick={() => { setModalRequired("creator"); setModalReason(undefined); setModalOpen(true); }}>
              Subscribe
            </Button>
          </div>
        )}

        {/* Free upgrade banner */}
        {user && tier === "free" && !isAdmin && !trialActive && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display text-sm font-semibold text-foreground">
                  {trialAvailable ? "Try premium free — 3 generations on us" : "You're on the Free plan"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {trialAvailable
                    ? "Authorize PayPal, no charge for 7 days. Cancel anytime."
                    : "5 generations/day · 7 free tools · 7-day history."}
                </div>
              </div>
            </div>
            <Button variant="hero" size="sm" onClick={() => { setModalRequired("creator"); setModalReason(undefined); setModalOpen(true); }}>
              {trialAvailable ? "Start free trial" : "View plans"}
            </Button>
          </div>
        )}

        {/* Recents */}
        {user && recentTools.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-sm font-semibold text-foreground">Pick up where you left off</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {recentTools.map((r) => (
                <Link
                  key={r.tool_id}
                  to={`/tool/${r.tool_id}`}
                  className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-soft"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                    {r.tool && <r.tool.icon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{r.tool_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
            className="pl-9 max-w-md"
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
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
          {favorites.length > 0 && (
            <button
              onClick={() => setActiveCategory("Favorites")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                activeCategory === "Favorites"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
            >
              <Star className="h-3.5 w-3.5 fill-current" /> Favorites ({favorites.length})
            </button>
          )}
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

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">
              {activeCategory === "Favorites"
                ? "No favorites yet — tap the ⭐ on any tool to pin it here."
                : "No tools match your search."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((tool, i) => {
              const required = getRequiredPlan(tool.id);
              const accessible = canAccessTool(tool.id);
              const locked = !accessible;
              const fav = isFavorite(tool.id);
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
                    <div className="flex items-center gap-1.5">
                      {badgeText && (
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          locked ? "bg-muted text-muted-foreground" : badgeColor
                        }`}>
                          {locked ? <Lock className="h-3 w-3" /> : required === "pro" ? <Crown className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />} {badgeText}
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="mt-3 font-display text-sm font-semibold leading-tight text-foreground">{tool.name}</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">{tool.description}</p>
                  {locked && (
                    <span className="mt-3 inline-flex w-fit items-center gap-1 text-xs font-medium text-accent">
                      <Lock className="h-3 w-3" /> Upgrade required
                    </span>
                  )}
                </div>
              );

              return (
                <ScrollReveal key={tool.id} delay={Math.min(i * 30, 240)}>
                  <div className="relative">
                    {locked ? (
                      <button onClick={() => openUpgradeFor(tool.id)} className="text-left w-full">{card}</button>
                    ) : (
                      <Link to={`/tool/${tool.id}`} className="block">{card}</Link>
                    )}
                    {user && badgeText === null && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFav(tool.id); }}
                        className={`absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                          fav ? "bg-amber-400/15 text-amber-500" : "bg-secondary/80 text-muted-foreground hover:text-amber-500"
                        }`}
                        aria-label={fav ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star className={`h-3.5 w-3.5 ${fav ? "fill-current" : ""}`} />
                      </button>
                    )}
                    {user && badgeText !== null && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFav(tool.id); }}
                        className={`absolute bottom-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                          fav ? "bg-amber-400/15 text-amber-500" : "bg-secondary/80 text-muted-foreground hover:text-amber-500"
                        }`}
                        aria-label={fav ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star className={`h-3.5 w-3.5 ${fav ? "fill-current" : ""}`} />
                      </button>
                    )}
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>

      <UpgradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpgrade={(t) => { setModalOpen(false); void handleUpgrade(t); }}
        requiredPlan={modalRequired}
        reason={modalReason}
      />

      <WelcomeTour open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
};

export default Dashboard;
