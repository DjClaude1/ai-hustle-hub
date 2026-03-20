import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getToolById } from "@/data/tools";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Download, Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

const ToolPage = () => {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = getToolById(toolId || "");

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast.error("Please enter some input first");
      return;
    }
    setLoading(true);
    setOutput("");

    // Simulate AI generation (replace with real API call when backend is connected)
    await new Promise((r) => setTimeout(r, 2000));

    const mockOutput = generateMockOutput(tool.name, input);
    setOutput(mockOutput);
    setLoading(false);
    toast.success("Generated successfully!");
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

        {/* Input */}
        <div className="rounded-xl border border-border bg-card p-6">
          <label className="block text-sm font-medium mb-2">{tool.inputLabel}</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tool.inputPlaceholder}
            className="w-full rounded-lg border border-border bg-background p-4 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors resize-none"
            rows={4}
          />
          <Button
            variant="hero"
            size="lg"
            className="mt-4 w-full"
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
        {output && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6 animate-fade-up">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold">Output</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              </div>
            </div>
            <div className="rounded-lg bg-background p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {output}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function generateMockOutput(toolName: string, input: string): string {
  return `# ${toolName} — Generated Output

Based on your input: "${input}"

---

## Overview
This is a demo output. Connect Lovable Cloud to enable real AI-powered generation using the Lovable AI gateway.

## Key Points
• Point 1: Tailored specifically to "${input}"
• Point 2: Optimized for maximum impact and engagement
• Point 3: Ready to copy, customize, and deploy

## Next Steps
1. Review and refine the output above
2. Customize it to match your brand voice
3. Deploy it across your channels

## Pro Tip
Upgrade to Premium for unlimited generations, faster processing, and access to advanced tools.

---
Generated by AI Hustle Studio`;
}

export default ToolPage;
