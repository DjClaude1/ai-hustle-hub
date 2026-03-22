import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ScrollReveal } from "@/components/ScrollReveal";
import { getToolById } from "@/data/tools";
import { ArrowLeft, Clock, Trash2, Copy, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Generation {
  id: string;
  tool_id: string;
  tool_name: string;
  inputs: Record<string, string>;
  output: string;
  created_at: string;
}

const HistoryPage = () => {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setGenerations((data || []) as Generation[]);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleDelete = async (id: string) => {
    await supabase.from("generations").delete().eq("id", id);
    setGenerations((prev) => prev.filter((g) => g.id !== id));
    toast.success("Deleted");
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-20 pb-16 bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Please sign in to view history.</p>
          <Link to="/auth" className="mt-2 inline-block text-primary hover:underline">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 bg-background">
      <div className="container max-w-3xl">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Generation History</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review and reuse your past generations</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : generations.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="mt-3 text-muted-foreground">No generations yet. Try a tool to get started!</p>
            <Link to="/dashboard">
              <Button variant="outline" className="mt-4">Browse Tools</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {generations.map((gen, i) => {
              const tool = getToolById(gen.tool_id);
              const isExpanded = expanded === gen.id;
              return (
                <ScrollReveal key={gen.id} delay={Math.min(i * 50, 200)}>
                  <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : gen.id)}
                      className="w-full text-left p-4 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {tool && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                            <tool.icon className="h-4 w-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{gen.tool_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{gen.output.slice(0, 80)}...</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(gen.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border p-4 bg-secondary/20 animate-fade-up">
                        <div className="rounded-lg border border-border bg-background p-3 text-sm whitespace-pre-wrap text-foreground max-h-64 overflow-y-auto">
                          {gen.output}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm" onClick={() => handleCopy(gen.output)}>
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </Button>
                          <Link to={`/tool/${gen.tool_id}`}>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-3.5 w-3.5" /> Open Tool
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(gen.id)} className="ml-auto text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
