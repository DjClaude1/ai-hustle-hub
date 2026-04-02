import { useState } from "react";
import { Link } from "react-router-dom";
import { categories, tools, type ToolCategory } from "@/data/tools";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Lock, Crown, Check } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PAYFAST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payfast-payment`;

const Dashboard = () => {
  const [activeCategory, setActiveCategory] = useState<ToolCategory | "All">("All");
  const filtered = activeCategory === "All" ? tools : tools.filter((t) => t.category === activeCategory);
  const { tier, isPro, isAdmin, dailyLimit } = useSubscription();
  const { user, session } = useAuth();

  // Check for payment result
  const params = new URLSearchParams(window.location.search);
  const paymentStatus = params.get("payment");
  if (paymentStatus === "success") {
    toast.success("Payment successful! Your plan is being activated.");
    window.history.replaceState({}, "", "/dashboard");
  } else if (paymentStatus === "cancelled") {
    toast.error("Payment was cancelled.");
    window.history.replaceState({}, "", "/dashboard");
  }

  const handleUpgrade = async (upgradeTier: string) => {
    if (!user || !session) return;
    try {
      const resp = await fetch(PAYFAST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tier: upgradeTier,
          returnUrl: window.location.origin + "/dashboard?payment=success",
          cancelUrl: window.location.origin + "/dashboard?payment=cancelled",
        }),
      });
      const data = await resp.json();
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        toast.error(data.error || "Failed to create payment");
      }
    } catch {
      toast.error("Payment initiation failed.");
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 bg-background">
      <div className="container">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">AI Tools</h1>
            <p className="mt-1.5 text-muted-foreground">Pick a tool and start generating.</p>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isAdmin ? "bg-destructive/10 text-destructive" :
                tier === "business" ? "bg-accent/10 text-accent" :
                tier === "pro" ? "bg-primary/10 text-primary" :
                "bg-secondary text-muted-foreground"
              }`}>
                {isAdmin ? "Admin" : tier === "business" ? "Business" : tier === "pro" ? "Pro" : "Free"}
              </span>
              {tier === "free" && !isAdmin && (
                <Button variant="hero" size="sm" onClick={() => handleUpgrade("pro")} className="gap-1">
                  <Crown className="h-3.5 w-3.5" /> Upgrade
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
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

        {/* Tools Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((tool, i) => {
            const locked = tool.premium && !isPro && !isAdmin;
            return (
              <ScrollReveal key={tool.id} delay={Math.min(i * 40, 300)}>
                <Link
                  to={`/tool/${tool.id}`}
                  className={`group flex flex-col rounded-xl border bg-card p-5 shadow-soft transition-all duration-300 hover:shadow-card hover:-translate-y-0.5 active:scale-[0.98] ${
                    locked ? "border-border/50 opacity-75" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                      locked ? "bg-muted text-muted-foreground" : "bg-primary/8 text-primary group-hover:bg-primary/12"
                    }`}>
                      <tool.icon className="h-5 w-5" />
                    </div>
                    {tool.premium && (
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        locked ? "bg-muted text-muted-foreground" : "bg-accent/10 text-accent"
                      }`}>
                        {locked ? <Lock className="h-3 w-3" /> : <Crown className="h-3 w-3" />} Pro
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 font-display text-sm font-semibold leading-tight text-foreground">{tool.name}</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
