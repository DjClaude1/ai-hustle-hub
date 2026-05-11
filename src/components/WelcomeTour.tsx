import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Wand2, History, Crown, ArrowRight, Check } from "lucide-react";

const SLIDES = [
  {
    icon: Sparkles,
    title: "Welcome to AI Hustle Studio 👋",
    desc: "Your all-in-one AI workspace to launch digital products, write content, and automate your hustle.",
    accent: "from-primary/20 to-primary/0",
  },
  {
    icon: Wand2,
    title: "30+ AI tools, ready to use",
    desc: "Pick a tool from your dashboard, fill in a few inputs, and get production-ready output in seconds.",
    accent: "from-accent/20 to-accent/0",
  },
  {
    icon: History,
    title: "Save, search, and reuse",
    desc: "Every generation auto-saves to your History. Star your favorite tools to pin them on your dashboard.",
    accent: "from-primary/20 to-accent/0",
  },
  {
    icon: Crown,
    title: "Free forever — upgrade any time",
    desc: "Free includes 5 generations/day. Creator ($19) and Pro ($49) unlock unlimited use, exports, and premium tools.",
    accent: "from-accent/20 to-primary/0",
  },
];

const STORAGE_KEY = "ahs_welcome_tour_v1";

export const hasSeenTour = () => typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
export const markTourSeen = () => localStorage.setItem(STORAGE_KEY, "1");

export const WelcomeTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const Icon = slide.icon;
  const isLast = step === SLIDES.length - 1;

  const close = () => {
    markTourSeen();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className={`relative bg-gradient-to-b ${slide.accent} p-8 pb-6`}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <h2 className="text-center font-display text-xl font-bold text-foreground">{slide.title}</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground leading-relaxed">{slide.desc}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-4">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border p-4">
          <Button variant="ghost" size="sm" onClick={close}>
            Skip
          </Button>
          {isLast ? (
            <Button variant="hero" size="sm" onClick={close} className="gap-1.5">
              <Check className="h-4 w-4" /> Get started
            </Button>
          ) : (
            <Button variant="hero" size="sm" onClick={() => setStep(step + 1)} className="gap-1.5">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
