import { Crown, Lock, Sparkles, Check, X, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PLANS, type PlanTier } from "@/lib/plans";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: (tier: "creator" | "pro") => void;
  /** What plan does the locked feature/tool need? */
  requiredPlan?: PlanTier;
  /** Reason shown above the plan cards. */
  reason?: string;
  /** True when this user has never used the premium trial. */
  trialAvailable?: boolean;
  /** True when trial has been used up. */
  trialExhausted?: boolean;
}

const FEATURES: { label: string; free: boolean; creator: boolean; pro: boolean }[] = [
  { label: "Daily generations", free: true, creator: true, pro: true },
  { label: "All Free tools", free: true, creator: true, pro: true },
  { label: "100 generations / month", free: false, creator: true, pro: true },
  { label: "Unlimited generations", free: false, creator: false, pro: true },
  { label: "PDF export", free: false, creator: true, pro: true },
  { label: "DOCX export", free: false, creator: false, pro: true },
  { label: "Unlimited history", free: false, creator: true, pro: true },
  { label: "Favorites", free: false, creator: true, pro: true },
  { label: "Priority queue", free: false, creator: true, pro: true },
  { label: "Advanced AI mode", free: false, creator: false, pro: true },
  { label: "Pro tools (Competitor, Business Plan, AI Startup, Income Strategy, Business-in-a-Box)", free: false, creator: false, pro: true },
];

export const UpgradeModal = ({ open, onClose, onUpgrade, requiredPlan, reason, trialAvailable, trialExhausted }: UpgradeModalProps) => {
  const highlight: "creator" | "pro" = requiredPlan === "pro" ? "pro" : "creator";
  const ctaLabel = (t: "creator" | "pro") =>
    trialAvailable ? "Start 7-day free trial" : t === "pro" ? "Get Pro" : "Get Creator";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            {trialAvailable ? <Gift className="h-5 w-5 text-accent" /> : <Crown className="h-5 w-5 text-accent" />}
            {trialAvailable ? "Start your free premium trial" : "Upgrade your plan"}
          </DialogTitle>
          <DialogDescription>
            {trialExhausted
              ? "Your 3 free premium generations are used. Continue with a paid plan to unlock unlimited access."
              : trialAvailable
                ? "Get 3 free premium AI generations. Authorize with PayPal now — no charge for 7 days. Cancel anytime before billing starts."
                : reason ||
                  (requiredPlan === "pro"
                    ? "This is a Pro-only tool. Upgrade to unlock advanced AI business systems."
                    : "Upgrade to unlock advanced AI tools, PDF exports, and more generations.")}
          </DialogDescription>
        </DialogHeader>

        {trialAvailable && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs text-foreground flex items-start gap-2">
            <Gift className="h-4 w-4 shrink-0 text-accent mt-0.5" />
            <div>
              <div className="font-semibold">3 free premium generations · 7-day trial</div>
              <div className="text-muted-foreground">Payment method collected now, first charge after your trial ends. Cancel any time from PayPal.</div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Creator */}
          <div
            className={`relative rounded-xl border p-5 ${
              highlight === "creator" ? "border-primary shadow-elegant" : "border-border"
            }`}
          >
            {highlight === "creator" && (
              <span className="absolute -top-2 left-4 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                Recommended
              </span>
            )}
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg font-bold text-foreground">{PLANS.creator.name}</h3>
              <span className="text-sm text-muted-foreground">
                <span className="text-2xl font-bold text-foreground">${PLANS.creator.priceUSD}</span>/mo
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              {FEATURES.filter((f) => f.creator && !f.pro || f.creator).slice(0, 7).map((f) => (
                <li key={f.label} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="hero"
              className="mt-4 w-full"
              disabled={requiredPlan === "pro"}
              onClick={() => onUpgrade("creator")}
            >
              {requiredPlan === "pro" ? (
                <><Lock className="h-4 w-4" /> Needs Pro</>
              ) : trialAvailable ? (
                <><Gift className="h-4 w-4" /> {ctaLabel("creator")}</>
              ) : (
                <><Sparkles className="h-4 w-4" /> {ctaLabel("creator")}</>
              )}
            </Button>
          </div>

          {/* Pro */}
          <div
            className={`relative rounded-xl border p-5 bg-gradient-to-br from-accent/5 to-transparent ${
              highlight === "pro" ? "border-accent shadow-elegant" : "border-border"
            }`}
          >
            {highlight === "pro" && (
              <span className="absolute -top-2 left-4 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                Required
              </span>
            )}
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-accent" /> {PLANS.pro.name}
              </h3>
              <span className="text-sm text-muted-foreground">
                <span className="text-2xl font-bold text-foreground">${PLANS.pro.priceUSD}</span>/mo
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              {FEATURES.filter((f) => f.pro).slice(0, 8).map((f) => (
                <li key={f.label} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
            <Button variant="accent" className="mt-4 w-full" onClick={() => onUpgrade("pro")}>
              {trialAvailable ? <><Gift className="h-4 w-4" /> {ctaLabel("pro")}</> : <><Crown className="h-4 w-4" /> {ctaLabel("pro")}</>}
            </Button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mx-auto"
        >
          <X className="h-3 w-3" /> Maybe later
        </button>
      </DialogContent>
    </Dialog>
  );
};
