import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { categories, tools } from "@/data/tools";
import { ArrowRight, Zap, Sparkles, Rocket, Check, LayoutDashboard, Star, Shield, TrendingUp, Users, Gift, Target } from "lucide-react";

const Landing = () => {
  const scrollPricing = () => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background">
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/[0.06] blur-[120px]" />
          <div className="absolute top-40 right-0 h-[300px] w-[400px] rounded-full bg-accent/[0.04] blur-[100px]" />
        </div>
        <div className="container max-w-4xl text-center">
          <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Your AI-powered side-hustle launchpad
          </div>
          <h1 className="animate-fade-up font-display text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl" style={{ animationDelay: "80ms" }}>
            Turn your ideas into <span className="text-gradient">income</span> with AI
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground opacity-0 animate-fade-up" style={{ animationDelay: "160ms" }}>
            Go from idea to business, content, CV, marketing and digital products in one place. Build faster without paying an agency.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 opacity-0 animate-fade-up" style={{ animationDelay: "240ms" }}>
            <Link to="/auth?mode=signup"><Button variant="hero" size="xl">Start Free <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
            <Button variant="outline" size="xl" onClick={scrollPricing}>See Plans</Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Free to try · No credit card required to create your account</p>
        </div>
      </section>

      <section className="py-12 border-y border-border bg-card/50">
        <div className="container"><div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[{ value: "29+", label: "AI Tools", icon: Zap }, { value: "6", label: "Categories", icon: Star }, { value: "10", label: "Resume Templates", icon: Shield }, { value: "1", label: "Hustle Launchpad", icon: TrendingUp }].map((stat) => (
            <ScrollReveal key={stat.label}><div className="flex flex-col items-center gap-2"><stat.icon className="h-5 w-5 text-primary" /><span className="font-display text-2xl font-bold text-foreground">{stat.value}</span><span className="text-sm text-muted-foreground">{stat.label}</span></div></ScrollReveal>
          ))}
        </div></div>
      </section>

      <section className="py-20 bg-secondary/40">
        <div className="container max-w-5xl"><ScrollReveal><h2 className="text-center font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Build something people will pay for</h2><p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">AI Hustle Hub turns a blank page into a practical launch plan and the assets you need to start selling.</p></ScrollReveal>
          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {[{ icon: Target, title: "Find an idea", desc: "Discover practical side-hustle opportunities." }, { icon: Rocket, title: "Launch", desc: "Create plans, offers, names and business assets." }, { icon: Sparkles, title: "Create", desc: "Generate content, ebooks, CVs and marketing." }, { icon: Users, title: "Get customers", desc: "Create pitches, ads and client-ready material." }].map((s, i) => <ScrollReveal key={s.title} delay={i * 70}><div className="rounded-xl border border-border bg-card p-5 h-full"><s.icon className="h-5 w-5 text-primary" /><h3 className="mt-3 font-display font-semibold text-foreground">{s.title}</h3><p className="mt-1 text-sm text-muted-foreground">{s.desc}</p></div></ScrollReveal>)}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container"><ScrollReveal><h2 className="text-center font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Everything you need to hustle smarter</h2><p className="mx-auto mt-3 max-w-md text-center text-muted-foreground">Six categories. Twenty-nine tools. One platform.</p></ScrollReveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.map((cat, i) => { const count = tools.filter((t) => t.category === cat.name).length; return <ScrollReveal key={cat.name} delay={i * 70}><Link to="/dashboard" className="block rounded-xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:shadow-card hover:-translate-y-0.5"><span className="text-2xl">{cat.emoji}</span><h3 className="mt-3 font-display text-base font-semibold text-foreground">{cat.name}</h3><p className="mt-1 text-sm text-muted-foreground">{count} tools available</p></Link></ScrollReveal>; })}</div>
        </div>
      </section>

      <section className="py-24 bg-secondary/40">
        <div className="container max-w-4xl"><ScrollReveal><h2 className="text-center font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">How it works</h2></ScrollReveal>
          <div className="mt-14 grid gap-10 md:grid-cols-3">{[{ icon: Zap, step: "01", title: "Pick a tool", desc: "Choose the outcome you need." }, { icon: Sparkles, step: "02", title: "Tell AI what you want", desc: "Give it your idea, skills or business details." }, { icon: Rocket, step: "03", title: "Use the result", desc: "Copy, download, save or turn it into your next step." }].map((s, i) => <ScrollReveal key={s.title} delay={i * 100}><div className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></div><span className="mt-4 block font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">{s.step}</span><h3 className="mt-1 font-display text-lg font-semibold text-foreground">{s.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p></div></ScrollReveal>)}</div>
        </div>
      </section>

      <section id="pricing" className="py-24">
        <div className="container max-w-6xl"><ScrollReveal><h2 className="text-center font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Simple pricing built for hustlers</h2><p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">Start free. Upgrade when AI becomes part of your workflow. SA reference prices are shown below; PayPal bills the equivalent USD amount.</p></ScrollReveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <ScrollReveal><div className="rounded-xl border border-border bg-card p-8 shadow-soft h-full flex flex-col"><h3 className="font-display text-lg font-semibold text-foreground">Free</h3><p className="mt-1 text-sm text-muted-foreground">Explore before you pay</p><p className="mt-6 font-display text-4xl font-bold text-foreground">R0<span className="text-base font-normal text-muted-foreground">/mo</span></p><ul className="mt-6 space-y-3 text-sm text-foreground flex-1">{["5 generations per day","7 starter tools","7-day history","Copy & download results"].map(f => <li key={f} className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary" />{f}</li>)}</ul><Link to="/auth?mode=signup" className="mt-8 block"><Button variant="outline" className="w-full">Start Free</Button></Link></div></ScrollReveal>
            <ScrollReveal delay={100}><div className="relative rounded-xl border-2 border-primary bg-card p-8 shadow-card h-full flex flex-col"><div className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">MOST POPULAR</div><h3 className="font-display text-lg font-semibold text-foreground">Starter</h3><p className="mt-1 text-sm text-muted-foreground">For creators getting serious</p><p className="mt-6 font-display text-4xl font-bold text-foreground">R99<span className="text-base font-normal text-muted-foreground">/mo</span></p><p className="mt-1 text-xs text-muted-foreground">PayPal: $6 USD/month</p><ul className="mt-6 space-y-3 text-sm text-foreground flex-1">{["50 AI generations/month","All core tools","PDF export","Unlimited history","Favorites & saved work","Priority generation"].map(f => <li key={f} className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary" />{f}</li>)}</ul><Button variant="hero" className="mt-8 w-full" onClick={() => window.location.href = '/auth?plan=creator'}>Start Starter</Button></div></ScrollReveal>
            <ScrollReveal delay={200}><div className="rounded-xl border border-accent/30 bg-card p-8 shadow-soft h-full flex flex-col"><h3 className="font-display text-lg font-semibold text-foreground">Pro</h3><p className="mt-1 text-sm text-muted-foreground">For serious hustlers & freelancers</p><p className="mt-6 font-display text-4xl font-bold text-foreground">R249<span className="text-base font-normal text-muted-foreground">/mo</span></p><p className="mt-1 text-xs text-muted-foreground">PayPal: $15 USD/month</p><ul className="mt-6 space-y-3 text-sm text-foreground flex-1">{["250 AI generations/month","Everything in Starter","DOCX + PDF export","Advanced AI mode","Pro business systems","Commercial-use workflow"].map(f => <li key={f} className="flex items-center gap-2.5"><Check className="h-4 w-4 text-accent" />{f}</li>)}</ul><Button variant="accent" className="mt-8 w-full" onClick={() => window.location.href = '/auth?plan=pro'}>Go Pro</Button></div></ScrollReveal>
          </div>
          <div className="mt-8 rounded-xl border border-border bg-secondary/40 p-5 text-center"><div className="flex items-center justify-center gap-2 font-semibold text-foreground"><Users className="h-4 w-4 text-primary" />Business plan coming next</div><p className="mt-1 text-sm text-muted-foreground">For agencies and businesses needing client workspaces, brand kits and higher limits.</p></div>
        </div>
      </section>

      <section className="py-20 bg-secondary/40"><div className="container max-w-3xl text-center"><ScrollReveal><div className="flex justify-center gap-1 mb-4">{[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 fill-accent text-accent" />)}</div><blockquote className="font-display text-xl font-medium text-foreground italic">“Turn one idea into a plan, content and a real launch — without needing an agency.”</blockquote><p className="mt-4 text-sm text-muted-foreground">Built for creators, job seekers, freelancers and small businesses.</p></ScrollReveal></div></section>

      <section className="py-24"><div className="container max-w-3xl text-center"><ScrollReveal><div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Gift className="h-6 w-6" /></div><h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Take the 7-Day AI Hustle Challenge</h2><p className="mt-4 text-muted-foreground">Find an idea, build the offer, create your marketing and prepare to get your first customer — one practical step at a time.</p><Link to="/auth?mode=signup" className="mt-8 inline-block"><Button variant="hero" size="xl">Start the Challenge <ArrowRight className="ml-1 h-4 w-4" /></Button></Link></ScrollReveal></div></section>

      <footer className="border-t border-border py-8"><div className="container flex flex-col items-center justify-between gap-4 sm:flex-row"><div className="flex items-center gap-2 font-display font-semibold text-foreground"><LayoutDashboard className="h-4 w-4 text-primary" /> AI Hustle Hub</div><p className="text-sm text-muted-foreground">© 2026 AI Hustle Hub. All rights reserved.</p></div></footer>
    </div>
  );
};
export default Landing;
