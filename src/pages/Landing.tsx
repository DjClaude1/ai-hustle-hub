import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { categories, tools } from "@/data/tools";
import { ArrowRight, Zap, Sparkles, Layers, Rocket, Check } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 h-[300px] w-[400px] rounded-full bg-accent/5 blur-[100px]" />
        </div>

        <div className="container max-w-4xl text-center">
          <div className="animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              29 AI-powered tools in one platform
            </div>
          </div>

          <h1
            className="animate-fade-up font-display text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "80ms" }}
          >
            Build, Launch, and Scale{" "}
            <span className="text-gradient">Side Hustles</span> with AI
          </h1>

          <p
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground opacity-0 animate-fade-up"
            style={{ animationDelay: "160ms" }}
          >
            Create digital products, write marketing copy, research winning niches,
            and automate your income — all from one dashboard.
          </p>

          <div
            className="mt-10 flex flex-wrap items-center justify-center gap-4 opacity-0 animate-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            <Link to="/dashboard">
              <Button variant="hero" size="xl">
                Start Free <ArrowRight className="ml-1 h-5 w-5" />
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
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-accent" /> No credit card needed</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-accent" /> 5 free daily generations</span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20">
        <div className="container">
          <ScrollReveal>
            <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
              Everything You Need to <span className="text-gradient">Hustle Smarter</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
              Six categories. Twenty-nine tools. One platform.
            </p>
          </ScrollReveal>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, i) => {
              const count = tools.filter((t) => t.category === cat.name).length;
              return (
                <ScrollReveal key={cat.name} delay={i * 80}>
                  <div className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                    <span className="text-3xl">{cat.emoji}</span>
                    <h3 className="mt-3 font-display text-lg font-semibold">{cat.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{count} tools</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 surface-elevated">
        <div className="container max-w-4xl">
          <ScrollReveal>
            <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
              Three Steps. Infinite Possibilities.
            </h2>
          </ScrollReveal>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              { icon: Zap, title: "Pick a Tool", desc: "Choose from 29 AI tools across 6 categories." },
              { icon: Sparkles, title: "Enter Your Prompt", desc: "Describe what you need — be as specific as you want." },
              { icon: Rocket, title: "Get Results", desc: "Copy, download, or save your AI-generated output." },
            ].map((step, i) => (
              <ScrollReveal key={step.title} delay={i * 100}>
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="container max-w-4xl">
          <ScrollReveal>
            <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
          </ScrollReveal>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <ScrollReveal delay={0}>
              <div className="rounded-xl border border-border bg-card p-8">
                <h3 className="font-display text-xl font-semibold">Free</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try it out, no strings attached</p>
                <p className="mt-6 font-display text-4xl font-bold">$0<span className="text-lg font-normal text-muted-foreground">/mo</span></p>
                <ul className="mt-6 space-y-3 text-sm">
                  {["5 generations per day", "Access to all tools", "Copy & download results"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-accent" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/dashboard" className="mt-8 block">
                  <Button variant="outline" className="w-full">Start Free</Button>
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className="relative rounded-xl border border-primary/40 bg-card p-8 glow-primary">
                <div className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">Popular</div>
                <h3 className="font-display text-xl font-semibold">Premium</h3>
                <p className="mt-1 text-sm text-muted-foreground">For serious hustlers</p>
                <p className="mt-6 font-display text-4xl font-bold">$19<span className="text-lg font-normal text-muted-foreground">/mo</span></p>
                <ul className="mt-6 space-y-3 text-sm">
                  {["Unlimited generations", "Priority speed", "Advanced tools unlocked", "Save & organize history", "Early access to new tools"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button variant="hero" className="mt-8 w-full">Upgrade to Premium</Button>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 font-display font-semibold">
            <Zap className="h-4 w-4 text-primary" /> AI Hustle Studio
          </div>
          <p className="text-sm text-muted-foreground">© 2025 AI Hustle Studio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
