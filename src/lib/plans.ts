// Centralized subscription plan + feature gating config.
// Single source of truth used by frontend (hook, dashboard, tool page) AND
// mirrored in the `/generate` edge function for backend enforcement.

export type PlanTier = "free" | "creator" | "pro";

export interface PlanConfig {
  id: PlanTier;
  name: string;
  priceUSD: number;
  /** Daily generation cap (Infinity = unlimited). */
  dailyLimit: number;
  /** Monthly generation cap (Infinity = unlimited). */
  monthlyLimit: number;
  /** History retention in days (Infinity = unlimited). */
  historyDays: number;
  features: {
    pdfExport: boolean;
    docxExport: boolean;
    favorites: boolean;
    advancedAi: boolean;
    priorityQueue: boolean;
    watermarkRemoved: boolean;
  };
  /** Tailwind classes for the plan badge. */
  badgeClass: string;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    priceUSD: 0,
    dailyLimit: 5,
    monthlyLimit: Infinity,
    historyDays: 7,
    features: {
      pdfExport: false,
      docxExport: false,
      favorites: false,
      advancedAi: false,
      priorityQueue: false,
      watermarkRemoved: false,
    },
    badgeClass: "bg-secondary text-muted-foreground",
  },
  creator: {
    id: "creator",
    name: "Creator",
    priceUSD: 19,
    dailyLimit: Infinity,
    monthlyLimit: 100,
    historyDays: Infinity,
    features: {
      pdfExport: true,
      docxExport: false,
      favorites: true,
      advancedAi: false,
      priorityQueue: true,
      watermarkRemoved: true,
    },
    badgeClass: "bg-primary/10 text-primary",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUSD: 49,
    dailyLimit: Infinity,
    monthlyLimit: Infinity,
    historyDays: Infinity,
    features: {
      pdfExport: true,
      docxExport: true,
      favorites: true,
      advancedAi: true,
      priorityQueue: true,
      watermarkRemoved: true,
    },
    badgeClass: "bg-accent/10 text-accent",
  },
};

const TIER_RANK: Record<PlanTier, number> = { free: 0, creator: 1, pro: 2 };

export const tierMeets = (current: PlanTier, required: PlanTier): boolean =>
  TIER_RANK[current] >= TIER_RANK[required];

/* ── Per-tool plan requirement ─────────────────── */

// Tools accessible on FREE
const FREE_TOOLS = new Set<string>([
  "business-name",
  "store-name",
  "tiktok-hook",
  "thumbnail-text",
  "side-hustle-idea",
  "ad-copy",
  "fiverr-gig",
]);

// Tools requiring PRO (everything else falls back to CREATOR)
const PRO_TOOLS = new Set<string>([
  "competitor-analyzer",
  "business-plan",
  "ai-startup",
  "income-strategy",
  "business-in-a-box",
  "faceless-video-studio",
]);

export const getRequiredPlan = (toolId: string): PlanTier => {
  if (FREE_TOOLS.has(toolId)) return "free";
  if (PRO_TOOLS.has(toolId)) return "pro";
  return "creator";
};

export const canAccessTool = (tier: PlanTier, toolId: string): boolean =>
  tierMeets(tier, getRequiredPlan(toolId));

export const planLabel = (tier: PlanTier): string => PLANS[tier].name;
