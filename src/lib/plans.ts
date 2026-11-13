export type PlanTier = "free" | "creator" | "pro";
export interface PlanConfig {
  id: PlanTier;
  name: string;
  priceUSD: number;
  priceZAR: number;
  annualPriceZAR?: number;
  dailyLimit: number;
  monthlyLimit: number;
  historyDays: number;
  features: { pdfExport: boolean; docxExport: boolean; favorites: boolean; advancedAi: boolean; priorityQueue: boolean; watermarkRemoved: boolean };
  badgeClass: string;
}
export const PLANS: Record<PlanTier, PlanConfig> = {
  free: { id: "free", name: "Free", priceUSD: 0, priceZAR: 0, dailyLimit: 20, monthlyLimit: Infinity, historyDays: Infinity, features: { pdfExport: true, docxExport: true, favorites: true, advancedAi: false, priorityQueue: false, watermarkRemoved: true }, badgeClass: "bg-secondary text-muted-foreground" },
  // Retained only for existing legacy accounts; no new checkout is offered for this tier.
  creator: { id: "creator", name: "Legacy Creator", priceUSD: 0, priceZAR: 0, dailyLimit: Infinity, monthlyLimit: 200, historyDays: Infinity, features: { pdfExport: true, docxExport: false, favorites: true, advancedAi: false, priorityQueue: true, watermarkRemoved: true }, badgeClass: "bg-primary/10 text-primary" },
  pro: { id: "pro", name: "Premium", priceUSD: 0, priceZAR: 199, annualPriceZAR: 1990, dailyLimit: Infinity, monthlyLimit: 600, historyDays: Infinity, features: { pdfExport: true, docxExport: true, favorites: true, advancedAi: true, priorityQueue: true, watermarkRemoved: true }, badgeClass: "bg-accent/10 text-accent" },
};
const RANK: Record<PlanTier, number> = { free: 0, creator: 1, pro: 2 };
export const tierMeets = (current: PlanTier, required: PlanTier): boolean => RANK[current] >= RANK[required];
const PREMIUM_TOOLS = new Set(["business-in-a-box", "faceless-video-studio", "ebook-generator", "course-generator", "pdf-guide-creator"]);
export const getRequiredPlan = (toolId: string): PlanTier => PREMIUM_TOOLS.has(toolId) ? "pro" : "free";
export const canAccessTool = (tier: PlanTier, toolId: string): boolean => tierMeets(tier, getRequiredPlan(toolId));
export const planLabel = (tier: PlanTier): string => PLANS[tier].name;
