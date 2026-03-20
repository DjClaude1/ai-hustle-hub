import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getToolById } from "@/data/tools";
import type { ToolInput } from "@/data/tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Download, Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate`;

const ToolInputField = ({
  input,
  value,
  onChange,
}: {
  input: ToolInput;
  value: string;
  onChange: (val: string) => void;
}) => {
  if (input.type === "select") {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          {input.label}
          {input.required && <span className="ml-1 text-destructive">*</span>}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
        >
          <option value="">{input.placeholder}</option>
          {input.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (input.type === "textarea") {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          {input.label}
          {input.required && <span className="ml-1 text-destructive">*</span>}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={input.placeholder}
          rows={3}
          className="w-full rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors resize-none"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        {input.label}
        {input.required && <span className="ml-1 text-destructive">*</span>}
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={input.placeholder}
      />
    </div>
  );
};

const ToolPage = () => {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = getToolById(toolId || "");
  const { user } = useAuth();
  const navigate = useNavigate();

  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  if (!tool) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-16">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">Tool not found</h1>
          <Link to="/dashboard" className="mt-4 inline-block text-primary hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const setField = (key: string, val: string) =>
    setInputValues((prev) => ({ ...prev, [key]: val }));

  const buildUserInput = () => {
    return tool.inputs
      .map((inp) => {
        const val = inputValues[inp.key]?.trim();
        if (!val) return null;
        return `${inp.label}: ${val}`;
      })
      .filter(Boolean)
      .join("\n");
  };

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Please sign in to generate content");
      navigate("/auth");
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
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          toolName: tool.name,
          toolPrompt: tool.prompt,
          userInput,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Generation failed" }));
        if (resp.status === 429) {
          toast.error("Rate limit reached — please wait a moment and try again.");
        } else if (resp.status === 402) {
          toast.error("AI credits exhausted. Please try again later.");
        } else {
          toast.error(err.error || "Something went wrong");
        }
        setLoading(false);
        return;
      }

      if (!resp.body) {
        toast.error("No response stream");
        setLoading(false);
        return;
      }

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
            if (content) {
              accumulated += content;
              setOutput(accumulated);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

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
            if (content) {
              accumulated += content;
              setOutput(accumulated);
            }
          } catch { /* ignore */ }
        }
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

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container max-w-3xl">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <tool.icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">{tool.name}</h1>
            <p className="text-sm text-muted-foreground">{tool.description}</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {tool.inputs.map((inp) => (
            <ToolInputField
              key={inp.key}
              input={inp}
              value={inputValues[inp.key] || ""}
              onChange={(val) => setField(inp.key, val)}
            />
          ))}

          <Button
            variant="hero"
            size="lg"
            className="mt-2 w-full"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate
              </>
            )}
          </Button>
        </div>

        {/* Output */}
        {(output || loading) && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6 animate-fade-up">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold">Output</h3>
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
            <div className="rounded-lg bg-background p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {output || (loading && <span className="text-muted-foreground animate-pulse">Generating…</span>)}
              {loading && output && <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-text-bottom rounded-sm" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolPage;
