import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getToolById } from "@/data/tools";
import type { ToolInput } from "@/data/tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Copy, Download, Loader2, Sparkles, Check,
  Upload, Save, History, Clock, Trash2, AlertTriangle,
  Crown, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate`;
const PARSE_CV_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-cv`;

/* ── Input Field ─────────────────────────────── */
const ToolInputField = ({
  input, value, onChange,
}: {
  input: ToolInput; value: string; onChange: (val: string) => void;
}) => {
  const base = "w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

  if (input.type === "select") {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {input.label}
          {input.required && <span className="ml-1 text-destructive">*</span>}
        </label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">{input.placeholder}</option>
          {input.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (input.type === "textarea") {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {input.label}
          {input.required && <span className="ml-1 text-destructive">*</span>}
        </label>
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={input.placeholder} rows={3}
          className={`${base} resize-none`}
        />
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {input.label}
        {input.required && <span className="ml-1 text-destructive">*</span>}
      </label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={input.placeholder} />
    </div>
  );
};

/* ── Usage Banner ────────────────────────────── */
const UsageBanner = ({ remaining, isPremium }: { remaining: number | null; isPremium: boolean }) => {
  if (isPremium || remaining === null) return null;
  if (remaining > 2) return null;

  return (
    <div className={`mb-4 flex items-center gap-3 rounded-lg border p-3 text-sm ${
      remaining === 0
        ? "border-destructive/30 bg-destructive/5 text-destructive"
        : "border-accent/30 bg-accent/5 text-accent-foreground"
    }`}>
      {remaining === 0 ? (
        <>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Daily limit reached. <Link to="/#pricing" className="font-semibold underline">Upgrade to Premium</Link> for unlimited generations.</span>
        </>
      ) : (
        <>
          <Clock className="h-4 w-4 shrink-0" />
          <span>{remaining} generation{remaining !== 1 ? "s" : ""} remaining today. <Link to="/#pricing" className="font-semibold underline">Go unlimited</Link></span>
        </>
      )}
    </div>
  );
};

/* ── CV Upload Section ───────────────────────── */
const CvUploadSection = ({
  onParsed, loading,
}: {
  onParsed: (data: Record<string, string>) => void;
  loading: boolean;
}) => {
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setParsing(true);

    try {
      // Read file as text (for txt) or send to parser
      let cvText = "";
      if (file.type === "text/plain") {
        cvText = await file.text();
      } else {
        // For PDF/DOCX, read as text (basic extraction)
        cvText = await file.text();
      }

      if (cvText.trim().length < 20) {
        toast.error("Could not read enough text from the file. Try pasting your CV text instead.");
        setParsing(false);
        return;
      }

      const resp = await fetch(PARSE_CV_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ cvText }),
      });

      if (!resp.ok) {
        throw new Error("Failed to parse CV");
      }

      const parsed = await resp.json();
      onParsed(parsed);
      toast.success("CV parsed! Fields have been filled in. Review and edit before generating.");
    } catch (e) {
      console.error("CV parse error:", e);
      toast.error("Failed to parse CV. Try pasting your CV text manually.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-3">
        <Upload className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Upload your existing CV</p>
          <p className="text-xs text-muted-foreground">Upload a .txt file to auto-fill the fields below</p>
        </div>
        <Button
          variant="outline" size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={parsing || loading}
        >
          {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
          {parsing ? "Parsing..." : "Upload CV"}
        </Button>
      </div>
      <input
        ref={fileRef} type="file" className="hidden"
        accept=".txt,.pdf,.doc,.docx"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
};

/* ── History Sidebar ─────────────────────────── */
const HistoryPanel = ({
  toolId, onLoad,
}: {
  toolId: string;
  onLoad: (output: string, inputs: Record<string, string>) => void;
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const loadHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("generations")
      .select("*")
      .eq("tool_id", toolId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory(data || []);
  }, [user, toolId]);

  useEffect(() => {
    if (open) loadHistory();
  }, [open, loadHistory]);

  if (!user) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)} className="gap-1.5">
        <History className="h-3.5 w-3.5" /> History
      </Button>
      {open && (
        <div className="mt-3 rounded-xl border border-border bg-card p-4 shadow-soft animate-fade-up">
          <h4 className="text-sm font-semibold text-foreground mb-3">Recent Generations</h4>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No history yet. Generate something to see it here.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onLoad(item.output, item.inputs as Record<string, string>);
                    setOpen(false);
                    toast.success("Loaded from history");
                  }}
                  className="w-full text-left rounded-lg border border-border p-3 hover:bg-secondary/50 transition-colors group"
                >
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()} · {new Date(item.created_at).toLocaleTimeString()}
                  </p>
                  <p className="text-sm text-foreground truncate mt-0.5">{item.output.slice(0, 100)}...</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

/* ── Main ToolPage ───────────────────────────── */
const ToolPage = () => {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = getToolById(toolId || "");
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load draft on mount
  useEffect(() => {
    if (!user || !toolId) return;
    const loadDraft = async () => {
      const { data } = await supabase
        .from("drafts")
        .select("inputs")
        .eq("tool_id", toolId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.inputs) {
        setInputValues(data.inputs as Record<string, string>);
      }
    };
    loadDraft();
  }, [user, toolId]);

  // Load profile for usage info
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("generations_today, last_generation_date, is_premium")
        .eq("id", user.id)
        .single();
      if (data) {
        setIsPremium(data.is_premium);
        const today = new Date().toISOString().split("T")[0];
        if (data.last_generation_date === today) {
          setRemaining(Math.max(0, 5 - data.generations_today));
        } else {
          setRemaining(5);
        }
      }
    };
    loadProfile();
  }, [user]);

  // Auto-save draft
  const saveDraft = useCallback(async (values: Record<string, string>) => {
    if (!user || !toolId) return;
    setDraftSaving(true);
    const { error } = await supabase
      .from("drafts")
      .upsert(
        { user_id: user.id, tool_id: toolId, inputs: values, updated_at: new Date().toISOString() },
        { onConflict: "user_id,tool_id" }
      );
    if (error) console.error("Draft save error:", error);
    setDraftSaving(false);
  }, [user, toolId]);

  const setField = (key: string, val: string) => {
    const next = { ...inputValues, [key]: val };
    setInputValues(next);
    // Debounced auto-save
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveDraft(next), 2000);
  };

  const isResumeBuilder = toolId === "resume-builder" || toolId === "cover-letter";

  if (!tool) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-14">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Tool not found</h1>
          <Link to="/dashboard" className="mt-4 inline-block text-primary hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const buildUserInput = () =>
    tool.inputs
      .map((inp) => {
        const val = inputValues[inp.key]?.trim();
        return val ? `${inp.label}: ${val}` : null;
      })
      .filter(Boolean)
      .join("\n");

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Please sign in to generate content");
      navigate("/auth");
      return;
    }

    if (!isPremium && remaining !== null && remaining <= 0) {
      toast.error("Daily limit reached. Upgrade to Premium for unlimited generations.");
      return;
    }

    const missing = tool.inputs.filter((i) => i.required && !inputValues[i.key]?.trim());
    if (missing.length) {
      toast.error(`Please fill in: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setOutput("");

    try {
      const userInput = buildUserInput();
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ toolName: tool.name, toolPrompt: tool.prompt, userInput }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Generation failed" }));
        if (err.code === "LIMIT_REACHED" || resp.status === 429) {
          setRemaining(0);
          toast.error(err.error || "Daily limit reached.");
        } else if (resp.status === 402) {
          toast.error("AI credits exhausted. Please try again later.");
        } else {
          toast.error(err.error || "Something went wrong");
        }
        setLoading(false);
        return;
      }

      if (!resp.body) { toast.error("No response stream"); setLoading(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { accumulated += content; setOutput(accumulated); }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { accumulated += content; setOutput(accumulated); }
          } catch { /* ignore */ }
        }
      }

      // Update remaining count
      if (!isPremium && remaining !== null) setRemaining(Math.max(0, remaining - 1));

      // Save to history
      if (user && accumulated) {
        supabase.from("generations").insert({
          user_id: user.id,
          tool_id: tool.id,
          tool_name: tool.name,
          inputs: inputValues,
          output: accumulated,
        }).then(({ error }) => {
          if (error) console.error("Save generation error:", error);
        });
      }

      toast.success("Generated successfully!");
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("Generation error:", e);
        toast.error("Generation failed — please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tool.id}-output.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  const handleCvParsed = (data: Record<string, string>) => {
    const mapping: Record<string, string> = {
      role: "role",
      experience: "experience",
      skills: "skills",
      education: "education",
      fullName: "fullName",
      email: "contactEmail",
      phone: "phone",
      location: "location",
      linkedIn: "linkedIn",
      portfolio: "portfolio",
      summary: "summary",
    };
    const next = { ...inputValues };
    for (const [parsed, field] of Object.entries(mapping)) {
      if (data[parsed]) next[field] = data[parsed];
    }
    setInputValues(next);
    saveDraft(next);
  };

  const handleLoadFromHistory = (histOutput: string, histInputs: Record<string, string>) => {
    setOutput(histOutput);
    setInputValues(histInputs);
  };

  const handleClearDraft = async () => {
    setInputValues({});
    if (user && toolId) {
      await supabase.from("drafts").delete().eq("user_id", user.id).eq("tool_id", toolId);
    }
    toast.success("Form cleared");
  };

  return (
    <div className="min-h-screen pt-20 pb-16 bg-background">
      <div className="container max-w-2xl">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <tool.icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold text-foreground">{tool.name}</h1>
            <p className="text-sm text-muted-foreground">{tool.description}</p>
          </div>
          {tool.premium && (
            <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
              <Crown className="h-3 w-3" /> Pro
            </span>
          )}
        </div>

        {/* Usage banner */}
        <UsageBanner remaining={remaining} isPremium={isPremium} />

        {/* Action bar */}
        <div className="flex items-center gap-2 mb-4">
          <HistoryPanel toolId={tool.id} onLoad={handleLoadFromHistory} />
          <Button variant="outline" size="sm" onClick={handleClearDraft} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </Button>
          {draftSaving && (
            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
              <Save className="h-3 w-3 animate-pulse" /> Saving draft...
            </span>
          )}
          {!draftSaving && user && Object.keys(inputValues).length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3" /> Draft saved
            </span>
          )}
        </div>

        {/* CV Upload (for resume/cover letter tools) */}
        {isResumeBuilder && (
          <div className="mb-4">
            <CvUploadSection onParsed={handleCvParsed} loading={loading} />
          </div>
        )}

        {/* Personal Details (for resume/cover letter) */}
        {isResumeBuilder && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-soft space-y-4 mb-4">
            <h3 className="font-display text-sm font-semibold text-foreground">Personal Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Full Name</label>
                <Input value={inputValues.fullName || ""} onChange={(e) => setField("fullName", e.target.value)} placeholder="e.g., John Anderson" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                <Input value={inputValues.contactEmail || ""} onChange={(e) => setField("contactEmail", e.target.value)} placeholder="e.g., john@example.com" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Phone</label>
                <Input value={inputValues.phone || ""} onChange={(e) => setField("phone", e.target.value)} placeholder="e.g., +1 (555) 123-4567" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Location</label>
                <Input value={inputValues.location || ""} onChange={(e) => setField("location", e.target.value)} placeholder="e.g., San Francisco, CA" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">LinkedIn</label>
                <Input value={inputValues.linkedIn || ""} onChange={(e) => setField("linkedIn", e.target.value)} placeholder="e.g., linkedin.com/in/johndoe" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Portfolio / Website</label>
                <Input value={inputValues.portfolio || ""} onChange={(e) => setField("portfolio", e.target.value)} placeholder="e.g., johndoe.dev" />
              </div>
            </div>
          </div>
        )}

        {/* Inputs */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-soft space-y-4">
          {tool.inputs.map((inp) => (
            <ToolInputField
              key={inp.key}
              input={inp}
              value={inputValues[inp.key] || ""}
              onChange={(val) => setField(inp.key, val)}
            />
          ))}

          <Button
            variant="hero" size="lg"
            className="mt-2 w-full"
            onClick={handleGenerate}
            disabled={loading || (!isPremium && remaining !== null && remaining <= 0)}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
            ) : remaining !== null && remaining <= 0 && !isPremium ? (
              <><Crown className="h-4 w-4" /> Upgrade to Generate</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate</>
            )}
          </Button>
        </div>

        {/* Output */}
        {(output || loading) && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft animate-fade-up">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-foreground">Output</h3>
              {output && !loading && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border bg-secondary/50 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {output || (loading && <span className="text-muted-foreground animate-pulse">Generating…</span>)}
              {loading && output && <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolPage;
