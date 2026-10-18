// Centralized subscription plan + feature gating config.
// Single source of truth used by frontend and mirrored by backend enforcement.

export type PlanTier = "free" | "creator" | "pro";

export interface PlanConfig {
  id: PlanTier;
  name: string;
  priceUSD: number;
  priceZAR: number;
  dailyLimit: number;
  monthlyLimit: number;
  historyDays: number;
  features: {
    pdfExport: boolean;
    docxExport: boolean;
    favorites: boolean;
    advancedAi: boolean;
    priorityQueue: boolean;
    watermarkRemoved: boolean;
  };
  badgeClass: string;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    id: "free", name: "Free", priceUSD: 0, priceZAR: 0,
    dailyLimit: 5, monthlyLimit: Infinity, historyDays: 7,
    features: { pdfExport: false, docxExport: false, favorites: false, advancedAi: false, priorityQueue: false, watermarkRemoved: false },
    badgeClass: "bg-secondary text-muted-foreground",
  },
  creator: {
    id: "creator", name: "Starter", priceUSD: 6, priceZAR: 99,
    dailyLimit: Infinity, monthlyLimit: 50, historyDays: Infinity,
    features: { pdfExport: true, docxExport: false, favorites: true, advancedAi: false, priorityQueue: true, watermarkRemoved: true },
    badgeClass: "bg-primary/10 text-primary",
  },
  pro: {
    id: "pro", name: "Pro", priceUSD: 15, priceZAR: 249,
    dailyLimit: Infinity, monthlyLimit: 250, historyDays: Infinity,
    features: { pdfExport: true, docxExport: true, favorites: true, advancedAi: true, priorityQueue: true, watermarkRemoved: true },
    badgeClass: "bg-accent/10 text-accent",
  },
};

const TIER_RANK: Record<PlanTier, number> = { free: 0, creator: 1, pro: 2 };
export const tierMeets = (current: PlanTier, required: PlanTier): boolean => TIER_RANK[current] >= TIER_RANK[required];

const FREE_TOOLS = new Set<string>([
  "business-name", "store-name", "tiktok-hook", "thumbnail-text", "side-hustle-idea", "ad-copy", "fiverr-gig",
]);

const PRO_TOOLS = new Set<string>([
  "competitor-analyzer", "business-plan", "ai-startup", "income-strategy", "business-in-a-box", "faceless-video-studio",
]);

export const getRequiredPlan = (toolId: string): PlanTier => {
  if (FREE_TOOLS.has(toolId)) return "free";
  if (PRO_TOOLS.has(toolId)) return "pro";
  return "creator";
};
export const canAccessTool = (tier: PlanTier, toolId: string): boolean => tierMeets(tier, getRequiredPlan(toolId));
export const planLabel = (tier: PlanTier): string => PLANS[tier].name;
