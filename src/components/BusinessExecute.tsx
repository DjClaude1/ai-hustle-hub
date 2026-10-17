import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe, BookOpen, Loader2, Download, ExternalLink, Rocket, Lock } from "lucide-react";
import { DownloadMenu } from "@/components/DownloadMenu";
import { ProductPreview } from "@/components/ProductPreview";

interface Props { plan: string; hasAccess: boolean; onUpgrade: () => void }
type Kind = "landing" | "product";

const cleanHtml = (s: string) => s.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "");

export const BusinessExecute = ({ plan, hasAccess, onUpgrade }: Props) => {
  const [landing, setLanding] = useState("");
  const [product, setProduct] = useState("");
  const [busy, setBusy] = useState<Kind | null>(null);
  const [tab, setTab] = useState<Kind>("landing");

  const run = async (kind: Kind) => {
    setBusy(kind); setTab(kind);
    const set = kind === "landing" ? setLanding : setProduct;
    set("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/business-execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ kind, plan }),
      });
      if (!resp.ok || !resp.body) {
        const b = await resp.json().catch(() => ({}));
        if (b.code === "UPGRADE_REQUIRED") { onUpgrade(); return; }
        throw new Error(b.error || "Generation failed");
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        set(kind === "landing" ? cleanHtml(text) : text);
      }
      if (!text.trim()) throw new Error("The AI returned nothing — try again");
      toast.success(kind === "landing" ? "Landing page built!" : "Product created!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setBusy(null); }
  };

  const downloadHtml = () => {
    const url = URL.createObjectURL(new Blob([landing], { type: "text/html" }));
    const a = document.createElement("a"); a.href = url; a.download = "landing-page.html"; a.click();
    URL.revokeObjectURL(url);
  };
  const openHtml = () => {
    const url = URL.createObjectURL(new Blob([landing], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="mt-6 rounded-xl border border-primary/30 bg-card p-5 shadow-soft animate-fade-up">
      <div className="flex items-center gap-2">
        <Rocket className="h-5 w-5 text-primary" />
        <h3 className="font-display text-base font-semibold text-foreground">Execute this business</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Turn the plan into real assets: a ready-to-share landing page and the actual product you sell.</p>

      {!hasAccess ? (
        <div className="mt-4 flex items-center gap-3">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <Button onClick={onUpgrade}>Unlock on Pro</Button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => run("landing")} disabled={!!busy}>
              {busy === "landing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Build landing page
            </Button>
            <Button variant="outline" onClick={() => run("product")} disabled={!!busy}>
              {busy === "product" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />} Create the product
            </Button>
          </div>

          {(landing || product) && (
            <div className="mt-4 flex gap-1 border-b border-border">
              {(["landing", "product"] as Kind[]).filter((k) => (k === "landing" ? landing : product)).map((k) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`px-3 py-2 text-sm ${tab === k ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>
                  {k === "landing" ? "Landing page" : "Product"}
                </button>
              ))}
            </div>
          )}

          {tab === "landing" && landing && (
            <div className="mt-3">
              <div className="mb-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={downloadHtml} disabled={busy === "landing"}><Download className="h-4 w-4" /> Download HTML</Button>
                <Button size="sm" variant="outline" onClick={openHtml} disabled={busy === "landing"}><ExternalLink className="h-4 w-4" /> Open full page</Button>
              </div>
              <iframe title="Landing page preview" srcDoc={landing} sandbox="allow-same-origin"
                className="h-[640px] w-full rounded-lg border border-border bg-background" />
            </div>
          )}

          {tab === "product" && product && (
            <div className="mt-3">
              <div className="mb-2"><DownloadMenu content={product} filename="digital-product" /></div>
              <div className="max-h-[700px] overflow-auto rounded-lg border border-border">
                <ProductPreview toolId="ebook-generator" category="Digital Products" toolName="Digital Product" output={product} inputs={{}} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
