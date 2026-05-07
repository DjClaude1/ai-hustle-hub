import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Per-template resume renderers. Each template has its own typography,
 * color accent, layout, and section styling so users see a distinct
 * "look" the moment they select a template.
 */

interface TemplateProps {
  output: string;
}

const Md = ({ children, className }: { children: string; className: string }) => (
  <div className={className}>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
  </div>
);

/* 1. Classic Professional — serif, conservative */
const ClassicProfessional = ({ output }: TemplateProps) => (
  <div className="bg-white text-slate-900 p-10 sm:p-14" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
    <Md
      children={output}
      className="text-[13px] leading-[1.7] text-slate-800 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:text-center [&>h1]:tracking-wide [&>h1]:uppercase [&>h1]:mb-1 [&>h1]:border-b-2 [&>h1]:border-slate-900 [&>h1]:pb-3 [&>h2]:text-[12px] [&>h2]:font-bold [&>h2]:uppercase [&>h2]:tracking-[0.2em] [&>h2]:text-slate-900 [&>h2]:mt-6 [&>h2]:mb-2 [&>h2]:border-b [&>h2]:border-slate-400 [&>h2]:pb-1 [&>h3]:text-[13px] [&>h3]:font-bold [&>h3]:italic [&>h3]:mt-3 [&>h3]:mb-1 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-3 [&>ul>li]:mb-1 [&_strong]:text-slate-900"
    />
  </div>
);

/* 2. Modern Minimal — sans-serif, generous whitespace, two-column feel */
const ModernMinimal = ({ output }: TemplateProps) => (
  <div className="bg-white text-slate-900 p-10 sm:p-14" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
    <Md
      children={output}
      className="text-[13px] leading-[1.8] text-slate-700 [&>h1]:text-4xl [&>h1]:font-light [&>h1]:tracking-tight [&>h1]:text-slate-900 [&>h1]:mb-2 [&>h2]:text-[11px] [&>h2]:font-semibold [&>h2]:uppercase [&>h2]:tracking-[0.25em] [&>h2]:text-slate-500 [&>h2]:mt-8 [&>h2]:mb-3 [&>h3]:text-[14px] [&>h3]:font-medium [&>h3]:text-slate-900 [&>h3]:mt-4 [&>h3]:mb-1 [&>p]:mb-3 [&>ul]:list-none [&>ul]:pl-0 [&>ul]:mb-3 [&>ul>li]:mb-1.5 [&>ul>li]:pl-4 [&>ul>li]:relative [&>ul>li]:before:content-['—'] [&>ul>li]:before:absolute [&>ul>li]:before:left-0 [&>ul>li]:before:text-slate-400 [&_strong]:font-semibold [&_strong]:text-slate-900"
    />
  </div>
);

/* 3. Tech & Engineering — monospace highlights, blue accent */
const TechFocused = ({ output }: TemplateProps) => (
  <div className="bg-white text-slate-900" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
    <div className="border-l-4 border-blue-600 p-10 sm:p-14">
      <Md
        children={output}
        className="text-[13px] leading-[1.7] text-slate-800 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:text-slate-900 [&>h1]:mb-1 [&>h2]:text-[12px] [&>h2]:font-bold [&>h2]:uppercase [&>h2]:tracking-wider [&>h2]:text-blue-700 [&>h2]:mt-6 [&>h2]:mb-2 [&>h2]:font-mono [&>h3]:text-[14px] [&>h3]:font-semibold [&>h3]:text-slate-900 [&>h3]:mt-4 [&>h3]:mb-1 [&>p]:mb-2 [&>ul]:list-none [&>ul]:pl-0 [&>ul]:mb-3 [&>ul>li]:mb-1 [&>ul>li]:pl-5 [&>ul>li]:relative [&>ul>li]:before:content-['▸'] [&>ul>li]:before:absolute [&>ul>li]:before:left-0 [&>ul>li]:before:text-blue-600 [&_code]:bg-blue-50 [&_code]:text-blue-700 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[12px] [&_strong]:text-slate-900"
      />
    </div>
  </div>
);

/* 4. Executive Suite — bold name, gold accent, authoritative */
const ExecutiveSuite = ({ output }: TemplateProps) => (
  <div className="bg-white text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>
    <div className="bg-slate-900 text-white px-10 sm:px-14 py-8">
      <div className="text-[10px] uppercase tracking-[0.4em] text-amber-400 mb-1">Executive Profile</div>
      <div className="h-px bg-amber-400 w-12" />
    </div>
    <div className="p-10 sm:p-14">
      <Md
        children={output}
        className="text-[13px] leading-[1.75] text-slate-800 [&>h1]:text-4xl [&>h1]:font-bold [&>h1]:text-slate-900 [&>h1]:tracking-tight [&>h1]:mb-3 [&>h2]:text-[12px] [&>h2]:font-bold [&>h2]:uppercase [&>h2]:tracking-[0.3em] [&>h2]:text-amber-700 [&>h2]:mt-7 [&>h2]:mb-3 [&>h2]:border-b [&>h2]:border-amber-200 [&>h2]:pb-1.5 [&>h3]:text-[14px] [&>h3]:font-bold [&>h3]:text-slate-900 [&>h3]:mt-4 [&>h3]:mb-1 [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-3 [&>ul>li]:mb-1.5 [&>ul>li]:marker:text-amber-600 [&_strong]:text-slate-900 [&_strong]:font-bold"
      />
    </div>
  </div>
);

/* 5. Creative Portfolio — bold colors, asymmetric, distinctive */
const CreativePortfolio = ({ output }: TemplateProps) => (
  <div className="bg-gradient-to-br from-pink-50 via-white to-purple-50 text-slate-900" style={{ fontFamily: "'Helvetica Neue', sans-serif" }}>
    <div className="grid grid-cols-[8px_1fr]">
      <div className="bg-gradient-to-b from-pink-500 via-purple-500 to-indigo-500" />
      <div className="p-10 sm:p-14">
        <Md
          children={output}
          className="text-[13px] leading-[1.7] text-slate-800 [&>h1]:text-5xl [&>h1]:font-black [&>h1]:tracking-tight [&>h1]:bg-gradient-to-r [&>h1]:from-pink-600 [&>h1]:via-purple-600 [&>h1]:to-indigo-600 [&>h1]:bg-clip-text [&>h1]:text-transparent [&>h1]:mb-3 [&>h2]:text-[14px] [&>h2]:font-black [&>h2]:uppercase [&>h2]:tracking-wider [&>h2]:text-purple-600 [&>h2]:mt-7 [&>h2]:mb-3 [&>h2]:flex [&>h2]:items-center [&>h2]:gap-2 [&>h2]:before:content-[''] [&>h2]:before:w-6 [&>h2]:before:h-1 [&>h2]:before:bg-pink-500 [&>h2]:before:rounded-full [&>h3]:text-[14px] [&>h3]:font-bold [&>h3]:text-slate-900 [&>h3]:mt-4 [&>h3]:mb-1 [&>p]:mb-3 [&>ul]:list-none [&>ul]:pl-0 [&>ul]:mb-3 [&>ul>li]:mb-1.5 [&>ul>li]:pl-5 [&>ul>li]:relative [&>ul>li]:before:content-['◆'] [&>ul>li]:before:absolute [&>ul>li]:before:left-0 [&>ul>li]:before:text-pink-500 [&_strong]:text-purple-700"
        />
      </div>
    </div>
  </div>
);

/* 6. Academic & Research — formal, dense, scholarly */
const AcademicResearch = ({ output }: TemplateProps) => (
  <div className="bg-white text-slate-900 p-10 sm:p-14" style={{ fontFamily: "'Garamond', 'Times New Roman', serif" }}>
    <Md
      children={output}
      className="text-[12.5px] leading-[1.65] text-slate-800 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:text-center [&>h1]:mb-1 [&>h1]:tracking-wide [&>h2]:text-[13px] [&>h2]:font-bold [&>h2]:uppercase [&>h2]:tracking-wider [&>h2]:text-slate-900 [&>h2]:mt-5 [&>h2]:mb-2 [&>h2]:border-b-2 [&>h2]:border-double [&>h2]:border-slate-700 [&>h2]:pb-1 [&>h3]:text-[13px] [&>h3]:font-bold [&>h3]:italic [&>h3]:mt-3 [&>h3]:mb-1 [&>p]:mb-2 [&>p]:text-justify [&>ul]:list-decimal [&>ul]:pl-6 [&>ul]:mb-3 [&>ul>li]:mb-1 [&_strong]:text-slate-900"
    />
  </div>
);

/* 7. Startup Disruptor — modern, metric-focused, vibrant */
const StartupDisruptor = ({ output }: TemplateProps) => (
  <div className="bg-white text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
    <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2" />
    <div className="p-10 sm:p-14">
      <Md
        children={output}
        className="text-[13px] leading-[1.7] text-slate-700 [&>h1]:text-4xl [&>h1]:font-extrabold [&>h1]:tracking-tight [&>h1]:text-slate-900 [&>h1]:mb-2 [&>h2]:text-[11px] [&>h2]:font-bold [&>h2]:uppercase [&>h2]:tracking-[0.2em] [&>h2]:text-emerald-700 [&>h2]:mt-7 [&>h2]:mb-3 [&>h2]:inline-block [&>h2]:bg-emerald-50 [&>h2]:px-3 [&>h2]:py-1 [&>h2]:rounded-full [&>h3]:text-[14px] [&>h3]:font-bold [&>h3]:text-slate-900 [&>h3]:mt-4 [&>h3]:mb-1 [&>p]:mb-2.5 [&>ul]:list-none [&>ul]:pl-0 [&>ul]:mb-3 [&>ul>li]:mb-1.5 [&>ul>li]:pl-6 [&>ul>li]:relative [&>ul>li]:before:content-['↗'] [&>ul>li]:before:absolute [&>ul>li]:before:left-0 [&>ul>li]:before:text-emerald-500 [&>ul>li]:before:font-bold [&_strong]:text-emerald-700 [&_strong]:font-bold"
      />
    </div>
  </div>
);

/* 8. Federal & Government — detailed, compliance-style */
const FederalGovernment = ({ output }: TemplateProps) => (
  <div className="bg-white text-slate-900 p-10 sm:p-14" style={{ fontFamily: "'Arial', sans-serif" }}>
    <div className="border-2 border-slate-700 p-6">
      <Md
        children={output}
        className="text-[12px] leading-[1.6] text-slate-800 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:uppercase [&>h1]:tracking-wide [&>h1]:text-slate-900 [&>h1]:mb-1 [&>h1]:text-center [&>h1]:bg-slate-100 [&>h1]:py-3 [&>h2]:text-[12px] [&>h2]:font-bold [&>h2]:uppercase [&>h2]:bg-slate-700 [&>h2]:text-white [&>h2]:px-3 [&>h2]:py-1.5 [&>h2]:mt-5 [&>h2]:mb-3 [&>h3]:text-[13px] [&>h3]:font-bold [&>h3]:text-slate-900 [&>h3]:mt-3 [&>h3]:mb-1 [&>h3]:underline [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-3 [&>ul>li]:mb-1 [&_strong]:text-slate-900 [&_strong]:underline"
      />
    </div>
  </div>
);

/* 9. Career Transition — functional, skills-grouped */
const CareerChanger = ({ output }: TemplateProps) => (
  <div className="bg-white text-slate-900" style={{ fontFamily: "'Calibri', 'Helvetica', sans-serif" }}>
    <div className="bg-orange-500 h-1.5" />
    <div className="p-10 sm:p-14">
      <Md
        children={output}
        className="text-[13px] leading-[1.7] text-slate-700 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:text-slate-900 [&>h1]:mb-1 [&>h2]:text-[12px] [&>h2]:font-bold [&>h2]:uppercase [&>h2]:tracking-wider [&>h2]:text-orange-600 [&>h2]:mt-6 [&>h2]:mb-2 [&>h2]:border-l-4 [&>h2]:border-orange-500 [&>h2]:pl-3 [&>h3]:text-[14px] [&>h3]:font-semibold [&>h3]:text-slate-900 [&>h3]:mt-3 [&>h3]:mb-1 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-3 [&>ul>li]:mb-1 [&>ul>li]:marker:text-orange-500 [&_strong]:text-orange-700"
      />
    </div>
  </div>
);

/* 10. International & Multilingual — globally-oriented, teal accent */
const InternationalMultilingual = ({ output }: TemplateProps) => (
  <div className="bg-white text-slate-900" style={{ fontFamily: "'Lato', 'Helvetica', sans-serif" }}>
    <div className="bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 px-10 sm:px-14 py-6 text-white">
      <div className="text-[10px] uppercase tracking-[0.3em] opacity-80">Global Professional · Multilingual</div>
    </div>
    <div className="p-10 sm:p-14">
      <Md
        children={output}
        className="text-[13px] leading-[1.75] text-slate-700 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:text-teal-900 [&>h1]:mb-2 [&>h2]:text-[12px] [&>h2]:font-bold [&>h2]:uppercase [&>h2]:tracking-[0.2em] [&>h2]:text-teal-700 [&>h2]:mt-6 [&>h2]:mb-2 [&>h2]:flex [&>h2]:items-center [&>h2]:gap-2 [&>h2]:after:content-[''] [&>h2]:after:flex-1 [&>h2]:after:h-px [&>h2]:after:bg-teal-200 [&>h3]:text-[14px] [&>h3]:font-semibold [&>h3]:text-slate-900 [&>h3]:mt-4 [&>h3]:mb-1 [&>p]:mb-2.5 [&>ul]:list-none [&>ul]:pl-0 [&>ul]:mb-3 [&>ul>li]:mb-1.5 [&>ul>li]:pl-5 [&>ul>li]:relative [&>ul>li]:before:content-['●'] [&>ul>li]:before:absolute [&>ul>li]:before:left-0 [&>ul>li]:before:text-teal-500 [&>ul>li]:before:text-[10px] [&>ul>li]:before:top-1.5 [&_strong]:text-teal-800"
      />
    </div>
  </div>
);

const TEMPLATE_RENDERERS: Record<string, React.FC<TemplateProps>> = {
  "classic-professional": ClassicProfessional,
  "modern-minimal": ModernMinimal,
  "tech-focused": TechFocused,
  "executive-suite": ExecutiveSuite,
  "creative-portfolio": CreativePortfolio,
  "academic-research": AcademicResearch,
  "startup-disruptor": StartupDisruptor,
  "federal-government": FederalGovernment,
  "career-changer": CareerChanger,
  "international-multilingual": InternationalMultilingual,
};

const SAMPLE_RESUME = `# Alex Morgan

alex.morgan@email.com · +1 (555) 123-4567 · linkedin.com/in/alexmorgan · San Francisco, CA

## Professional Summary

Results-driven professional with 8+ years of experience delivering measurable impact across cross-functional teams. Proven track record of scaling products, leading initiatives, and driving revenue growth in fast-paced environments.

## Experience

### Senior Product Manager — Acme Corp
*Jan 2021 – Present · San Francisco, CA*

- Led a team of 12 engineers and designers to launch flagship product, generating **$4.2M ARR** in year one.
- Reduced customer churn by **38%** through data-driven onboarding redesign.
- Owned end-to-end roadmap across 3 product lines serving 250K+ active users.

### Product Manager — Bright Labs
*Jun 2018 – Dec 2020 · Remote*

- Shipped 14 major features, increasing DAU by **62%** over two years.
- Established A/B testing framework adopted company-wide.

## Education

### B.S. Computer Science — Stanford University
*2014 – 2018 · GPA: 3.8/4.0*

## Skills

- **Languages:** Python, TypeScript, SQL, Go
- **Tools:** Figma, Mixpanel, Jira, Linear, Notion
- **Methodologies:** Agile, OKRs, Design Thinking, Lean Startup

## Certifications

- Certified Scrum Product Owner (CSPO)
- Google Project Management Professional`;

interface ResumeTemplateRenderProps {
  templateId?: string;
  output: string;
  showSample?: boolean;
}

export const ResumeTemplateRender = ({ templateId, output, showSample }: ResumeTemplateRenderProps) => {
  const id = templateId && TEMPLATE_RENDERERS[templateId] ? templateId : "classic-professional";
  const Renderer = TEMPLATE_RENDERERS[id];
  const content = output || (showSample ? SAMPLE_RESUME : "");

  if (!content) return null;

  return (
    <div className="bg-white rounded-lg border border-border shadow-elevated max-w-[820px] mx-auto overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-2 text-[11px] font-medium text-slate-500 flex items-center justify-between">
        <span>Resume · A4 Preview</span>
        <span className="font-mono text-slate-400">{id}</span>
      </div>
      <Renderer output={content} />
    </div>
  );
};

export const SAMPLE_RESUME_CONTENT = SAMPLE_RESUME;
