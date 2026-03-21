import { useState } from "react";
import { Link } from "react-router-dom";
import { categories, tools, type ToolCategory } from "@/data/tools";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Lock } from "lucide-react";

const Dashboard = () => {
  const [activeCategory, setActiveCategory] = useState<ToolCategory | "All">("All");
  const filtered = activeCategory === "All" ? tools : tools.filter((t) => t.category === activeCategory);

  return (
    <div className="min-h-screen pt-20 pb-16 bg-background">
      <div className="container">
        <div className="mb-10">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">AI Tools</h1>
          <p className="mt-1.5 text-muted-foreground">Pick a tool and start generating.</p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("All")}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
              activeCategory === "All"
                ? "bg-primary text-primary-foreground shadow-soft"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            All ({tools.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                activeCategory === cat.name
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>

        {/* Tools Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((tool, i) => (
            <ScrollReveal key={tool.id} delay={Math.min(i * 40, 300)}>
              <Link
                to={`/tool/${tool.id}`}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-soft transition-all duration-300 hover:shadow-card hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 text-primary transition-colors group-hover:bg-primary/12">
                    <tool.icon className="h-5 w-5" />
                  </div>
                  {tool.premium && (
                    <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                      <Lock className="h-3 w-3" /> Pro
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-display text-sm font-semibold leading-tight text-foreground">{tool.name}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
