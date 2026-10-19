import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Copy, Gift, Share2, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const DAYS = [
  ["Find your hustle", "Choose a realistic business idea that matches your skills, budget and market."],
  ["Build your offer", "Define exactly what you sell, who you help and why they should buy."],
  ["Create your brand", "Generate your name, positioning, bio and launch messaging."],
  ["Create content", "Produce a week of social content designed to attract your first customers."],
  ["Find customers", "Build a prospect list and personalized outreach messages."],
  ["Make the pitch", "Create your sales message, proposal and follow-up sequence."],
  ["Launch", "Put everything together and take your first real sales action."],
] as const;

const Growth = () => {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [referrals, setReferrals] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const shareUrl = useMemo(() => `${window.location.origin}/auth?mode=signup&ref=${code}`, [code]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [{ data: stats }, { data: progress }] = await Promise.all([
        supabase.rpc("get_referral_stats"),
        supabase.from("hustle_challenge_progress").select("completed_days,current_day").eq("user_id", user.id).maybeSingle(),
      ]);
      if (stats) { setCode(stats.code ?? ""); setReferrals(Number(stats.referrals ?? 0)); setBonus(Number(stats.bonus ?? 0)); }
      if (progress) { setCompleted(progress.completed_days ?? []); setCurrentDay(progress.current_day ?? 1); }
      setLoading(false);
    };
    void load();
  }, [user]);

  const copy = async (text: string, message = "Copied!") => { await navigator.clipboard.writeText(text); toast.success(message); };
  const completeDay = async (day: number) => {
    const { data, error } = await supabase.rpc("claim_challenge_day", { p_day: day });
    if (error || !data?.ok) { toast.error(data?.error ?? error?.message ?? "Could not update your challenge."); return; }
    setCompleted(data.completed_days ?? []); setCurrentDay(data.current_day ?? day);
    toast.success(day === 7 ? "Challenge complete — now launch it!" : `Day ${day} complete!`);
  };
  const share = async () => {
    const text = "I'm building my side hustle with AI Hustle Hub. Try the free 7-Day AI Hustle Challenge with me:";
    if (navigator.share) await navigator.share({ title: "AI Hustle Hub", text, url: shareUrl });
    else await copy(`${text} ${shareUrl}`, "Share message copied!");
  };
  if (!user) return null;

  return <div className="min-h-screen bg-background pb-16 pt-20 md:pl-56"><div className="container max-w-5xl">
    <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 shadow-card sm:p-8">
      <div className="max-w-3xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" /> Growth Hub</div><h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Turn an idea into income in 7 days.</h1><p className="mt-3 text-muted-foreground">Follow the AI Hustle Challenge, complete one practical step each day, then invite friends and earn extra AI generations.</p></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-border bg-card/80 p-4"><Trophy className="h-5 w-5 text-primary" /><p className="mt-2 text-2xl font-bold">{completed.length}/7</p><p className="text-xs text-muted-foreground">Challenge days</p></div><div className="rounded-xl border border-border bg-card/80 p-4"><Users className="h-5 w-5 text-primary" /><p className="mt-2 text-2xl font-bold">{referrals}</p><p className="text-xs text-muted-foreground">Friends joined</p></div><div className="rounded-xl border border-border bg-card/80 p-4"><Zap className="h-5 w-5 text-accent" /><p className="mt-2 text-2xl font-bold">{bonus}</p><p className="text-xs text-muted-foreground">Bonus generations</p></div></div>
    </section>
    <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-xl font-semibold">7-Day AI Hustle Challenge</h2><p className="text-sm text-muted-foreground">Complete each step in order.</p></div><span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">Day {Math.min(currentDay,7)} of 7</span></div><div className="space-y-3">
        {DAYS.map(([title, description], index) => { const day=index+1; const done=completed.includes(day); const unlocked=day<=currentDay; return <div key={day} className={`rounded-xl border p-4 ${done ? "border-primary/30 bg-primary/5" : "border-border"}`}><div className="flex items-start gap-3"><div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{done?<Check className="h-4 w-4"/>:day}</div><div className="min-w-0 flex-1"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><Button size="sm" variant={done?"secondary":"hero"} disabled={!unlocked||done} onClick={()=>void completeDay(day)}>{done?"Done":"Complete"}</Button></div></div>; })}
      </div></div>
      <div className="space-y-6"><div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Gift className="h-5 w-5 text-accent"/><h2 className="font-display text-lg font-semibold">Invite & earn</h2></div><p className="mt-2 text-sm text-muted-foreground">Share your code. When a new user joins with it, both of you receive <strong>5 bonus AI generations</strong>.</p><div className="mt-4 rounded-xl bg-secondary p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Your referral code</p><div className="mt-1 flex items-center justify-between gap-2"><strong className="font-mono text-lg">{loading?"…":code}</strong><Button size="icon" variant="ghost" onClick={()=>void copy(code)}><Copy className="h-4 w-4"/></Button></div></div><div className="mt-3 flex gap-2"><Button className="flex-1 gap-2" variant="hero" onClick={()=>void share()}><Share2 className="h-4 w-4"/> Share</Button><Button variant="outline" onClick={()=>void copy(shareUrl,"Referral link copied!")}><Copy className="h-4 w-4"/></Button></div></div><div className="rounded-2xl border border-border bg-card p-5"><h2 className="font-display text-lg font-semibold">Keep building</h2><p className="mt-2 text-sm text-muted-foreground">Ready to turn today's challenge into an actual output?</p><Link to="/dashboard"><Button className="mt-4 w-full gap-2" variant="hero">Open AI tools <ArrowRight className="h-4 w-4"/></Button></Link></div></div>
    </section>
  </div></div>;
};
export default Growth;
