import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LayoutDashboard, Loader2, Mail, Lock, User } from "lucide-react";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const defaultMode = searchParams.get("mode") === "signup" ? false : true;
  const [isLogin, setIsLogin] = useState(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const requestedPlan = searchParams.get("plan");
  const referral = searchParams.get("ref");
  const nextPath = requestedPlan && ["creator", "pro"].includes(requestedPlan) ? `/dashboard?upgrade=${requestedPlan}` : "/dashboard";

  useEffect(() => {
    if (referral) localStorage.setItem("ai-hustle-referral", referral.trim().toUpperCase());
  }, [referral]);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session?.user) navigate(nextPath, { replace: true });
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (active && !error && data.session?.user) navigate(nextPath, { replace: true });
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [navigate, nextPath]);

  const claimReferral = async () => {
    const code = localStorage.getItem("ai-hustle-referral");
    if (!code) return;
    const { data } = await supabase.rpc("claim_referral", { p_code: code });
    localStorage.removeItem("ai-hustle-referral");
    if (data?.ok) toast.success("Referral bonus unlocked: +5 AI generations!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return toast.error("Please fill in all fields");
    if (!isLogin && !fullName.trim()) return toast.error("Please enter your name");
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { toast.error(error.message); return; }
        await claimReferral(); toast.success("Welcome back!"); navigate(nextPath);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth` } });
        if (error) { if (error.message?.toLowerCase().includes("already")) { toast.error("Account already exists — switching to sign in."); setIsLogin(true); } else toast.error(error.message); return; }
        if (data.session) { await claimReferral(); toast.success("Account created! Welcome."); navigate(nextPath); }
        else { toast.success("Account created! You can now sign in."); setIsLogin(true); }
      }
    } catch (err: any) { toast.error(err.message || "Authentication failed"); } finally { setLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth` } });
      if (error) { toast.error(error.message || "Google sign-in failed"); setGoogleLoading(false); }
    } catch (err: any) { toast.error(err.message || "Google sign-in failed"); setGoogleLoading(false); }
  };

  return <div className="flex min-h-screen items-center justify-center pt-14 pb-16 bg-secondary/30"><div className="w-full max-w-sm px-4"><div className="mb-8 text-center"><div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-soft"><LayoutDashboard className="h-5 w-5 text-primary-foreground" /></div><h1 className="font-display text-xl font-bold text-foreground">{isLogin ? "Welcome back" : "Create your account"}</h1><p className="mt-1.5 text-sm text-muted-foreground">{isLogin ? "Sign in to access your tools" : "Start building with AI today"}</p>{referral && !isLogin && <p className="mt-2 text-xs font-medium text-primary">Referral applied — you’ll receive 5 bonus generations.</p>}</div>
    <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card"><Button variant="outline" size="lg" className="w-full gap-2" onClick={handleGoogleSignIn} disabled={googleLoading || loading}>{googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-bold">G</span>} Continue with Google</Button><div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div></div>
      <form onSubmit={handleSubmit} className="space-y-4">{!isLogin && <div><label className="mb-1.5 block text-sm font-medium text-foreground">Full Name</label><div className="relative"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your name" className="pl-10"/></div></div>}<div><label className="mb-1.5 block text-sm font-medium text-foreground">Email</label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="pl-10"/></div></div><div><div className="mb-1.5 flex items-center justify-between"><label className="block text-sm font-medium text-foreground">Password</label>{isLogin && <button type="button" onClick={async()=>{if(!email.trim()) return toast.error("Enter your email above first.");const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/reset-password`});if(error)toast.error(error.message);else toast.success("Password reset link sent. Check your inbox.");}} className="text-xs font-medium text-primary hover:underline">Forgot password?</button>}</div><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="pl-10"/></div></div><Button variant="hero" size="lg" className="w-full" disabled={loading||googleLoading}>{loading?<><Loader2 className="h-4 w-4 animate-spin"/> {isLogin?"Signing in...":"Creating account..."}</>:isLogin?"Sign In":"Create Account"}</Button></form></div><p className="mt-6 text-center text-sm text-muted-foreground">{isLogin?"Don't have an account?":"Already have an account?"}{" "}<button onClick={()=>setIsLogin(!isLogin)} className="font-medium text-primary hover:underline">{isLogin?"Sign up":"Sign in"}</button></p></div></div>;
};
export default Auth;
