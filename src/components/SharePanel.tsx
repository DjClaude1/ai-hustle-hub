import { useState } from "react";
import { ChevronDown, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ToolCategory } from "@/data/tools";
import { buildFallbackSocialCaption, isAiCreditsError } from "@/lib/aiFallbacks";

const PLATFORMS = [
  { id: "twitter", label: "X / Twitter", icon: "𝕏", url: (txt: string, url: string) => `https://twitter.com/intent/tweet?text=${enc(txt)}&url=${enc(url)}` },
  { id: "linkedin", label: "LinkedIn", icon: "in", url: (txt: string, url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}&summary=${enc(txt)}` },
  { id: "facebook", label: "Facebook", icon: "f", url: (txt: string, url: string) => `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(txt)}` },
  { id: "reddit", label: "Reddit", icon: "●", url: (txt: string, url: string) => `https://reddit.com/submit?url=${enc(url)}&title=${enc(txt.slice(0, 300))}` },
  { id: "whatsapp", label: "WhatsApp", icon: "✉", url: (txt: string, url: string) => `https://wa.me/?text=${enc(txt + " " + url)}` },
  { id: "telegram", label: "Telegram", icon: "✈", url: (txt: string, url: string) => `https://t.me/share/url?url=${enc(url)}&text=${enc(txt)}` },
  { id: "instagram", label: "Instagram", icon: "📷", url: () => null },
  { id: "tiktok", label: "TikTok", icon: "♪", url: () => null },
];

const enc = (s: string) => encodeURIComponent(s);

const CAT_HASHTAGS: Record<string, string[]> = {
  "Product Creation": ["#digitalproducts", "#passiveincome", "#onlinebusiness", "#sidehustle", "#entrepreneur"],
  "Dropshipping": ["#dropshipping", "#ecommerce", "#shopify", "#onlinestore", "#productresearch"],
  "Marketing": ["#marketing", "#digitalmarketing", "#contentmarketing", "#growthhacking", "#marketingtips"],
  "Content Creation": ["#contentcreator", "#videocontent", "#creatorseconomy", "#contentideas", "#socialmediastrategy"],
  "Freelancing": ["#freelancing", "#remotework", "#freelancer", "#workfromhome", "#fiverr"],
  "Automation": ["#automation", "#aibusiness", "#startuplife", "#businessstrategy", "#sidehustle"],
};
const GENERIC_TAGS = ["#AItools", "#AIhustle", "#makemoneyonline", "#hustle"];

interface SharePanelProps {
  toolName: string;
  category: ToolCategory;
  output: string;
}

export const SharePanel = ({ toolName, category, output }: SharePanelProps) => {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [loadingCap, setLoadingCap] = useState(false);
  const [copiedCap, setCopiedCap] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const hashtags = [...(CAT_HASHTAGS[category] || []), ...GENERIC_TAGS];
  const shareUrl = typeof window !== "undefined" ? window.location.href : "https://aihustlestudio.com";

  const genCaption = async () => {
    if (!output) {
      toast.error("Generate content first, then create a caption.");
      return;
    }
    setLoadingCap(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-caption", {
        body: {
          type: "social-caption",
          toolName,
          output: output.slice(0, 600),
        },
      });
      if (error) throw error;
      if (data?.caption) setCaption(data.caption);
    } catch {
      toast.error("Caption generation failed — type one manually.");
    } finally {
      setLoadingCap(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const fullCaption = caption + (selectedTags.length ? "\n\n" + selectedTags.join(" ") : "");
  const charCount = fullCaption.length;

  const copyCaption = () => {
    navigator.clipboard.writeText(fullCaption);
    setCopiedCap(true);
    toast.success("Caption copied!");
    setTimeout(() => setCopiedCap(false), 2000);
  };

  const openPlatform = (platform: (typeof PLATFORMS)[0]) => {
    if (!caption.trim()) {
      toast.error("Write or generate a caption first.");
      return;
    }
    if (platform.id === "instagram" || platform.id === "tiktok") {
      navigator.clipboard.writeText(fullCaption);
      toast.success(`Caption copied! Open the ${platform.label} app to post 📱`);
      return;
    }
    const url = platform.url(fullCaption, shareUrl);
    if (url) window.open(url, "_blank", "width=600,height=500,noopener");
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-card shadow-soft overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-secondary/30 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-base">📤</span> Share to Social Media
          {output && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary">
              READY
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-border pt-4">
          {/* Caption editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground">Caption</span>
              <button
                onClick={genCaption}
                disabled={loadingCap || !output}
                className="text-xs font-semibold text-primary bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-full hover:bg-primary/20 transition-all disabled:opacity-50"
              >
                {loadingCap ? "✦ Writing…" : "✦ AI Write Caption"}
              </button>
            </div>
            <textarea
              className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              rows={3}
              placeholder="Write your caption here, or click ✦ AI Write Caption to generate one from your output…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className={`text-xs ${charCount > 280 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {charCount}/280 {charCount > 280 ? "⚠ over Twitter limit" : "chars"}
              </span>
              <Button variant="outline" size="sm" onClick={copyCaption}>
                {copiedCap ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedCap ? "Copied" : "Copy caption"}
              </Button>
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground mb-2 block">
              Hashtags <span className="font-normal opacity-70">(tap to add)</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {hashtags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    selectedTags.includes(tag)
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {selectedTags.includes(tag) ? "✓ " : ""}
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Platform buttons */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground mb-2.5 block">Share to</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openPlatform(p)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold border border-border bg-background text-foreground hover:bg-secondary transition-all"
                >
                  <span className="text-sm">{p.icon}</span>
                  {p.label}
                  {(p.id === "instagram" || p.id === "tiktok") && (
                    <span className="text-[9px] opacity-50 ml-auto">copy</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="text-xs text-muted-foreground rounded-lg bg-secondary/50 p-3 space-y-1">
            <div className="font-semibold text-foreground mb-1">📌 Platform limits</div>
            <div><strong>𝕏 X/Twitter:</strong> 280 chars</div>
            <div><strong>in LinkedIn:</strong> 3,000 chars</div>
            <div><strong>f Facebook:</strong> 63,206 chars</div>
            <div className="mt-1.5"><strong>📱 Instagram & TikTok:</strong> No web share — caption is copied to clipboard. Open the app and paste.</div>
          </div>
        </div>
      )}
    </div>
  );
};
