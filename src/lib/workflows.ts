import type { PlanTier } from "@/lib/plans";
export interface WorkflowStep { toolId: string; label: string; description: string; requiredPlan?: PlanTier; }
export const WORKFLOWS: Record<string, WorkflowStep> = {
  "business-name": { toolId: "store-name", label: "Build your store", description: "Turn the name into a storefront concept." },
  "store-name": { toolId: "product-research", label: "Research products", description: "Find products that fit the store niche.", requiredPlan: "creator" },
  "product-research": { toolId: "product-description", label: "Write product copy", description: "Turn research into conversion-focused copy." },
  "product-description": { toolId: "product-page-builder", label: "Build product page", description: "Turn the product into a complete sales page." },
  "product-page-builder": { toolId: "ad-copy", label: "Create ads", description: "Create acquisition copy for the offer." },
  "ad-copy": { toolId: "email-marketing", label: "Build email funnel", description: "Turn the campaign into a nurture or sales sequence." },
  "side-hustle-idea": { toolId: "business-plan", label: "Build the business plan", description: "Turn the idea into a launchable business model.", requiredPlan: "pro" },
  "business-plan": { toolId: "landing-page-copy", label: "Create the landing page", description: "Turn the plan into conversion-ready launch copy." },
  "competitor-analyzer": { toolId: "business-plan", label: "Build the opportunity plan", description: "Turn competitor gaps into an execution plan.", requiredPlan: "pro" },
  "ai-startup": { toolId: "business-plan", label: "Build the business plan", description: "Turn the startup concept into an operating plan.", requiredPlan: "pro" },
  "income-strategy": { toolId: "business-plan", label: "Plan the income engine", description: "Turn the strategy into a concrete business model.", requiredPlan: "pro" },
  "business-in-a-box": { toolId: "landing-page-copy", label: "Launch the landing page", description: "Turn the package into a publishable landing page.", requiredPlan: "pro" },
  "resume-builder": { toolId: "cover-letter", label: "Tailor the cover letter", description: "Use the finished resume to create a matching application letter." },
  "fiverr-gig": { toolId: "upwork-proposal", label: "Create a proposal", description: "Turn the service offer into a client-winning proposal." },
  "youtube-script": { toolId: "thumbnail-text", label: "Create the thumbnail", description: "Turn the video concept into thumbnail variants." },
  "tiktok-script": { toolId: "thumbnail-text", label: "Create the thumbnail", description: "Turn the short-form concept into thumbnail variants." },
  "blog-post": { toolId: "ad-copy", label: "Promote the article", description: "Turn the article into paid/social promotion copy." },
  "ebook-generator": { toolId: "pdf-guide-creator", label: "Package as a guide", description: "Turn long-form content into a polished guide.", requiredPlan: "pro" },
  "course-generator": { toolId: "pdf-guide-creator", label: "Create the course guide", description: "Turn the curriculum into a downloadable companion guide.", requiredPlan: "pro" },
};
export const getNextWorkflowStep = (toolId: string): WorkflowStep | null => WORKFLOWS[toolId] ?? null;
