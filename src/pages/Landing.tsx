import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { categories, tools } from "@/data/tools";
import { ArrowRight, Zap, Sparkles, Rocket, Check, LayoutDashboard, Star, Shield, Clock, TrendingUp } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/[0.06] blur-[120px]" />
          <div className="absolute top-40 right-0 h-[300px] w-[400px] rounded-full bg-accent/[0.04] blur-[100px]" />
        </div>

        <div className="container max-w-3xl text-center">
          <div className="animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              29 AI-powered tools — one platform
            </div>
          </div>

          <h1
            className="animate-fade-up font-display text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "80ms", lineHeight: "1.1" }}
          >
            Turn your ideas into <span className="text-gradient">income</span> with AI
          </h1>

          <p
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground opacity-0 animate-fade-up"
            style={{ animationDelay: "160ms" }}
          >
            Create eBooks, courses, marketing copy, professional resumes, and digital products — all powered by advanced AI. Start for free.
          </p>

          <div
            className="mt-10 flex flex-wrap items-center justify-center gap-3 opacity-0 animate-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            <Link to="/auth?mode=signup">
              <Button variant="hero" size="xl">
                Start Free <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" size="xl">
                Explore Tools
              </Button>
            </Link>
          </div>

          <div
            className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground opacity-0 animate-fade-up"
            style={{ animationDelay: "320ms" }}
          >
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> 5 free daily generations</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Full content, not outlines</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-border bg-card/50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "29+", label: "AI Tools", icon: Zap },
              { value: "6", label: "Categories", icon: Star },
              { value: "10", label: "Resume Templates", icon: Shield },
              { value: "50+", label: "eBook Chapters", icon: TrendingUp },
            ].map((stat) => (
              <ScrollReveal key={stat.label}>
                <div className="flex flex-col items-center gap-2">
                  <stat.icon className="h-5 w-5 text-primary" />
                  <span className="font-display text-2xl font-bold text-foreground">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-24 bg-secondary/40">
        <div className="container">
          <ScrollReveal>
            <h2 className="text-center font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need to hustle smarter
            </h2>
            <p className="mx-auto mt-3 max-w-md text-center text-muted-foreground">
              Six categories. Twenty-nine tools. One platform.
            </p>
          </ScrollReveal>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, i) => {
              const count = tools.filter((t) => t.category === cat.name).length;
              return (
                <ScrollReveal key={cat.name} delay={i * 70}>
                  <Link to="/dashboard" className="block rounded-xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:shadow-card hover:-translate-y-0.5">
                    <span className="text-2xl">{cat.emoji}</span>
                    <h3 className="mt-3 font-display text-base font-semibold text-foreground">{cat.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{count} tools available</p>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Tools */}
      <section className="py-24">
        <div className="container">
          <ScrollReveal>
            <h2 className="text-center font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Popular AI tools
            </h2>
            <p className="mx-auto mt-3 max-w-md text-center text-muted-foreground">
              Production-ready content in seconds — not outlines or drafts.
            </p>
          </ScrollReveal>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tools.slice(0, 8).map((tool, i) => (
              <ScrollReveal key={tool.id} delay={i * 60}>
                <Link to={`/tool/${tool.id}`} className="group block rounded-xl border border-border bg-card p-5 shadow-soft transition-all duration-300 hover:shadow-card hover:-translate-y-0.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                    <tool.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-display text-sm font-semibold text-foreground">{tool.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{tool.description}</p>
                </Link>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link to="/dashboard">
              <Button variant="outline" size="lg">
                View All 29 Tools <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-secondary/40">
        <div className="container max-w-4xl">
          <ScrollReveal>
            <h2 className="text-center font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How it works
            </h2>
          </ScrollReveal>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {[
              { icon: Zap, step: "01", title: "Pick a tool", desc: "Choose from 29 AI tools across 6 categories." },
              { icon: Sparkles, step: "02", title: "Enter details", desc: "Fill in the fields — the more specific, the better." },
              { icon: Rocket, step: "03", title: "Get results", desc: "Copy, download, or save your AI-generated output." },
            ].map((s, i) => (
              <ScrollReveal key={s.title} delay={i * 100}>
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="mt-4 block font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">{s.step}</span>
                  <h3 className="mt-1 font-display text-lg font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="container max-w-5xl">
          <ScrollReveal>
            <h2 className="text-center font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-center text-muted-foreground">
              Start free. Upgrade when you're ready to scale.
            </p>
          </ScrollReveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {/* Free */}
            <ScrollReveal delay={0}>
              <div className="rounded-xl border border-border bg-card p-8 shadow-soft h-full flex flex-col">
                <h3 className="font-display text-lg font-semibold text-foreground">Starter</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try every tool, free forever</p>
                <p className="mt-6 font-display text-4xl font-bold text-foreground">R0<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                <ul className="mt-6 space-y-3 text-sm text-foreground flex-1">
                  {[
                    "5 generations per day",
                    "Access to all 29 AI tools",
                    "3 resume templates",
                    "Up to 25 eBook chapters",
                    "PDF / DOCX CV import",
                    "Copy & download results",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/auth?mode=signup" className="mt-8 block">
                  <Button variant="outline" className="w-full">Start Free</Button>
                </Link>
              </div>
            </ScrollReveal>

            {/* Pro */}
            <ScrollReveal delay={100}>
              <div className="relative rounded-xl border-2 border-primary bg-card p-8 shadow-card h-full flex flex-col">
                <div className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">Most Popular</div>
                <h3 className="font-display text-lg font-semibold text-foreground">Pro</h3>
                <p className="mt-1 text-sm text-muted-foreground">For creators shipping every week</p>
                <p className="mt-6 font-display text-4xl font-bold text-foreground">R149<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                <ul className="mt-6 space-y-3 text-sm text-foreground flex-1">
                  {[
                    "50 generations per day",
                    "Everything in Starter",
                    "All 10 resume templates",
                    "Up to 50 eBook chapters",
                    "Save & organize history",
                    "Priority AI speed",
                    "Social sharing tools",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button variant="hero" className="mt-8 w-full" onClick={() => window.location.href = '/auth?plan=pro'}>
                  Upgrade to Pro
                </Button>
              </div>
            </ScrollReveal>

            {/* Business */}
            <ScrollReveal delay={200}>
              <div className="rounded-xl border border-accent/30 bg-card p-8 shadow-soft h-full flex flex-col">
                <h3 className="font-display text-lg font-semibold text-foreground">Business</h3>
                <p className="mt-1 text-sm text-muted-foreground">For teams & agencies at scale</p>
                <p className="mt-6 font-display text-4xl font-bold text-foreground">R499<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                <ul className="mt-6 space-y-3 text-sm text-foreground flex-1">
                  {[
                    "Unlimited generations",
                    "Everything in Pro",
                    "Unlimited eBook chapters",
                    "Advanced analytics",
                    "Priority support",
                    "Early access to new tools",
                    "Commercial usage license",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-accent flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button variant="accent" className="mt-8 w-full" onClick={() => window.location.href = '/auth?plan=business'}>
                  Go Business
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Testimonial / Trust */}
      <section className="py-16 bg-secondary/40">
        <div className="container max-w-3xl text-center">
          <ScrollReveal>
            <div className="flex justify-center gap-1 mb-4">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 fill-accent text-accent" />)}
            </div>
            <blockquote className="font-display text-xl font-medium text-foreground italic">
              "I created my entire eBook and course curriculum in one afternoon. The AI generates real, publishable content — not just outlines."
            </blockquote>
            <p className="mt-4 text-sm text-muted-foreground">— Digital Entrepreneur</p>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container max-w-2xl text-center">
          <ScrollReveal>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to start building?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join thousands of creators using AI to build their income streams.
            </p>
            <Link to="/auth?mode=signup" className="mt-8 inline-block">
              <Button variant="hero" size="xl">
                Get Started Free <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 font-display font-semibold text-foreground">
            <LayoutDashboard className="h-4 w-4 text-primary" /> AI Hustle Studio
          </div>
          <p className="text-sm text-muted-foreground">© 2025 AI Hustle Studio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
