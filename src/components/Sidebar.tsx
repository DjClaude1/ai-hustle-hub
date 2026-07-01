import { NavLink } from "react-router-dom";
import { LayoutDashboard, History, BookOpen, Sparkles, Crown, Star, LogOut, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * Persistent left sidebar for authenticated pages.
 * Hidden on mobile — mobile users still get the top Navbar.
 */
export const Sidebar = () => {
  const { user, signOut } = useAuth();
  const { tier, isAdmin, trialActive, trialRemaining, trialLimit, subscriptionStatus } = useSubscription();

  if (!user) return null;

  const items = [
    { to: "/dashboard", label: "Tools", icon: LayoutDashboard },
    { to: "/history", label: "History", icon: History },
    { to: "/blueprint", label: "Blueprint", icon: BookOpen, highlight: true },
  ];

  const planLabel = isAdmin ? "Admin" : PLANS[tier].name;

  return (
    <aside className="fixed left-0 top-14 bottom-0 z-40 hidden w-56 flex-col border-r border-border bg-card/60 backdrop-blur-xl md:flex">
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                it.highlight && "ring-1 ring-accent/30",
              )
            }
          >
            <it.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{it.label}</span>
            {it.highlight && (
              <Star className="ml-auto h-3 w-3 fill-current text-accent" />
            )}
          </NavLink>
        ))}
      </div>

      {/* Trial / plan footer */}
      <div className="border-t border-border p-3 space-y-2">
        <div className="rounded-lg border border-border bg-background/60 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            {tier === "pro" || isAdmin ? (
              <><Crown className="h-3.5 w-3.5 text-accent" /> {planLabel} plan</>
            ) : tier === "creator" ? (
              <><Sparkles className="h-3.5 w-3.5 text-primary" /> {planLabel} plan</>
            ) : trialActive ? (
              <><Zap className="h-3.5 w-3.5 text-accent" /> Premium trial</>
            ) : (
              <><Zap className="h-3.5 w-3.5 text-primary" /> Free plan</>
            )}
          </div>
          {trialActive && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              <div className="mb-1 flex items-center justify-between">
                <span>Premium trial</span>
                <span className="font-semibold text-accent">{trialRemaining}/{trialLimit} left</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${((trialLimit - trialRemaining) / trialLimit) * 100}%` }}
                />
              </div>
            </div>
          )}
          {!trialActive && tier === "free" && !isAdmin && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Try 3 premium generations free — start trial anytime.
            </p>
          )}
          {subscriptionStatus === "cancelled" && (
            <p className="mt-1 text-[11px] text-destructive">Subscription cancelled</p>
          )}
        </div>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
};
