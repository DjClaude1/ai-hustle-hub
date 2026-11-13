import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Crown, Loader2, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { createPayfastCheckout, submitPayfastCheckout, type BillingPeriod } from "@/lib/payfast";

const Subscription = () => {
  const { user } = useAuth();
  const { tier, subscriptionStatus, refresh } = useSubscription();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [busy, setBusy] = useState(false);
  const [paymentState, setPaymentState] = useState<"idle" | "pending" | "complete" | "cancelled">("idle");
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("paymentId");
  const paymentFlag = searchParams.get("payment");

  const checkPayment = useCallback(async () => {
    if (!paymentId || !user) return;
    const { data, error } = await supabase.from("payments").select("status").eq("payment_id", paymentId).eq("user_id", user.id).maybeSingle();
    if (error) { toast.error("Could not check payment status yet."); return; }
    const status = String(data?.status || "").toLowerCase();
    if (status === "complete" || status === "completed") { setPaymentState("complete"); await refresh(); }
    else if (paymentFlag === "cancelled") setPaymentState("cancelled");
    else setPaymentState("pending");
  }, [paymentId, paymentFlag, user, refresh]);

  useEffect(() => { if (paymentId && user) void checkPayment(); }, [paymentId, user, checkPayment]);

  const startCheckout = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Your session has expired. Please sign in again.");
      const origin = window.location.origin;
      const checkout = await createPayfastCheckout({
        accessToken,
        period,
        returnUrl: `${origin}/subscription?payment=processing`,
        cancelUrl: `${origin}/subscription?payment=cancelled`,
      });
      submitPayfastCheckout(checkout);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start checkout.");
      setBusy(false);
    }
  };

  const premium = tier === "pro";
  return <main className="min-h-screen bg-background pb-16 pt-24">
    <div className="container max-w-5xl">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Crown className="h-6 w-6" /></div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Choose how far you want to go</h1>
        <p className="mt-3 text-muted-foreground">Keep using AI Hustle Hub for free, or unlock the advanced tools when you're ready.</p>
      </div>

      {paymentState !== "idle" && <Card className="mx-auto mb-6 max-w-2xl border-primary/30"><CardContent className="flex flex-col items-center gap-3 p-5 text-center">
        {paymentState === "complete" ? <><ShieldCheck className="h-7 w-7 text-primary" /><p className="font-semibold">Premium is active. Welcome aboard!</p></> : paymentState === "cancelled" ? <><p className="font-semibold">Checkout was cancelled. No payment was taken.</p></> : <><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="font-semibold">We're confirming your payment with PayFast.</p><p className="text-sm text-muted-foreground">Keep this page open and check again shortly. Do not submit another payment while this one is pending.</p><Button variant="outline" onClick={() => void checkPayment()}>Check payment status</Button></>}
      </CardContent></Card>}

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader><CardTitle>Free</CardTitle><CardDescription>Everything you need to get started.</CardDescription><div className="pt-2 font-display text-4xl font-bold">R0 <span className="text-sm font-normal text-muted-foreground">forever</span></div></CardHeader>
          <CardContent className="space-y-3">
            {["20 AI generations every day","All standard AI tools and workflows","PDF and DOCX exports","Saved history and favorites","No card required"].map(x => <div key={x} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary" />{x}</div>)}
            <Button asChild variant="outline" className="mt-4 w-full"><Link to={user ? "/dashboard" : "/auth?mode=signup"}>Continue free</Link></Button>
          </CardContent>
        </Card>
        <Card className="relative border-primary/50 shadow-card">
          <div className="absolute -top-3 right-5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Recommended</div>
          <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-primary" />Premium</CardTitle><CardDescription>For creators, freelancers and business builders who want to scale.</CardDescription>
            <div className="flex items-end gap-2 pt-2 font-display text-4xl font-bold">{period === "monthly" ? "R199" : "R1,990"}<span className="pb-1 text-sm font-normal text-muted-foreground">/{period === "monthly" ? "month" : "year"}</span></div>
            <p className="text-xs text-muted-foreground">{period === "annual" ? "Save R398 compared with 12 monthly payments." : "Flexible monthly billing. Cancel any time."}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary p-1">
              <Button size="sm" variant={period === "monthly" ? "default" : "ghost"} onClick={() => setPeriod("monthly")}>Monthly</Button>
              <Button size="sm" variant={period === "annual" ? "default" : "ghost"} onClick={() => setPeriod("annual")}>Annual · Save 17%</Button>
            </div>
            {["Up to 600 AI generations per month","Automated job-application workflows","Business execution automation","Faceless video production studio","Ebook, course and PDF guide creation","Business-in-a-Box workflows","Priority generation and advanced AI"].map(x => <div key={x} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{x}</div>)}
            {premium ? <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm font-medium text-primary">Your Premium subscription is active ({subscriptionStatus}).</div> : user ? <Button className="mt-3 w-full" onClick={() => void startCheckout()} disabled={busy}>{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connecting to PayFast…</> : "Subscribe securely with PayFast"}</Button> : <Button asChild className="mt-3 w-full"><Link to="/auth?mode=signup">Create an account to subscribe</Link></Button>}
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">Secure recurring card payments are processed by PayFast. Subscriptions can be cancelled through your PayFast buyer account. Payment activation is confirmed server-to-server.</p>
          </CardContent>
        </Card>
      </div>
      <div className="mx-auto mt-6 flex max-w-2xl items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />Your card details are handled by PayFast, never stored by AI Hustle Hub.</div>
    </div>
  </main>;
};
export default Subscription;
