import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getToolById } from "@/data/tools";
import type { ToolInput } from "@/data/tools";
import { resumeTemplates, getTemplateById } from "@/data/resumeTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Copy, Download, Loader2, Sparkles, Check,
  Upload, Save, History, Clock, Trash2, AlertTriangle,
  Crown, FileText, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { SharePanel } from "@/components/SharePanel";
import { createPayfastCheckout, submitPayfastCheckout } from "@/lib/payfast";
import { buildManualGenerationBrief, extractBasicCvData, isAiCreditsError } from "@/lib/aiFallbacks";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate`;
const PARSE_CV_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-cv`;

type GenerationFallback = {
  title: string;
  prompt: string;
};
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
const UsageBanner = ({ remaining, isPremium, tier }: { remaining: number | null; isPremium: boolean; tier: string }) => {
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
          <span>Daily limit reached ({tier === "free" ? "5/day" : "50/day"}). <Link to="/#pricing" className="font-semibold underline">Upgrade your plan</Link> for more generations.</span>
        </>
      ) : (
        <>
          <Clock className="h-4 w-4 shrink-0" />
          <span>{remaining} generation{remaining !== 1 ? "s" : ""} remaining today. <Link to="/#pricing" className="font-semibold underline">Upgrade</Link></span>
        </>
      )}
    </div>
  );
};

/* ── Template Selector ──────────────────────── */
const TemplateSelector = ({
  selected, onSelect, isPro,
}: {
  selected: string; onSelect: (id: string) => void; isPro: boolean;
}) => {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-soft mb-4">
      <h3 className="font-display text-sm font-semibold text-foreground mb-3">Choose Resume Template</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {resumeTemplates.map((tmpl) => {
          const locked = tmpl.premium && !isPro;
          const isSelected = selected === tmpl.id;
          return (
            <button
              key={tmpl.id}
              onClick={() => !locked && onSelect(tmpl.id)}
              disabled={locked}
              className={`relative text-left rounded-lg border p-3 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : locked
                  ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                  : "border-border hover:border-primary/30 hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{tmpl.name}</span>
                {locked && (
                  <span className="flex items-center gap-1 text-xs text-accent">
                    <Lock className="h-3 w-3" /> Pro
                  </span>
                )}
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{tmpl.description}</p>
            </button>
          );
        })}
      </div>
      {!isPro && (
        <p className="mt-3 text-xs text-muted-foreground">
          <Link to="/#pricing" className="text-primary hover:underline">Upgrade to Pro</Link> to unlock all 10 templates.
        </p>
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
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCvText = async (cvText: string) => {
    if (cvText.trim().length < 20) {
      toast.error("Text is too short. Please provide more CV content.");
      return;
    }

    setParsing(true);
    try {
      const resp = await fetch(PARSE_CV_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ cvText }),
      });

      if (resp.ok) {
        const parsed = await resp.json();
        onParsed(parsed);
        toast.success("CV parsed successfully! Review the filled fields below.");
        setShowPaste(false);
        setPasteText("");
        return;
      }

      // AI unavailable — use local fallback
      const fallbackData = extractBasicCvData(cvText);
      const hasData = Object.values(fallbackData).some(Boolean);
      if (hasData) {
        onParsed(fallbackData);
        toast.success(
          resp.status === 402
            ? "AI parsing is paused — we extracted what we could locally. Review below."
            : "We extracted basic details. Review and complete them below."
        );
        setShowPaste(false);
        setPasteText("");
      } else {
        toast.error("Could not extract details. Please fill in the fields manually.");
      }
    } catch (e) {
      console.error("CV parse error:", e);
      const fallbackData = extractBasicCvData(cvText);
      const hasData = Object.values(fallbackData).some(Boolean);
      if (hasData) {
        onParsed(fallbackData);
        toast.success("Extracted basic details locally. Review and edit below.");
        setShowPaste(false);
        setPasteText("");
      } else {
        toast.error("Failed to parse CV. Please fill in the fields manually.");
      }
    } finally {
      setParsing(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "pdf" || ext === "doc" || ext === "docx") {
      toast.info("For best results with PDF/DOCX files, copy-paste your CV text using the paste option below.");
      setShowPaste(true);
      return;
    }

    const cvText = await file.text();
    await parseCvText(cvText);
  };

  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Upload className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Import your existing CV</p>
          <p className="text-xs text-muted-foreground">Upload a .txt file or paste your CV text to auto-fill fields</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setShowPaste(!showPaste)}
            disabled={parsing || loading}
          >
            <FileText className="h-3.5 w-3.5" />
            {showPaste ? "Hide" : "Paste Text"}
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={parsing || loading}
          >
            {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {parsing ? "Parsing..." : "Upload .txt"}
          </Button>
        </div>
      </div>

      {showPaste && (
        <div className="space-y-2 animate-fade-up">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste your full CV / resume text here…"
            rows={6}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          />
          <Button
            variant="hero" size="sm"
            onClick={() => parseCvText(pasteText)}
            disabled={parsing || pasteText.trim().length < 20}
            className="w-full"
          >
            {parsing ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Parsing CV...</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5" /> Parse &amp; Auto-Fill</>
            )}
          </Button>
        </div>
      )}

      <input
        ref={fileRef} type="file" className="hidden"
        accept=".txt"
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
            <p className="text-xs text-muted-foreground">No history yet.</p>
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
                  className="w-full text-left rounded-lg border border-border p-3 hover:bg-secondary/50 transition-colors"
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
  const { tier, isPro, isAdmin, dailyLimit } = useSubscription();
  const navigate = useNavigate();

  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [selectedTemplate, setSelectedTemplate] = useState("classic-professional");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [generationFallback, setGenerationFallback] = useState<GenerationFallback | null>(null);
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
        const inputs = data.inputs as Record<string, string>;
        setInputValues(inputs);
        if (inputs._template) setSelectedTemplate(inputs._template);
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
        .select("generations_today, last_generation_date, is_premium, subscription_tier")
        .eq("id", user.id)
        .single();
      if (data) {
        const limit = data.subscription_tier === "business" || data.is_premium ? 999999 : data.subscription_tier === "pro" ? 50 : 5;
        const today = new Date().toISOString().split("T")[0];
        if (data.last_generation_date === today) {
          setRemaining(Math.max(0, limit - data.generations_today));
        } else {
          setRemaining(limit);
        }
      }
    };
    loadProfile();
  }, [user]);

  // Auto-save draft
  const saveDraft = useCallback(async (values: Record<string, string>) => {
    if (!user || !toolId) return;
    setDraftSaving(true);
    await supabase
      .from("drafts")
      .upsert(
        { user_id: user.id, tool_id: toolId, inputs: values, updated_at: new Date().toISOString() },
        { onConflict: "user_id,tool_id" }
      );
    setDraftSaving(false);
  }, [user, toolId]);

  const setField = (key: string, val: string) => {
    const next = { ...inputValues, [key]: val };
    setInputValues(next);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveDraft(next), 2000);
  };

  const isResumeBuilder = toolId === "resume-builder" || toolId === "cover-letter";

  // Check if eBook chapter selection requires pro
  const isEbookChapterLocked = (val: string) => {
    if (toolId !== "ebook-generator") return false;
    return val.includes("(Pro)") && !isPro;
  };

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

  // Check premium tool access
  const toolLocked = tool.premium && !isPro && !isAdmin;

  const buildUserInput = () => {
    const lines: string[] = [];

    // Add template info for resume builder
    if (isResumeBuilder && selectedTemplate) {
      const tmpl = getTemplateById(selectedTemplate);
      if (tmpl) {
        lines.push(`[Template Style: ${tmpl.name}]`);
        lines.push(tmpl.promptAddon);
        lines.push("");
      }
    }

    if (isResumeBuilder) {
      const personalFields = [
        ["fullName", "Full Name"], ["contactEmail", "Email"], ["phone", "Phone"],
        ["location", "Location"], ["linkedIn", "LinkedIn"], ["portfolio", "Portfolio/Website"],
      ];
      const personalLines = personalFields
        .map(([key, label]) => inputValues[key]?.trim() ? `${label}: ${inputValues[key].trim()}` : null)
        .filter(Boolean);
      if (personalLines.length) {
        lines.push("=== Personal Details ===");
        lines.push(...(personalLines as string[]));
        lines.push("");
      }
    }

    tool.inputs.forEach((inp) => {
      const val = inputValues[inp.key]?.trim();
      if (val) lines.push(`${inp.label}: ${val}`);
    });

    return lines.join("\n");
  };

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Please sign in to generate content");
      navigate("/auth");
      return;
    }

    if (toolLocked) {
      toast.error("This tool requires a Pro or Business plan.");
      return;
    }

    if (!isAdmin && remaining !== null && remaining <= 0) {
      toast.error("Daily limit reached. Upgrade your plan for more generations.");
      return;
    }

    // Check eBook chapter pro lock
    const chapterVal = inputValues["chapters"] || "";
    if (isEbookChapterLocked(chapterVal)) {
      toast.error("Chapters above 15 require a Pro plan. Upgrade to unlock more chapters.");
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
    setGenerationFallback(null);

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
        if (err.code === "LIMIT_REACHED") {
          setRemaining(0);
          toast.error(err.error || "Daily limit reached.");
        } else if (resp.status === 429) {
          toast.error(err.error || "Too many requests right now. Please wait a moment and try again.");
        } else if (resp.status === 402) {
          setGenerationFallback({
            title: tool.name,
            prompt: buildManualGenerationBrief({
              toolName: tool.name,
              toolPrompt: tool.prompt,
              userInput,
            }),
          });
          toast.error("AI is paused right now, so we prepared a full generation brief you can copy or download below.");
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

      if (!isAdmin && remaining !== null) setRemaining(Math.max(0, remaining - 1));

      if (user && accumulated) {
        supabase.from("generations").insert({
          user_id: user.id,
          tool_id: tool.id,
          tool_name: tool.name,
          inputs: { ...inputValues, _template: selectedTemplate },
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

  const downloadTextContent = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    downloadTextContent(output, `${tool.id}-output.txt`);
    toast.success("Downloaded!");
  };

  const handleCopyGenerationBrief = () => {
    if (generationFallback) {
      navigator.clipboard.writeText(generationFallback.prompt);
      toast.success("Brief copied to clipboard");
    }
  };

  const handleDownloadGenerationBrief = () => {
    if (generationFallback) {
      downloadTextContent(generationFallback.prompt, `${tool.id}-brief.txt`);
      toast.success("Brief downloaded!");
    }
  };

  const handleCvParsed = (data: Record<string, string>) => {
    const mapping: Record<string, string> = {
      role: "role", experience: "experience", skills: "skills", education: "education",
      fullName: "fullName", email: "contactEmail", phone: "phone", location: "location",
      linkedIn: "linkedIn", portfolio: "portfolio", summary: "summary",
    };
    const next = { ...inputValues };
    for (const [parsed, field] of Object.entries(mapping)) {
      if (data[parsed]) next[field] = data[parsed];
    }
    setInputValues(next);
    saveDraft(next);
  };

  const handleLoadFromHistory = (histOutput: string, histInputs: Record<string, string>) => {
    setGenerationFallback(null);
    setOutput(histOutput);
    setInputValues(histInputs);
    if (histInputs._template) setSelectedTemplate(histInputs._template);
  };

  const handleClearDraft = async () => {
    setGenerationFallback(null);
    setOutput("");
    setInputValues({});
    setSelectedTemplate("classic-professional");
    if (user && toolId) {
      await supabase.from("drafts").delete().eq("user_id", user.id).eq("tool_id", toolId);
    }
    toast.success("Form cleared");
  };

  const handleUpgrade = async (upgradeTier: string) => {
    if (!user || !session) {
      navigate("/auth");
      return;
    }

    try {
      const checkout = await createPayfastCheckout({
        accessToken: session.access_token,
        tier: upgradeTier,
        returnUrl: `${window.location.origin}/dashboard`,
        cancelUrl: `${window.location.origin}/dashboard`,
      });

      submitPayfastCheckout(checkout);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment initiation failed. Please try again.");
    }
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

        {/* Tool locked paywall */}
        {toolLocked && (
          <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-6 text-center">
            <Crown className="h-8 w-8 text-accent mx-auto mb-2" />
            <h3 className="font-display text-lg font-semibold text-foreground">Pro Tool</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">This tool requires a Pro or Business plan.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="hero" size="sm" onClick={() => handleUpgrade("pro")}>
                Upgrade to Pro — R149/mo
              </Button>
              <Button variant="accent" size="sm" onClick={() => handleUpgrade("business")}>
                Go Business — R499/mo
              </Button>
            </div>
          </div>
        )}

        {/* Usage banner */}
        <UsageBanner remaining={remaining} isPremium={isPro || isAdmin} tier={tier} />

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

        {/* Template selector for resume builder */}
        {toolId === "resume-builder" && (
          <TemplateSelector
            selected={selectedTemplate}
            onSelect={(id) => {
              setSelectedTemplate(id);
              setField("_template", id);
            }}
            isPro={isPro || isAdmin}
          />
        )}

        {/* CV Upload */}
        {isResumeBuilder && (
          <div className="mb-4">
            <CvUploadSection onParsed={handleCvParsed} loading={loading} />
          </div>
        )}

        {/* Personal Details */}
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
            disabled={loading || toolLocked || (!isAdmin && !isPro && remaining !== null && remaining <= 0)}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
            ) : toolLocked ? (
              <><Lock className="h-4 w-4" /> Upgrade to Use This Tool</>
            ) : remaining !== null && remaining <= 0 && !isPro && !isAdmin ? (
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

        {generationFallback && !loading && (
          <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-6 shadow-soft animate-fade-up">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">AI is paused — your brief is still ready</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Built-in AI is temporarily unavailable, but your request has been turned into a complete generation brief you can copy or download and use elsewhere.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyGenerationBrief}>
                  <Copy className="h-3.5 w-3.5" /> Copy brief
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadGenerationBrief}>
                  <Download className="h-3.5 w-3.5" /> Download brief
                </Button>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-border bg-background p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {generationFallback.prompt}
            </div>
          </div>
        )}

        {/* Share to Social */}
        {output && !loading && (
          <SharePanel toolName={tool.name} category={tool.category} output={output} />
        )}
      </div>
    </div>
  );
};

export default ToolPage;
