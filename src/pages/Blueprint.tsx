import { Link } from "react-router-dom";
import { BookOpen, Download, Copy, Sparkles, Rocket, Target, DollarSign, Users, Zap, Calendar, Wrench, TrendingUp, Building, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BLUEPRINT_MD = `# The Viral AI Side Hustle Blueprint
### How to Make $100–$500/Day Using Free AI Tools

---

## Introduction
Welcome to the ultimate plug-and-play guide for launching a profitable AI-powered side hustle — with zero upfront cost. This digital product is built for beginners who want fast results, minimal effort, and scalable income.

## What You Will Learn
- How to launch 5 profitable AI-based services in under 24 hours
- How to attract clients fast using free marketing tactics
- How to automate and scale the business using AI
- How to turn your skills into digital products and passive income

# Chapter 1: Understanding the AI Gold Rush
AI tools are exploding in popularity, and businesses are desperate for help. The demand is highest for:
- AI-generated content
- AI automations
- Short-form video editing using AI
- AI-powered branding and design
- AI chatbots for business

These services pay anywhere from $20 to $500 per job.

# Chapter 2: The Easiest AI Services to Offer Today
1. AI Social Media Content Packages — $30–$150 per package
2. AI Logo + Branding Starter Kits — $40–$200
3. AI Chatbot Setup for Small Businesses — $50–$300
4. AI Video / Faceless TikTok/YouTube Shorts — $10–$30 per video or $150/month packages

# Chapter 3: How to Get Clients Fast (Zero Ads Needed)
- Facebook Groups — post free AI content sample offers
- Fiverr & Upwork — one irresistible starter gig for reviews
- TikTok organic — post AI tutorials, get DMs

# Chapter 4: The Automation Blueprint
Once you get clients, automate:
- Content creation with ChatGPT workflows
- Scheduling with Buffer
- Video generation templates
- Chatbot duplication for multiple clients

# Chapter 5: Turn This Book Into Income
- Sell it as an eBook
- Turn it into a video course
- Create templates and upsell

# Chapter 6: 7-Day Launch Plan
- Day 1: Pick service + create simple portfolio
- Day 2: Create your offer (make it irresistible)
- Day 3: Soft launch on Facebook
- Day 4: Set up Fiverr & Upwork gigs
- Day 5: Build repeatable AI workflows
- Day 6: Add high-value upsells
- Day 7: Turn everything into passive products

# Chapter 7: 20 Free AI Tools
Content: ChatGPT, Poe, Notion AI, Writesonic
Branding: Canva, Figma, Kittl
Video: CapCut, Pictory, RunwayML, OpusClip
Automation: Zapier, ManyChat, Tidio
Business: Trello, Clockify, Google Drive

# Chapter 8: Viral Content Strategies
- Before/After AI Transformations
- Teach AI tips on TikTok
- Document your journey
- Share client wins
- Post short tutorials

# Chapter 9: Pricing Psychology
- Round packages to $29, $49, $79
- Add bonuses to make offers feel premium
- Offer 24-hour delivery for +$10
- Add a $200 package to make cheaper ones attractive

# Chapter 10: Turning This Into a Full-Time Business
- Outsource video editing
- Hire a virtual assistant
- Create automated client portals
- Offer monthly retainers
- Build a brand name

# Bonus Scripts
IG DM: "Hey! I noticed your page hasn't posted in a while..."
Cold email: "Hi! I help businesses create consistent, high-quality content using AI tools..."

# Final Words
This isn't just an eBook — it's a blueprint. Start today. Your future bag is waiting.`;

const services = [
  { icon: Sparkles, title: "AI Social Content Packs", price: "$30–$150", desc: "Captions, carousels, viral shorts" },
  { icon: Star, title: "AI Branding Kits", price: "$40–$200", desc: "Logos, colors, typography, templates" },
  { icon: Zap, title: "AI Chatbot Setups", price: "$50–$300", desc: "Customer service bots for small biz" },
  { icon: Rocket, title: "Faceless AI Videos", price: "$10–$30 / $150/mo", desc: "TikTok & Shorts on autopilot" },
];

const day = (n: number, title: string, body: string) => ({ n, title, body });
const days = [
  day(1, "Pick service + portfolio", "Choose ONE hustle, create 2 sample projects using AI tools, design a clean cover image."),
  day(2, "Create irresistible offer", '"Full week of social content in 24 hours for $25." Fast, cheap, efficient.'),
  day(3, "Soft launch on Facebook", '"I\'m testing a new AI service — free sample for any local business."'),
  day(4, "Set up Fiverr & Upwork", "One high-converting gig, clean thumbnail, 3-tier pricing, short delivery."),
  day(5, "Build repeatable AI workflows", "ChatGPT batches, Canva templates, CapCut presets. Cut work time 80%."),
  day(6, "Add high-value upsells", "Monthly content plans, chatbot integration, editing bundles, brand refresh."),
  day(7, "Repurpose to passive products", "Sell templates, scripts, mini-courses, SOPs. Build passive income."),
];

const tools = {
  "Content & Writing": ["ChatGPT", "Poe", "Notion AI", "Writesonic"],
  "Branding & Design": ["Canva", "Figma", "Kittl"],
  "Video Creation": ["CapCut", "Pictory", "RunwayML (free)", "OpusClip"],
  "Automation": ["Zapier (free)", "ManyChat", "Tidio"],
  "Business": ["Trello", "Clockify", "Google Drive"],
};

const Blueprint = () => {
  const copyAll = () => {
    navigator.clipboard.writeText(BLUEPRINT_MD);
    toast.success("Blueprint copied to clipboard");
  };
  const download = () => {
    const blob = new Blob([BLUEPRINT_MD], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-side-hustle-blueprint.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  return (
    <div className="min-h-screen pt-20 pb-16 bg-background md:pl-56">
      <div className="container max-w-5xl">
        {/* Hero */}
        <div className="mb-8 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-primary/5 to-transparent p-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider">
            <BookOpen className="h-3.5 w-3.5" /> Free Digital Product
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl leading-tight">
            The Viral AI Side Hustle Blueprint
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            How to make <span className="font-semibold text-foreground">$100–$500/day</span> using free AI tools.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="hero" size="sm" onClick={download}>
              <Download className="h-4 w-4" /> Download .md
            </Button>
            <Button variant="outline" size="sm" onClick={copyAll}>
              <Copy className="h-4 w-4" /> Copy full blueprint
            </Button>
            <Link to="/tool/business-in-a-box">
              <Button variant="accent" size="sm">
                <Rocket className="h-4 w-4" /> Generate your business
              </Button>
            </Link>
          </div>
        </div>

        {/* What you'll learn */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> What You'll Learn
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              "Launch 5 profitable AI services in under 24 hours",
              "Attract clients fast using free marketing tactics",
              "Automate and scale your business with AI",
              "Turn your skills into passive digital products",
            ].map((l) => (
              <div key={l} className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-sm text-foreground">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {l}
              </div>
            ))}
          </div>
        </section>

        {/* Services */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" /> Services You Can Offer Today
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <div key={s.title} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5 text-xs font-semibold">{s.price}</span>
                </div>
                <h3 className="mt-2 font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 7-Day Launch Plan */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> 7-Day Launch Plan
          </h2>
          <div className="mt-4 space-y-3">
            {days.map((d) => (
              <div key={d.n} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                  {d.n}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Day {d.n} — {d.title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{d.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Free AI Tools */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" /> 20 Free AI Tools
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(tools).map(([cat, list]) => (
              <div key={cat} className="rounded-xl border border-border bg-card p-4">
                <h4 className="text-sm font-semibold text-foreground">{cat}</h4>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {list.map((t) => (
                    <li key={t} className="flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-primary" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing psychology + client scripts */}
        <section className="mb-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Pricing Psychology
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>• Round to $29, $49, $79</li>
              <li>• Add bonuses so offers feel premium</li>
              <li>• +$10 for 24-hour rush delivery</li>
              <li>• Add a $200 package to anchor cheaper tiers</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Copy-Paste Scripts
            </h3>
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase">IG DM</div>
                <p className="text-foreground">"Hey! I noticed your page hasn't posted in a while. I create AI-powered content for businesses and can make you a free sample."</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase">Cold Email</div>
                <p className="text-foreground">"Hi! I help businesses create consistent, high-quality content using AI tools. Want a free sample based on your niche?"</p>
              </div>
            </div>
          </div>
        </section>

        {/* Scale */}
        <section className="mb-10 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-6">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" /> Scale to Full-Time ($1k–$5k/mo)
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm text-muted-foreground">
            {["Outsource video editing", "Hire a virtual assistant", "Build automated client portals", "Offer monthly retainers", "Create your brand name", "Launch mini-courses"].map((s) => (
              <div key={s} className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 border border-border">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> {s}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-primary/10 p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground">Stop reading. Start shipping.</h2>
          <p className="mt-2 text-muted-foreground">Fire up the Business-in-a-Box generator and get everything you need in one click.</p>
          <Link to="/tool/business-in-a-box" className="mt-4 inline-block">
            <Button variant="accent" size="lg">
              <Rocket className="h-4 w-4" /> Launch Business-in-a-Box
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Blueprint;
