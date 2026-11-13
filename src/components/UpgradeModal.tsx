import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { PlanTier } from "@/lib/plans";
interface UpgradeModalProps { open: boolean; onClose: () => void; requiredPlan?: PlanTier; reason?: string; trialAvailable?: boolean; trialExhausted?: boolean; }
export const UpgradeModal = ({ open, onClose, reason }: UpgradeModalProps) => (
  <Dialog open={open} onOpenChange={v => !v && onClose()}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 font-display"><Lock className="h-5 w-5 text-accent" />Unlock with Premium</DialogTitle>
        <DialogDescription>{reason || "This advanced workflow is included with AI Hustle Hub Premium. Your standard tools remain free."}</DialogDescription>
      </DialogHeader>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles className="h-4 w-4 text-primary" />Premium from R199/month</div>
        <p className="mt-1 text-xs text-muted-foreground">Up to 600 AI generations per month, plus advanced automation and long-form production tools.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1"><Link to="/subscription" onClick={onClose}>View Premium</Link></Button>
        <Button variant="outline" onClick={onClose}>Continue with free tools</Button>
      </div>
    </DialogContent>
  </Dialog>
);
