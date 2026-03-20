import {
  BookOpen, GraduationCap, FileText, Layout, Calendar,
  Search, Tag, Store, ShoppingBag, BarChart3,
  Megaphone, Video, Mail, FileSpreadsheet, Globe,
  Youtube, Film, Lightbulb, ImageIcon, PenTool,
  Briefcase, Send, User, FileSignature,
  Rocket, Building2, ClipboardList, Cpu, TrendingUp,
} from "lucide-react";

export type ToolCategory =
  | "Product Creation"
  | "Dropshipping"
  | "Marketing"
  | "Content Creation"
  | "Freelancing"
  | "Automation";

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: typeof BookOpen;
  prompt: string;
  inputLabel: string;
  inputPlaceholder: string;
  premium?: boolean;
}

export const categories: { name: ToolCategory; emoji: string }[] = [
  { name: "Product Creation", emoji: "💰" },
  { name: "Dropshipping", emoji: "🛍️" },
  { name: "Marketing", emoji: "📢" },
  { name: "Content Creation", emoji: "🎥" },
  { name: "Freelancing", emoji: "💼" },
  { name: "Automation", emoji: "🤖" },
];

export const tools: Tool[] = [
  // Product Creation
  { id: "ebook-generator", name: "eBook Generator", description: "Generate a full eBook outline with chapters and content", category: "Product Creation", icon: BookOpen, prompt: "Generate a detailed eBook outline", inputLabel: "eBook Topic", inputPlaceholder: "e.g., How to Start a Profitable Online Business" },
  { id: "course-generator", name: "Course Generator", description: "Create online course curriculum with modules and lessons", category: "Product Creation", icon: GraduationCap, prompt: "Generate a complete online course curriculum", inputLabel: "Course Topic", inputPlaceholder: "e.g., Digital Marketing Mastery" },
  { id: "pdf-guide-creator", name: "PDF Guide Creator", description: "Create comprehensive PDF guides on any topic", category: "Product Creation", icon: FileText, prompt: "Create a comprehensive PDF guide", inputLabel: "Guide Topic", inputPlaceholder: "e.g., The Ultimate Guide to Remote Work" },
  { id: "notion-template-generator", name: "Notion Template Generator", description: "Design Notion templates for productivity and organization", category: "Product Creation", icon: Layout, prompt: "Generate a Notion template structure", inputLabel: "Template Purpose", inputPlaceholder: "e.g., Project management for freelancers" },
  { id: "digital-planner-generator", name: "Digital Planner Generator", description: "Create structured digital planners for any goal", category: "Product Creation", icon: Calendar, prompt: "Generate a digital planner layout", inputLabel: "Planner Type", inputPlaceholder: "e.g., 90-Day Fitness Planner" },

  // Dropshipping
  { id: "product-research", name: "Product Research Generator", description: "Find winning products with market analysis", category: "Dropshipping", icon: Search, prompt: "Research winning dropshipping products", inputLabel: "Niche or Category", inputPlaceholder: "e.g., Home & Kitchen gadgets" },
  { id: "product-description", name: "Product Description Generator", description: "Write converting product descriptions", category: "Dropshipping", icon: Tag, prompt: "Write a high-converting product description", inputLabel: "Product Name & Features", inputPlaceholder: "e.g., LED Sunset Lamp - adjustable colors, USB powered" },
  { id: "store-name", name: "Store Name Generator", description: "Generate catchy store names for your brand", category: "Dropshipping", icon: Store, prompt: "Generate creative store names", inputLabel: "Store Niche", inputPlaceholder: "e.g., Minimalist tech accessories" },
  { id: "product-page-builder", name: "Product Page Builder", description: "Create full product page copy with sections", category: "Dropshipping", icon: ShoppingBag, prompt: "Build a complete product page", inputLabel: "Product Details", inputPlaceholder: "e.g., Portable blender - target: fitness enthusiasts" },
  { id: "competitor-analyzer", name: "Competitor Analyzer", description: "Analyze competitors and find market gaps", category: "Dropshipping", icon: BarChart3, prompt: "Analyze competitors in this niche", inputLabel: "Competitor/Niche", inputPlaceholder: "e.g., Shopify stores selling pet accessories", premium: true },

  // Marketing
  { id: "ad-copy", name: "Ad Copy Generator", description: "Create high-converting ad copy for any platform", category: "Marketing", icon: Megaphone, prompt: "Generate high-converting ad copy", inputLabel: "Product/Service", inputPlaceholder: "e.g., Online yoga course for beginners" },
  { id: "tiktok-hook", name: "TikTok Hook Generator", description: "Generate viral TikTok hooks that stop the scroll", category: "Marketing", icon: Video, prompt: "Generate viral TikTok hooks", inputLabel: "Video Topic", inputPlaceholder: "e.g., Money-saving tips for college students" },
  { id: "email-marketing", name: "Email Marketing Generator", description: "Create email sequences that convert", category: "Marketing", icon: Mail, prompt: "Create an email marketing sequence", inputLabel: "Product/Campaign", inputPlaceholder: "e.g., Launch sequence for a new SaaS product" },
  { id: "sales-page", name: "Sales Page Generator", description: "Write complete sales page copy", category: "Marketing", icon: FileSpreadsheet, prompt: "Write a complete sales page", inputLabel: "Product/Offer", inputPlaceholder: "e.g., $497 coaching program for entrepreneurs", premium: true },
  { id: "landing-page-copy", name: "Landing Page Copy Generator", description: "Generate landing page copy that converts", category: "Marketing", icon: Globe, prompt: "Generate landing page copy", inputLabel: "Product/Service", inputPlaceholder: "e.g., AI writing tool for marketers" },

  // Content Creation
  { id: "youtube-script", name: "YouTube Script Generator", description: "Write engaging YouTube video scripts", category: "Content Creation", icon: Youtube, prompt: "Write a YouTube video script", inputLabel: "Video Topic", inputPlaceholder: "e.g., How I made $10K/month with AI tools" },
  { id: "tiktok-script", name: "TikTok Video Script Generator", description: "Create short-form video scripts", category: "Content Creation", icon: Film, prompt: "Create a TikTok video script", inputLabel: "Video Concept", inputPlaceholder: "e.g., Day in the life of a freelance designer" },
  { id: "faceless-video", name: "Faceless Video Idea Generator", description: "Generate ideas for faceless YouTube channels", category: "Content Creation", icon: Lightbulb, prompt: "Generate faceless video ideas", inputLabel: "Channel Niche", inputPlaceholder: "e.g., Personal finance education" },
  { id: "thumbnail-text", name: "Thumbnail Text Generator", description: "Create attention-grabbing thumbnail text", category: "Content Creation", icon: ImageIcon, prompt: "Generate thumbnail text ideas", inputLabel: "Video Title", inputPlaceholder: "e.g., I Tried Dropshipping for 30 Days" },
  { id: "blog-post", name: "Blog Post Generator", description: "Write SEO-optimized blog posts", category: "Content Creation", icon: PenTool, prompt: "Write a comprehensive blog post", inputLabel: "Blog Topic", inputPlaceholder: "e.g., Best side hustles for 2025" },

  // Freelancing
  { id: "fiverr-gig", name: "Fiverr Gig Generator", description: "Create optimized Fiverr gig descriptions", category: "Freelancing", icon: Briefcase, prompt: "Create a Fiverr gig listing", inputLabel: "Service Type", inputPlaceholder: "e.g., Logo design for startups" },
  { id: "upwork-proposal", name: "Upwork Proposal Generator", description: "Write winning Upwork proposals", category: "Freelancing", icon: Send, prompt: "Write a winning Upwork proposal", inputLabel: "Job Description", inputPlaceholder: "Paste the job posting you want to apply to" },
  { id: "resume-builder", name: "Resume Builder", description: "Create a professional resume tailored to any role", category: "Freelancing", icon: User, prompt: "Build a professional resume", inputLabel: "Role & Experience", inputPlaceholder: "e.g., Frontend developer with 3 years experience" },
  { id: "cover-letter", name: "Cover Letter Generator", description: "Generate personalized cover letters", category: "Freelancing", icon: FileSignature, prompt: "Write a personalized cover letter", inputLabel: "Job & Background", inputPlaceholder: "e.g., Marketing manager role at a SaaS startup" },

  // Automation / Business
  { id: "side-hustle-idea", name: "Side Hustle Idea Generator", description: "Get personalized side hustle ideas based on your skills", category: "Automation", icon: Rocket, prompt: "Generate side hustle ideas", inputLabel: "Your Skills & Interests", inputPlaceholder: "e.g., Writing, social media, graphic design" },
  { id: "business-name", name: "Business Name Generator", description: "Generate memorable business names", category: "Automation", icon: Building2, prompt: "Generate business name ideas", inputLabel: "Business Type", inputPlaceholder: "e.g., Sustainable clothing brand" },
  { id: "business-plan", name: "Business Plan Generator", description: "Create a structured business plan outline", category: "Automation", icon: ClipboardList, prompt: "Create a business plan", inputLabel: "Business Idea", inputPlaceholder: "e.g., Subscription box for plant lovers", premium: true },
  { id: "ai-startup", name: "AI Startup Generator", description: "Generate AI-powered startup ideas with validation", category: "Automation", icon: Cpu, prompt: "Generate an AI startup concept", inputLabel: "Industry/Problem", inputPlaceholder: "e.g., Healthcare appointment scheduling" },
  { id: "income-strategy", name: "Income Strategy Generator", description: "Create multi-stream income strategies", category: "Automation", icon: TrendingUp, prompt: "Create an income strategy", inputLabel: "Current Situation", inputPlaceholder: "e.g., Full-time job, $500/month to invest, interested in digital products" },
];

export const getToolsByCategory = (category: ToolCategory) =>
  tools.filter((t) => t.category === category);

export const getToolById = (id: string) => tools.find((t) => t.id === id);
