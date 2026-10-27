export type PlanTier = "free" | "creator" | "pro";

export interface PlanConfig {
  id: PlanTier;
  name: string;
  priceUSD: number;
  priceZAR: number;
  dailyLimit: number;
  monthlyLimit: number;
  historyDays: number;
  features: { pdfExport: boolean; docxExport: boolean; favorites: boolean; advancedAi: boolean; priorityQueue: boolean; watermarkRemoved: boolean };
  badgeClass: string;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: { id: "free", name: "Free", priceUSD: 0, priceZAR: 0, dailyLimit: 5, monthlyLimit: Infinity, historyDays: 7, features: { pdfExport: false, docxExport: false, favorites: false, advancedAi: false, priorityQueue: false, watermarkRemoved: false }, badgeClass: "bg-secondary text-muted-foreground" },
  creator: { id: "creator", name: "Starter", priceUSD: 12, priceZAR: 199, dailyLimit: Infinity, monthlyLimit: 200, historyDays: Infinity, features: { pdfExport: true, docxExport: false, favorites: true, advancedAi: false, priorityQueue: true, watermarkRemoved: true }, badgeClass: "bg-primary/10 text-primary" },
  pro: { id: "pro", name: "Pro", priceUSD: 29, priceZAR: 479, dailyLimit: Infinity, monthlyLimit: 600, historyDays: Infinity, features: { pdfExport: true, docxExport: true, favorites: true, advancedAi: true, priorityQueue: true, watermarkRemoved: true }, badgeClass: "bg-accent/10 text-accent" },
};

const TIER_RANK: Record<PlanTier, number> = { free: 0, creator: 1, pro: 2 };
export const tierMeets = (current: PlanTier, required: PlanTier): boolean => TIER_RANK[current] >= TIER_RANK[required];

const FREE_TOOLS = new Set<string>([
  "business-name", "store-name", "tiktok-hook", "thumbnail-text", "side-hustle-idea", "ad-copy", "fiverr-gig", "product-description", "tiktok-script", "cover-letter",
]);
const PRO_TOOLS = new Set<string>([
  "competitor-analyzer", "business-plan", "ai-startup", "income-strategy", "business-in-a-box", "faceless-video-studio", "ebook-generator", "course-generator", "pdf-guide-creator",
]);
export const getRequiredPlan = (toolId: string): PlanTier => FREE_TOOLS.has(toolId) ? "free" : PRO_TOOLS.has(toolId) ? "pro" : "creator";
export const canAccessTool = (tier: PlanTier, toolId: string): boolean => tierMeets(tier, getRequiredPlan(toolId));
export const planLabel = (tier: PlanTier): string => PLANS[tier].name;
