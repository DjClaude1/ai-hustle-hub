import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, X, Download, ZoomIn, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { buildOfflineImagePrompt, isAiCreditsError } from "@/lib/aiFallbacks";

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-caption`;

const IMG_STYLES = [
  { id: "photo", label: "Photorealistic", icon: "📷", hint: "ultra-realistic photography, 8k, sharp detail" },
  { id: "flat", label: "Flat / Minimal", icon: "🎨", hint: "flat design, minimal, clean vector illustration" },
  { id: "3d", label: "3D Render", icon: "💎", hint: "3D render, cinema 4d, studio lighting, glossy" },
  { id: "cartoon", label: "Illustrated", icon: "✏️", hint: "hand-drawn illustration, editorial art style" },
  { id: "cinematic", label: "Cinematic", icon: "🎬", hint: "cinematic still, anamorphic lens, color graded" },
  { id: "neon", label: "Neon / Cyber", icon: "⚡", hint: "cyberpunk neon glow, dark background, vivid colors" },
];

const IMG_SIZES = [
  { id: "1024x1024", label: "Square", dim: "1024×1024", icon: "⬛", hint: "Social media post" },
  { id: "1792x1024", label: "Landscape", dim: "1792×1024", icon: "▬", hint: "YouTube / banner" },
  { id: "1024x1792", label: "Portrait", dim: "1024×1792", icon: "▮", hint: "TikTok / Story" },
  { id: "1280x720", label: "HD Wide", dim: "1280×720", icon: "🖥", hint: "Presentation / slides" },
];

const USE_CASES = [
  "eBook Cover", "Course Banner", "Product Photo", "Ad Creative",
  "Social Media Post", "YouTube Thumbnail", "Brand Logo Concept", "Blog Featured Image",
  "Email Header", "Landing Page Hero",
];

interface GeneratedImage {
  id: number;
  url: string;
  prompt: string;
  style: string;
  size: string;
  dim: string;
  imgLoading: boolean;
  imgFailed: boolean;
}

const ImageGeneratorPage = () => {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("photo");
  const [sizeId, setSizeId] = useState("1024x1024");
  const [useCase, setUseCase] = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [batchCount, setBatchCount] = useState(1);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const { user, session } = useAuth();

  const selStyle = IMG_STYLES.find((s) => s.id === style)!;
  const selSize = IMG_SIZES.find((s) => s.id === sizeId)!;

  const aiPrompt = async () => {
    if (!useCase && !prompt.trim()) {
      toast.error("Pick a use case or type a topic first.");
      return;
    }
    if (!user) {
      toast.error("Sign in to use AI prompt writing.");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("generate-caption", {
        body: {
          type: "image-prompt",
          context: useCase || prompt,
          style: selStyle.label,
          useCase: useCase || "general digital product",
        },
      });
      if (error) throw error;
      if (data?.caption) {
        setPrompt(data.caption);
        toast.success("Prompt written!");
      }
    } catch {
      toast.error("AI prompt failed — type one manually.");
    }
  };

  const generate = () => {
    if (!prompt.trim()) {
      toast.error("Enter a prompt first.");
      return;
    }
    setGenerating(true);
    const [w, h] = selSize.dim.replace("×", "x").split("x").map(Number);
    const hint = selStyle.hint;
    const neg = negPrompt.trim() ? `, avoid: ${negPrompt}` : "";
    const fullP = `${prompt}, ${hint}${neg}`;

    const newImgs: GeneratedImage[] = Array.from({ length: batchCount }, (_, i) => {
      const seed = Math.floor(Math.random() * 999999);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullP)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;
      return {
        id: Date.now() + i,
        url,
        prompt: fullP,
        style: selStyle.label,
        size: selSize.label,
        dim: selSize.dim,
        imgLoading: true,
        imgFailed: false,
      };
    });

    setImages((prev) => [...newImgs, ...prev]);
  };

  const onImgLoad = (id: number) => {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, imgLoading: false } : img)));
    setGenerating(false);
    toast.success("Image ready!");
  };

  const onImgError = (id: number) => {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, imgLoading: false, imgFailed: true } : img)));
    setGenerating(false);
    toast.error("Image failed — try regenerating.");
  };

  const openImg = (url: string) => {
    window.open(url, "_blank");
    toast.success("Opened — right-click to save!");
  };

  const removeImg = (id: number) => setImages((prev) => prev.filter((img) => img.id !== id));

  const base = "w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <>
      <div className="min-h-screen pt-20 pb-16 bg-background">
        <div className="container max-w-5xl">
          <Link
            to="/dashboard"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-2xl">
              🎨
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">AI Image Generator</h1>
              <p className="text-sm text-muted-foreground">Generate stunning images for covers, ads, banners & social media</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* Left: Controls */}
            <div className="lg:col-span-2 space-y-4">
              {/* Use case chips */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
                <label className="mb-2.5 block text-sm font-medium text-foreground">Use Case</label>
                <div className="flex flex-wrap gap-2">
                  {USE_CASES.map((uc) => (
                    <button
                      key={uc}
                      onClick={() => setUseCase(useCase === uc ? "" : uc)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        useCase === uc
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {uc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Prompt</label>
                  <button
                    onClick={aiPrompt}
                    className="text-xs font-semibold text-primary bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-full hover:bg-primary/20 transition-all"
                  >
                    ✦ AI Write
                  </button>
                </div>
                <textarea
                  className={`${base} resize-none`}
                  rows={4}
                  placeholder="Describe your image in detail… e.g. 'Sleek eBook cover for a personal finance guide, gold and dark blue, minimalist typography'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <div className="mt-3">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Negative Prompt (optional)</label>
                  <input
                    className={base}
                    type="text"
                    placeholder="e.g. blurry, watermark, text, low quality"
                    value={negPrompt}
                    onChange={(e) => setNegPrompt(e.target.value)}
                  />
                </div>
              </div>

              {/* Style */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
                <label className="mb-2.5 block text-sm font-medium text-foreground">Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {IMG_STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg text-xs font-semibold border transition-all ${
                        style === s.id
                          ? "border-accent/50 bg-accent/10 text-accent-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <span className="text-lg">{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
                <label className="mb-2.5 block text-sm font-medium text-foreground">Canvas Size</label>
                <div className="space-y-2">
                  {IMG_SIZES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSizeId(s.id)}
                      className={`flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium border transition-all text-left ${
                        sizeId === s.id
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <span className="text-lg min-w-[24px]">{s.icon}</span>
                      <span className="flex-1">{s.label} <span className="text-xs opacity-60">{s.dim}</span></span>
                      <span className="text-xs opacity-50">{s.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch count */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
                <label className="mb-2.5 block text-sm font-medium text-foreground">Batch Size</label>
                <div className="flex gap-2">
                  {[1, 2, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setBatchCount(n)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                        batchCount === n
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {n === 1 ? "1 image" : `${n} images`}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={generate}
                disabled={generating || !prompt.trim()}
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                ) : (
                  <>🎨 Generate {batchCount > 1 ? `${batchCount} Images` : "Image"}</>
                )}
              </Button>
            </div>

            {/* Right: Gallery */}
            <div className="lg:col-span-3 space-y-4">
              {images.length === 0 && (
                <div className="border border-dashed border-border rounded-xl p-16 text-center text-muted-foreground">
                  <div className="text-5xl mb-3">🎨</div>
                  <div className="font-display text-lg font-bold text-foreground mb-1">Your images will appear here</div>
                  <div className="text-sm">Configure your settings and hit Generate</div>
                </div>
              )}

              {images.map((img) => (
                <div
                  key={img.id}
                  className="rounded-xl border border-border bg-card shadow-soft overflow-hidden animate-fade-up"
                >
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                    <span className="text-xs text-muted-foreground">
                      {img.style} · {img.size} · {img.dim}
                    </span>
                    <div className="flex gap-2">
                      {!img.imgLoading && !img.imgFailed && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openImg(img.url)}>
                            <Download className="h-3.5 w-3.5" /> Save
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setLightbox(img.url)}>
                            <ZoomIn className="h-3.5 w-3.5" /> View
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => removeImg(img.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {img.imgLoading && (
                    <div className="aspect-square flex flex-col items-center justify-center gap-4 bg-secondary/50">
                      <Loader2 className="h-10 w-10 animate-spin text-primary/60" />
                      <span className="text-sm text-muted-foreground">Generating your image…</span>
                    </div>
                  )}

                  {img.imgFailed && (
                    <div className="p-8 text-center text-muted-foreground">
                      <div className="text-3xl mb-2">⚠️</div>
                      <div className="text-sm">Generation failed — try again</div>
                    </div>
                  )}

                  {!img.imgFailed && (
                    <img
                      src={img.url}
                      alt="AI generated"
                      className={`w-full cursor-zoom-in ${img.imgLoading ? "hidden" : "block"}`}
                      onLoad={() => onImgLoad(img.id)}
                      onError={() => onImgError(img.id)}
                      onClick={() => setLightbox(img.url)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightbox}
            alt="Full size"
            className="max-w-full max-h-[90vh] rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ImageGeneratorPage;
