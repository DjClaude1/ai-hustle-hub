import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText, BookOpen, Mail, Globe, Film, Megaphone,
  Briefcase, ShoppingBag, Tag, Eye, Code2,
} from "lucide-react";
import { ResumeTemplateRender } from "@/components/resumeTemplateStyles";

interface ProductPreviewProps {
  toolId: string;
  category: string;
  toolName: string;
  output: string;
  inputs?: Record<string, string>;
  templateId?: string;
}

type PreviewMode = "preview" | "raw";

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

// Strip stray markdown for "raw" plain rendering of leaf text
const cleanInline = (s: string) => s.replace(/[*_`#>]/g, "").trim();

// Split output into chapters/sections by heading markers
const splitSections = (text: string) => {
  const lines = text.split("\n");
  const sections: { title: string; body: string }[] = [];
  let current: { title: string; body: string } | null = null;
  for (const line of lines) {
    const m =
      line.match(/^#{1,3}\s+(.+)/) ||
      line.match(/^(Chapter\s+\d+[:.\s].*)/i) ||
      line.match(/^(Scene\s+\d+[:.\s].*)/i) ||
      line.match(/^(Section\s+\d+[:.\s].*)/i);
    if (m) {
      if (current) sections.push(current);
      current = { title: cleanInline(m[1]), body: "" };
    } else {
      if (!current) current = { title: "", body: "" };
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections.filter((s) => s.title || s.body.trim());
};

// Markdown content renderer with consistent prose styling
const Prose = ({ children }: { children: string }) => (
  <div className="prose-content text-[14px] leading-relaxed text-foreground [&>p]:mb-3 [&>ul]:my-3 [&>ul]:pl-5 [&>ul]:list-disc [&>ol]:my-3 [&>ol]:pl-5 [&>ol]:list-decimal [&_li]:mb-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_h1]:font-display [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_a]:text-primary [&_a]:underline [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-secondary [&_th]:font-semibold [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-2 [&_hr]:my-4 [&_hr]:border-border">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
  </div>
);

/* ──────────────────────────────────────────────
   Layout: Resume / Cover Letter (paper sheet)
   ────────────────────────────────────────────── */
const PaperSheet = ({ output, label }: { output: string; label: string }) => (
  <div className="bg-white text-slate-900 rounded-lg border border-border shadow-elevated max-w-[760px] mx-auto overflow-hidden">
    <div className="bg-slate-50 border-b border-slate-200 px-5 py-2 text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
      <FileText className="h-3 w-3" /> {label} · A4 Preview
    </div>
    <div className="p-10 sm:p-14 font-serif" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <div className="prose-resume text-[13px] leading-[1.7] text-slate-800 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:tracking-tight [&>h1]:text-slate-900 [&>h1]:mb-1 [&>h1]:border-b [&>h1]:border-slate-300 [&>h1]:pb-2 [&>h2]:text-[13px] [&>h2]:font-bold [&>h2]:uppercase [&>h2]:tracking-wider [&>h2]:text-slate-700 [&>h2]:mt-5 [&>h2]:mb-2 [&>h2]:border-b [&>h2]:border-slate-200 [&>h2]:pb-1 [&>h3]:text-[13px] [&>h3]:font-semibold [&>h3]:text-slate-800 [&>h3]:mt-3 [&>h3]:mb-1 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ul>li]:mb-1 [&_strong]:text-slate-900">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
      </div>
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   Layout: eBook / PDF Guide / Business Plan (book pages)
   ────────────────────────────────────────────── */
const BookPages = ({ output, title }: { output: string; title: string }) => {
  const sections = useMemo(() => splitSections(output), [output]);
  const cover = sections[0];
  const chapters = sections.length > 1 ? sections.slice(1) : sections;

  return (
    <div className="space-y-6 max-w-[760px] mx-auto">
      {/* Cover */}
      <div className="rounded-lg overflow-hidden shadow-elevated border border-border">
        <div className="bg-gradient-to-br from-primary via-primary/80 to-accent p-12 text-center text-primary-foreground min-h-[260px] flex flex-col items-center justify-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-70 mb-3">eBook</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight max-w-md">
            {cleanInline(cover?.title || title)}
          </h1>
          <div className="mt-6 h-px w-16 bg-primary-foreground/40" />
          <div className="mt-3 text-xs opacity-80">A digital publication</div>
        </div>
      </div>

      {/* Table of contents */}
      {chapters.length > 1 && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Table of Contents</div>
          <ol className="space-y-1.5 text-sm">
            {chapters.map((c, i) => (
              <li key={i} className="flex items-baseline gap-2 text-foreground">
                <span className="font-mono text-xs text-muted-foreground w-6">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 truncate">{c.title || `Chapter ${i + 1}`}</span>
                <span className="font-mono text-xs text-muted-foreground">{i + 2}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Chapter pages */}
      {chapters.map((c, i) => (
        <div key={i} className="bg-white text-slate-900 rounded-lg border border-border shadow-soft overflow-hidden" style={{ fontFamily: "Georgia, serif" }}>
          <div className="px-10 sm:px-14 pt-10 pb-12">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-400 mb-2">
              Chapter {i + 1}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 leading-tight">
              {c.title || `Chapter ${i + 1}`}
            </h2>
            <div className="text-[14px] leading-[1.85] text-slate-800 [&>p]:mb-4 [&>p:first-of-type]:first-letter:text-5xl [&>p:first-of-type]:first-letter:font-bold [&>p:first-of-type]:first-letter:float-left [&>p:first-of-type]:first-letter:mr-2 [&>p:first-of-type]:first-letter:leading-none [&>p:first-of-type]:first-letter:text-primary [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:my-3 [&_strong]:text-slate-900 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-5 [&_h3]:mb-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.body.trim()}</ReactMarkdown>
            </div>
            <div className="mt-10 pt-4 border-t border-slate-200 text-center text-xs font-mono text-slate-400">
              — {i + 2} —
            </div>
          </div>
        </div>
      ))}

      {chapters.length === 0 && cover && (
        <div className="bg-white text-slate-900 rounded-lg border border-border p-10 shadow-soft" style={{ fontFamily: "Georgia, serif" }}>
          <Prose>{cover.body}</Prose>
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────
   Layout: Email mockup
   ────────────────────────────────────────────── */
const EmailMock = ({ output, inputs }: { output: string; inputs?: Record<string, string> }) => {
  // Try to detect Subject line at top
  const lines = output.split("\n");
  const subjectIdx = lines.findIndex((l) => /^subject\s*[:\-]/i.test(l));
  let subject = inputs?.subject || inputs?.topic || "Your message from us";
  let body = output;
  if (subjectIdx >= 0) {
    subject = lines[subjectIdx].replace(/^subject\s*[:\-]\s*/i, "").trim();
    body = lines.slice(subjectIdx + 1).join("\n").trim();
  }
  const sender = inputs?.brand || inputs?.business || inputs?.company || "Your Brand";
  return (
    <div className="bg-card border border-border rounded-lg shadow-elevated max-w-[680px] mx-auto overflow-hidden">
      <div className="bg-secondary/60 border-b border-border px-5 py-3 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Mail className="h-3 w-3" /> Inbox
        </div>
      </div>
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm">
            {sender.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{sender}</div>
            <div className="text-xs text-muted-foreground">to me · just now</div>
          </div>
        </div>
        <h2 className="font-display text-lg font-bold text-foreground leading-tight">{subject}</h2>
      </div>
      <div className="px-6 py-5 bg-background">
        <Prose>{body}</Prose>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────
   Layout: Web page mockup (sales/landing/product)
   ────────────────────────────────────────────── */
const WebPageMock = ({ output, toolName }: { output: string; toolName: string }) => {
  const sections = useMemo(() => splitSections(output), [output]);
  return (
    <div className="bg-card border border-border rounded-lg shadow-elevated max-w-[860px] mx-auto overflow-hidden">
      {/* Browser chrome */}
      <div className="bg-secondary/60 border-b border-border px-4 py-2.5 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-background border border-border rounded-md px-3 py-1 text-xs text-muted-foreground flex items-center gap-1.5">
          <Globe className="h-3 w-3" /> yourbrand.com
        </div>
      </div>
      {/* Page content */}
      <div className="bg-background">
        {sections.map((s, i) => (
          <section
            key={i}
            className={`px-8 sm:px-12 py-10 ${i === 0 ? "bg-gradient-to-br from-primary/5 via-background to-accent/5 text-center" : ""} ${i > 0 ? "border-t border-border" : ""}`}
          >
            {s.title && (
              <h2 className={`font-display font-bold text-foreground mb-4 leading-tight ${i === 0 ? "text-3xl sm:text-4xl" : "text-2xl"}`}>
                {s.title}
              </h2>
            )}
            <div className={i === 0 ? "max-w-xl mx-auto" : ""}>
              <Prose>{s.body.trim()}</Prose>
            </div>
            {i === 0 && (
              <button className="mt-5 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold text-sm shadow-soft hover:opacity-90 transition" type="button">
                Get Started →
              </button>
            )}
          </section>
        ))}
        <div className="px-8 py-6 border-t border-border bg-secondary/30 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {toolName} preview · Generated by AI Hustle Studio
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────
   Layout: Script (YouTube/TikTok/Faceless video)
   ────────────────────────────────────────────── */
const ScriptMock = ({ output, toolName }: { output: string; toolName: string }) => {
  const scenes = useMemo(() => {
    const split = output.split(/\n(?=(?:scene|hook|intro|outro|cta|step)\s*\d*\s*[:\-])/i);
    return split.map((chunk) => {
      const firstLine = chunk.split("\n")[0];
      const titleMatch = firstLine.match(/^(scene|hook|intro|outro|cta|step)\s*\d*\s*[:\-]\s*(.*)/i);
      if (titleMatch) {
        const label = `${titleMatch[1].toUpperCase()}${titleMatch[0].match(/\d+/) ? " " + titleMatch[0].match(/\d+/)![0] : ""}`;
        return { label, headline: titleMatch[2] || "", body: chunk.split("\n").slice(1).join("\n") };
      }
      return { label: "INTRO", headline: "", body: chunk };
    }).filter((s) => s.body.trim() || s.headline);
  }, [output]);

  const list = scenes.length ? scenes : [{ label: "SCRIPT", headline: toolName, body: output }];

  return (
    <div className="space-y-3 max-w-[760px] mx-auto">
      <div className="bg-card border border-border rounded-lg p-4 shadow-soft flex items-center gap-3">
        <Film className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Production-ready script</div>
          <div className="font-display font-semibold text-foreground text-sm">{toolName}</div>
        </div>
        <div className="text-xs font-mono text-muted-foreground">{list.length} scenes</div>
      </div>
      {list.map((s, i) => (
        <div key={i} className="bg-card border border-border rounded-lg overflow-hidden shadow-soft">
          <div className="bg-foreground text-background px-4 py-2 flex items-center gap-3">
            <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-background/20">
              {s.label}
            </span>
            {s.headline && <span className="text-sm font-semibold truncate">{cleanInline(s.headline)}</span>}
          </div>
          <div className="p-4 bg-background">
            <Prose>{s.body.trim()}</Prose>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ──────────────────────────────────────────────
   Layout: Social post / Ad copy
   ────────────────────────────────────────────── */
const SocialCard = ({ output, toolName }: { output: string; toolName: string }) => {
  // Each blank-line separated chunk is a variant
  const variants = output.split(/\n\s*\n/).filter((s) => s.trim()).slice(0, 8);
  return (
    <div className="grid sm:grid-cols-2 gap-4 max-w-[760px] mx-auto">
      {variants.map((v, i) => {
        const tags = (v.match(/#\w+/g) || []).slice(0, 6);
        const body = v.replace(/#\w+/g, "").trim();
        return (
          <div key={i} className="bg-card border border-border rounded-xl overflow-hidden shadow-soft hover:shadow-elevated transition">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-xs">
                {String.fromCharCode(65 + i)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground">@yourhandle</div>
                <div className="text-[10px] text-muted-foreground">Variant {i + 1} · {toolName}</div>
              </div>
              <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="p-4">
              <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{body}</div>
              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="text-xs text-primary font-medium">{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span>♡ Like</span>
              <span>↻ Repost</span>
              <span>↗ Share</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ──────────────────────────────────────────────
   Layout: Fiverr Gig
   ────────────────────────────────────────────── */
const GigMock = ({ output, inputs }: { output: string; inputs?: Record<string, string> }) => (
  <div className="bg-card border border-border rounded-lg shadow-elevated max-w-[760px] mx-auto overflow-hidden">
    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-4 w-4" />
        <span className="font-bold text-sm">Gig Listing Preview</span>
      </div>
      <span className="text-[10px] font-mono uppercase tracking-wider opacity-80">{inputs?.category || "Service"}</span>
    </div>
    <div className="p-6">
      <Prose>{output}</Prose>
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   Layout: Names list (store/business names)
   ────────────────────────────────────────────── */
const NamesGrid = ({ output }: { output: string }) => {
  const names = output
    .split("\n")
    .map((l) => l.replace(/^[\s\d.\-*•)]+/, "").trim())
    .filter((l) => l.length > 1 && l.length < 80)
    .slice(0, 30);
  if (names.length < 3) return <div className="bg-card border border-border rounded-lg p-6"><Prose>{output}</Prose></div>;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-[860px] mx-auto">
      {names.map((n, i) => {
        // Split "Name — tagline" if present
        const parts = n.split(/\s*[—–\-:]\s*/);
        const name = parts[0];
        const tagline = parts.slice(1).join(" — ");
        return (
          <div key={i} className="bg-card border border-border rounded-lg p-4 shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition">
            <div className="flex items-start gap-2">
              <Tag className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-foreground text-base leading-tight">{name}</div>
                {tagline && <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{tagline}</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ──────────────────────────────────────────────
   Layout: Product description / Listing
   ────────────────────────────────────────────── */
const ProductListing = ({ output, inputs }: { output: string; inputs?: Record<string, string> }) => (
  <div className="bg-card border border-border rounded-lg shadow-elevated max-w-[760px] mx-auto overflow-hidden">
    <div className="bg-secondary/60 border-b border-border px-4 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
      <ShoppingBag className="h-3 w-3" /> Product Listing Preview
    </div>
    <div className="grid sm:grid-cols-[200px_1fr] gap-0">
      <div className="bg-gradient-to-br from-primary/10 to-accent/10 aspect-square sm:aspect-auto flex items-center justify-center text-5xl">
        📦
      </div>
      <div className="p-5">
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
          {inputs?.niche || inputs?.category || "Product"}
        </div>
        <Prose>{output}</Prose>
      </div>
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   Layout: Generic markdown article (default)
   ────────────────────────────────────────────── */
const ArticleMock = ({ output, toolName }: { output: string; toolName: string }) => (
  <article className="bg-card border border-border rounded-lg p-6 sm:p-8 shadow-soft max-w-[760px] mx-auto">
    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
      {toolName}
    </div>
    <Prose>{output}</Prose>
  </article>
);

/* ──────────────────────────────────────────────
   Main dispatcher
   ────────────────────────────────────────────── */
const renderForTool = (
  toolId: string,
  category: string,
  toolName: string,
  output: string,
  inputs?: Record<string, string>,
) => {
  if (toolId === "resume-builder") return <PaperSheet output={output} label="Resume" />;
  if (toolId === "cover-letter") return <PaperSheet output={output} label="Cover Letter" />;
  if (["ebook-generator", "pdf-guide-creator", "course-generator", "business-plan", "notion-template-generator", "digital-planner-generator"].includes(toolId)) {
    return <BookPages output={output} title={toolName} />;
  }
  if (toolId === "email-marketing") return <EmailMock output={output} inputs={inputs} />;
  if (["sales-page", "landing-page-copy", "product-page-builder"].includes(toolId)) {
    return <WebPageMock output={output} toolName={toolName} />;
  }
  if (["youtube-script", "tiktok-script", "faceless-video"].includes(toolId)) {
    return <ScriptMock output={output} toolName={toolName} />;
  }
  if (["ad-copy", "tiktok-hook", "thumbnail-text"].includes(toolId)) {
    return <SocialCard output={output} toolName={toolName} />;
  }
  if (toolId === "fiverr-gig") return <GigMock output={output} inputs={inputs} />;
  if (toolId === "upwork-proposal") return <PaperSheet output={output} label="Proposal" />;
  if (["store-name", "business-name", "ai-startup", "side-hustle-idea"].includes(toolId)) {
    return <NamesGrid output={output} />;
  }
  if (["product-description", "product-research", "competitor-analyzer"].includes(toolId)) {
    return <ProductListing output={output} inputs={inputs} />;
  }
  return <ArticleMock output={output} toolName={toolName} />;
};

const previewLabel = (toolId: string) => {
  if (toolId === "resume-builder" || toolId === "cover-letter" || toolId === "upwork-proposal") return "Document Preview";
  if (["ebook-generator", "pdf-guide-creator", "course-generator", "business-plan"].includes(toolId)) return "Book Preview";
  if (toolId === "email-marketing") return "Email Preview";
  if (["sales-page", "landing-page-copy", "product-page-builder"].includes(toolId)) return "Web Page Preview";
  if (["youtube-script", "tiktok-script", "faceless-video"].includes(toolId)) return "Script Preview";
  if (["ad-copy", "tiktok-hook", "thumbnail-text"].includes(toolId)) return "Social Post Preview";
  if (toolId === "fiverr-gig") return "Gig Preview";
  if (["store-name", "business-name"].includes(toolId)) return "Names Preview";
  if (["product-description", "product-research"].includes(toolId)) return "Listing Preview";
  return "Live Preview";
};

export const ProductPreview = ({ toolId, category, toolName, output, inputs }: ProductPreviewProps) => {
  const [mode, setMode] = useState<PreviewMode>("preview");

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          {mode === "preview" ? <Eye className="h-3 w-3" /> : <Code2 className="h-3 w-3" />}
          {mode === "preview" ? previewLabel(toolId) : "Raw Output"}
        </div>
        <div className="inline-flex rounded-lg border border-border bg-background p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`px-3 py-1 rounded-md font-medium transition ${
              mode === "preview" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setMode("raw")}
            className={`px-3 py-1 rounded-md font-medium transition ${
              mode === "raw" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Raw
          </button>
        </div>
      </div>

      {/* Content */}
      {mode === "preview" ? (
        <div className="rounded-xl border border-border bg-secondary/20 p-4 sm:p-6 overflow-x-auto">
          {renderForTool(toolId, category, toolName, output, inputs)}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-secondary/50 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap font-mono max-h-[600px] overflow-y-auto">
          {output}
        </div>
      )}
    </div>
  );
};
