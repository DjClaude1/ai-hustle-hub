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

export interface ToolInput {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  required?: boolean;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: typeof BookOpen;
  prompt: string;
  inputs: ToolInput[];
  premium?: boolean;
  isImageTool?: boolean;
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
  // ── Product Creation ────────────────────────────
  {
    id: "ebook-generator",
    name: "eBook Generator",
    description: "Generate a full eBook outline with chapters, key takeaways, and content summaries",
    category: "Product Creation",
    icon: BookOpen,
    prompt: "Write a COMPLETE, FULL-LENGTH eBook — not an outline. Write the entire book from cover to cover with a compelling introduction, every chapter fully written out with multiple pages of prose, real examples, case studies, actionable advice, exercises, and a powerful conclusion. Each chapter must be 800-2000+ words of actual content. The total book must be at minimum 15 pages (and scale to the requested chapter count). Do NOT write an outline — write the actual book.",
    inputs: [
      { key: "topic", label: "eBook Topic", placeholder: "e.g., How to Start a Profitable Online Business in 2025", type: "text", required: true },
      { key: "audience", label: "Target Audience", placeholder: "e.g., Aspiring entrepreneurs aged 25-40", type: "text", required: true },
      { key: "chapters", label: "Number of Chapters", placeholder: "Select chapter count", type: "select", options: ["5", "7", "10", "12", "15", "20 (Pro)", "25 (Pro)", "30 (Pro)", "40 (Pro)", "50 (Pro)"] },
      { key: "tone", label: "Writing Tone", placeholder: "Select tone", type: "select", options: ["Professional", "Conversational", "Motivational", "Academic", "Storytelling"] },
      { key: "extras", label: "Special Requests", placeholder: "e.g., Include case studies, add actionable exercises at the end of each chapter", type: "textarea" },
    ],
  },
  {
    id: "course-generator",
    name: "Course Generator",
    description: "Create a comprehensive online course curriculum with modules, lessons, and assignments",
    category: "Product Creation",
    icon: GraduationCap,
    prompt: "Create a COMPLETE online course with full lesson content written out — not just titles and descriptions. Write the actual teaching material for every lesson, complete assignment briefs, quiz questions with answers, project descriptions, and detailed scripts/talking points. Each module should have fully written lessons that an instructor can use directly.",
    inputs: [
      { key: "topic", label: "Course Topic", placeholder: "e.g., Digital Marketing Mastery for Small Businesses", type: "text", required: true },
      { key: "level", label: "Difficulty Level", placeholder: "Select level", type: "select", options: ["Beginner", "Intermediate", "Advanced", "All Levels"] },
      { key: "duration", label: "Course Duration", placeholder: "Select duration", type: "select", options: ["1 Week", "2 Weeks", "4 Weeks", "6 Weeks", "8 Weeks", "12 Weeks"] },
      { key: "format", label: "Delivery Format", placeholder: "Select format", type: "select", options: ["Video Lessons", "Text-Based", "Mixed (Video + Text)", "Live Workshops", "Self-Paced"] },
      { key: "audience", label: "Target Students", placeholder: "e.g., Freelancers wanting to scale their business", type: "text" },
      { key: "extras", label: "Include Extras", placeholder: "e.g., Quizzes after each module, downloadable templates, certificate of completion", type: "textarea" },
    ],
  },
  {
    id: "pdf-guide-creator",
    name: "PDF Guide Creator",
    description: "Create comprehensive, downloadable PDF guides with structured sections",
    category: "Product Creation",
    icon: FileText,
    prompt: "Write a COMPLETE, FULL-LENGTH PDF guide — not an outline. Write every section in full with detailed prose, step-by-step instructions, real examples, checklists, comparison tables, resource lists, and actionable takeaways. The guide should be ready to format and publish immediately with no gaps or placeholders.",
    inputs: [
      { key: "topic", label: "Guide Topic", placeholder: "e.g., The Ultimate Guide to Remote Work Productivity", type: "text", required: true },
      { key: "pages", label: "Estimated Pages", placeholder: "Select page count", type: "select", options: ["5-10", "10-20", "20-30", "30-50"] },
      { key: "audience", label: "Target Reader", placeholder: "e.g., Remote workers transitioning from office jobs", type: "text", required: true },
      { key: "style", label: "Visual Style", placeholder: "Select style", type: "select", options: ["Minimalist", "Corporate", "Creative/Colorful", "Infographic-Heavy"] },
      { key: "extras", label: "Special Sections", placeholder: "e.g., Add checklists, include resource links, add comparison tables", type: "textarea" },
    ],
  },
  {
    id: "notion-template-generator",
    name: "Notion Template Generator",
    description: "Design detailed Notion templates with databases, views, and automations",
    category: "Product Creation",
    icon: Layout,
    prompt: "Generate a detailed Notion template structure including pages, databases with property types, views (table/board/calendar), relations between databases, and suggested automations.",
    inputs: [
      { key: "purpose", label: "Template Purpose", placeholder: "e.g., Project management for freelancers", type: "text", required: true },
      { key: "complexity", label: "Complexity Level", placeholder: "Select complexity", type: "select", options: ["Simple (1-3 pages)", "Medium (4-8 pages)", "Advanced (8+ pages with relations)"] },
      { key: "audience", label: "Who Is This For?", placeholder: "e.g., Solo entrepreneurs managing multiple clients", type: "text", required: true },
      { key: "features", label: "Key Features Needed", placeholder: "e.g., Habit tracker, content calendar, client CRM, invoice tracking", type: "textarea" },
    ],
  },
  {
    id: "digital-planner-generator",
    name: "Digital Planner Generator",
    description: "Create structured digital planners with daily, weekly, and monthly layouts",
    category: "Product Creation",
    icon: Calendar,
    prompt: "Generate a detailed digital planner structure with daily/weekly/monthly layouts, goal-tracking sections, habit trackers, and reflection prompts tailored to the user's goal.",
    inputs: [
      { key: "type", label: "Planner Type", placeholder: "e.g., 90-Day Fitness Planner", type: "text", required: true },
      { key: "duration", label: "Time Span", placeholder: "Select duration", type: "select", options: ["30 Days", "60 Days", "90 Days", "6 Months", "1 Year"] },
      { key: "platform", label: "Platform", placeholder: "Select platform", type: "select", options: ["GoodNotes", "Notability", "PDF (Universal)", "iPad Only", "Cross-Platform"] },
      { key: "sections", label: "Sections to Include", placeholder: "e.g., Meal planning, workout log, gratitude journal, financial tracker", type: "textarea" },
    ],
  },
  {
    id: "ai-image-generator",
    name: "AI Image Generator",
    description: "Generate stunning AI images for covers, banners, ads & social media",
    category: "Product Creation",
    icon: ImageIcon,
    prompt: "",
    inputs: [],
    isImageTool: true,
  },

  // ── Dropshipping ────────────────────────────────
  {
    id: "product-research",
    name: "Product Research Generator",
    description: "Find winning products with market analysis, profit margins, and sourcing strategies",
    category: "Dropshipping",
    icon: Search,
    prompt: "Research winning dropshipping products including market demand analysis, estimated profit margins, competition level, target demographics, sourcing suggestions, and marketing angle recommendations.",
    inputs: [
      { key: "niche", label: "Niche or Category", placeholder: "e.g., Home & Kitchen gadgets", type: "text", required: true },
      { key: "budget", label: "Starting Budget", placeholder: "Select budget range", type: "select", options: ["Under $500", "$500-$1,000", "$1,000-$5,000", "$5,000+"] },
      { key: "platform", label: "Selling Platform", placeholder: "Select platform", type: "select", options: ["Shopify", "Amazon FBA", "eBay", "TikTok Shop", "Etsy", "WooCommerce"] },
      { key: "priceRange", label: "Target Price Range", placeholder: "Select range", type: "select", options: ["$5-$15", "$15-$30", "$30-$50", "$50-$100", "$100+"] },
      { key: "criteria", label: "Additional Criteria", placeholder: "e.g., Lightweight for cheap shipping, trending on TikTok, solving a specific problem", type: "textarea" },
    ],
  },
  {
    id: "product-description",
    name: "Product Description Generator",
    description: "Write high-converting product descriptions with benefits, features, and social proof",
    category: "Dropshipping",
    icon: Tag,
    prompt: "Write a high-converting product description with a compelling headline, benefit-driven bullet points, feature specifications, social proof elements, and a strong call-to-action.",
    inputs: [
      { key: "product", label: "Product Name", placeholder: "e.g., LED Sunset Lamp", type: "text", required: true },
      { key: "features", label: "Key Features", placeholder: "e.g., 16 adjustable colors, USB powered, 180° rotation, remote control", type: "textarea", required: true },
      { key: "audience", label: "Target Customer", placeholder: "e.g., Home decor enthusiasts, TikTok-savvy Gen Z", type: "text" },
      { key: "tone", label: "Copy Tone", placeholder: "Select tone", type: "select", options: ["Luxury/Premium", "Fun/Playful", "Professional", "Urgency-Driven", "Minimalist"] },
      { key: "platform", label: "Where Will This Be Used?", placeholder: "Select platform", type: "select", options: ["Shopify Store", "Amazon Listing", "Etsy", "Social Media Ad", "Email Campaign"] },
    ],
  },
  {
    id: "store-name",
    name: "Store Name Generator",
    description: "Generate catchy, brandable store names with domain availability insights",
    category: "Dropshipping",
    icon: Store,
    prompt: "Generate 15+ creative, memorable store name ideas with notes on brandability, domain availability likelihood, and brand personality fit. Include both straightforward and creative/abstract options.",
    inputs: [
      { key: "niche", label: "Store Niche", placeholder: "e.g., Minimalist tech accessories", type: "text", required: true },
      { key: "vibe", label: "Brand Vibe", placeholder: "Select vibe", type: "select", options: ["Modern/Sleek", "Fun/Playful", "Luxury/Premium", "Eco/Natural", "Techy/Futuristic", "Vintage/Retro"] },
      { key: "keywords", label: "Keywords to Include", placeholder: "e.g., zen, minimal, craft (optional)", type: "text" },
      { key: "avoid", label: "Words to Avoid", placeholder: "e.g., cheap, discount, basic", type: "text" },
    ],
  },
  {
    id: "product-page-builder",
    name: "Product Page Builder",
    description: "Create full product page copy with hero section, benefits, FAQ, and reviews",
    category: "Dropshipping",
    icon: ShoppingBag,
    prompt: "Build a complete product page including hero headline, subheadline, benefit sections with icons, feature comparison, FAQ section, customer review templates, trust badges, and CTA sections.",
    inputs: [
      { key: "product", label: "Product Name & Type", placeholder: "e.g., Portable blender - personal-sized smoothie maker", type: "text", required: true },
      { key: "price", label: "Price Point", placeholder: "e.g., $29.99", type: "text" },
      { key: "audience", label: "Target Customer", placeholder: "e.g., Fitness enthusiasts, busy professionals", type: "text", required: true },
      { key: "usp", label: "Unique Selling Points", placeholder: "e.g., 30-second blending, self-cleaning, USB rechargeable, BPA-free", type: "textarea", required: true },
      { key: "competitors", label: "Main Competitors", placeholder: "e.g., BlendJet, NutriBullet Go", type: "text" },
    ],
  },
  {
    id: "competitor-analyzer",
    name: "Competitor Analyzer",
    description: "Deep-dive competitor analysis with SWOT, pricing, and gap identification",
    category: "Dropshipping",
    icon: BarChart3,
    prompt: "Perform a deep competitor analysis including SWOT analysis, pricing strategy comparison, product range assessment, marketing channel analysis, customer sentiment insights, and actionable opportunities to differentiate.",
    // premium removed: now free for all
    inputs: [
      { key: "competitor", label: "Competitor Store/Brand", placeholder: "e.g., Shopify stores selling pet accessories", type: "text", required: true },
      { key: "yourStore", label: "Your Store/Brand (if exists)", placeholder: "e.g., PawPerfect.com", type: "text" },
      { key: "niche", label: "Niche / Industry", placeholder: "e.g., Premium pet accessories", type: "text", required: true },
      { key: "focus", label: "Analysis Focus", placeholder: "Select focus", type: "select", options: ["Full SWOT Analysis", "Pricing Strategy", "Marketing Channels", "Product Range", "Customer Experience", "All of the Above"] },
      { key: "goals", label: "Your Goals", placeholder: "e.g., Find gaps in their product offering I can fill, understand their pricing model", type: "textarea" },
    ],
  },

  // ── Marketing ───────────────────────────────────
  {
    id: "ad-copy",
    name: "Ad Copy Generator",
    description: "Create high-converting ad copy for Facebook, Google, Instagram, and TikTok",
    category: "Marketing",
    icon: Megaphone,
    prompt: "Generate high-converting ad copy variations including headlines, primary text, descriptions, and CTAs. Create multiple versions optimized for the specified platform with A/B testing suggestions.",
    inputs: [
      { key: "product", label: "Product/Service", placeholder: "e.g., Online yoga course for beginners", type: "text", required: true },
      { key: "platform", label: "Ad Platform", placeholder: "Select platform", type: "select", options: ["Facebook/Instagram", "Google Ads", "TikTok Ads", "LinkedIn Ads", "Twitter/X Ads", "Pinterest Ads"] },
      { key: "objective", label: "Campaign Objective", placeholder: "Select objective", type: "select", options: ["Sales/Conversions", "Lead Generation", "Brand Awareness", "Traffic", "App Installs", "Engagement"] },
      { key: "audience", label: "Target Audience", placeholder: "e.g., Women 25-45 interested in wellness and fitness", type: "text", required: true },
      { key: "budget", label: "Daily Budget Range", placeholder: "Select budget", type: "select", options: ["$5-$20/day", "$20-$50/day", "$50-$100/day", "$100-$500/day", "$500+/day"] },
      { key: "angle", label: "Preferred Ad Angle", placeholder: "e.g., Pain point focused, testimonial-based, urgency/scarcity", type: "text" },
    ],
  },
  {
    id: "tiktok-hook",
    name: "TikTok Hook Generator",
    description: "Generate scroll-stopping TikTok hooks with engagement strategies",
    category: "Marketing",
    icon: Video,
    prompt: "Generate 15+ viral TikTok hook variations including text overlays, opening lines, pattern interrupts, and engagement triggers. Include notes on why each hook works psychologically.",
    inputs: [
      { key: "topic", label: "Video Topic", placeholder: "e.g., Money-saving tips for college students", type: "text", required: true },
      { key: "style", label: "Content Style", placeholder: "Select style", type: "select", options: ["Educational", "Entertainment", "Storytelling", "POV/Relatable", "Tutorial/How-To", "Controversy/Hot Take"] },
      { key: "niche", label: "Creator Niche", placeholder: "e.g., Personal finance, lifestyle, tech reviews", type: "text" },
      { key: "goal", label: "Video Goal", placeholder: "Select goal", type: "select", options: ["Go Viral", "Drive Sales", "Grow Followers", "Build Authority", "Get Comments/Engagement"] },
    ],
  },
  {
    id: "email-marketing",
    name: "Email Marketing Generator",
    description: "Create complete email sequences with subject lines, body copy, and CTAs",
    category: "Marketing",
    icon: Mail,
    prompt: "Write a COMPLETE email marketing sequence with EVERY email fully written out. For each email include: subject line (with A/B variant), preview text, full body copy (complete paragraphs, not bullet points), CTAs, and send timing. Write the actual email content word-for-word ready to paste into an email platform. Include personalization tokens and segmentation suggestions.",
    inputs: [
      { key: "product", label: "Product/Campaign", placeholder: "e.g., Launch sequence for a new SaaS product", type: "text", required: true },
      { key: "sequenceType", label: "Sequence Type", placeholder: "Select type", type: "select", options: ["Welcome Series", "Launch Sequence", "Nurture/Drip", "Re-engagement", "Abandoned Cart", "Post-Purchase", "Webinar Funnel"] },
      { key: "emails", label: "Number of Emails", placeholder: "Select count", type: "select", options: ["3", "5", "7", "10", "12"] },
      { key: "audience", label: "Subscriber Segment", placeholder: "e.g., New leads who downloaded a free guide", type: "text", required: true },
      { key: "tone", label: "Email Tone", placeholder: "Select tone", type: "select", options: ["Professional", "Casual/Friendly", "Storytelling", "Direct/Sales-Heavy", "Educational"] },
      { key: "cta", label: "Primary CTA Goal", placeholder: "e.g., Book a demo, buy the course, start free trial", type: "text" },
    ],
  },
  {
    id: "sales-page",
    name: "Sales Page Generator",
    description: "Write complete long-form sales page copy with proven conversion frameworks",
    category: "Marketing",
    icon: FileSpreadsheet,
    prompt: "Write a COMPLETE, FULL long-form sales page — every word of copy ready to publish. Use the specified copywriting framework. Write the actual headline, every subheadline, full problem agitation paragraphs, solution presentation, detailed benefit sections, social proof sections, objection-handling copy, guarantee section, pricing presentation, complete FAQ with answers, and multiple CTAs. Write it ALL out — no placeholders.",
    // premium removed: now free for all
    inputs: [
      { key: "product", label: "Product/Offer Name", placeholder: "e.g., $497 coaching program for entrepreneurs", type: "text", required: true },
      { key: "price", label: "Price Point", placeholder: "e.g., $497 one-time or $97/month", type: "text", required: true },
      { key: "framework", label: "Copywriting Framework", placeholder: "Select framework", type: "select", options: ["AIDA (Attention-Interest-Desire-Action)", "PAS (Problem-Agitate-Solve)", "Story-Based", "Before-After-Bridge", "Let AI Choose Best"] },
      { key: "audience", label: "Ideal Customer", placeholder: "e.g., Coaches and consultants making $3-10K/month wanting to scale", type: "text", required: true },
      { key: "painPoints", label: "Customer Pain Points", placeholder: "e.g., Struggling to get consistent clients, undercharging for services, no systems", type: "textarea", required: true },
      { key: "results", label: "Results/Transformation Promised", placeholder: "e.g., Go from $3K to $10K months in 90 days", type: "text" },
    ],
  },
  {
    id: "landing-page-copy",
    name: "Landing Page Copy Generator",
    description: "Generate complete landing page copy optimized for conversions",
    category: "Marketing",
    icon: Globe,
    prompt: "Generate complete landing page copy including hero section, value proposition, feature sections, social proof, FAQ, and CTA — all optimized for the specified conversion goal.",
    inputs: [
      { key: "product", label: "Product/Service", placeholder: "e.g., AI writing tool for marketers", type: "text", required: true },
      { key: "goal", label: "Page Goal", placeholder: "Select goal", type: "select", options: ["Email Signup", "Free Trial", "Product Purchase", "Waitlist", "Demo Booking", "App Download"] },
      { key: "audience", label: "Target Visitor", placeholder: "e.g., Content marketers at B2B SaaS companies", type: "text", required: true },
      { key: "usp", label: "Unique Value Proposition", placeholder: "e.g., Write 10x faster with AI that understands your brand voice", type: "text", required: true },
      { key: "socialProof", label: "Social Proof Available", placeholder: "e.g., 10,000 users, featured in TechCrunch, 4.8 star rating", type: "text" },
    ],
  },

  // ── Content Creation ────────────────────────────
  {
    id: "youtube-script",
    name: "YouTube Script Generator",
    description: "Write engaging YouTube scripts with hooks, retention strategies, and CTAs",
    category: "Content Creation",
    icon: Youtube,
    prompt: "Write a COMPLETE, word-for-word YouTube video script ready to read on camera. Include the exact spoken dialogue for every section: pattern-interrupt hook (first 5 seconds), intro, all main content sections with full narration written out, B-roll direction notes in [brackets], CTA placements, transitions between segments, and end screen script. Do NOT write bullet points — write the full script as spoken word.",
    inputs: [
      { key: "topic", label: "Video Topic", placeholder: "e.g., How I made $10K/month with AI tools", type: "text", required: true },
      { key: "duration", label: "Target Duration", placeholder: "Select duration", type: "select", options: ["Under 3 min (Short)", "5-8 min", "8-12 min", "12-20 min", "20+ min (Long-Form)"] },
      { key: "style", label: "Video Style", placeholder: "Select style", type: "select", options: ["Tutorial/How-To", "Listicle", "Story/Vlog", "Review", "Commentary", "Documentary"] },
      { key: "audience", label: "Target Viewer", placeholder: "e.g., Aspiring entrepreneurs aged 18-35", type: "text", required: true },
      { key: "cta", label: "Primary CTA", placeholder: "e.g., Subscribe, check link in description, join community", type: "text" },
      { key: "keywords", label: "SEO Keywords", placeholder: "e.g., make money online, AI tools, side hustle 2025", type: "text" },
    ],
  },
  {
    id: "tiktok-script",
    name: "TikTok Video Script Generator",
    description: "Create short-form video scripts optimized for engagement and shares",
    category: "Content Creation",
    icon: Film,
    prompt: "Create a TikTok video script with a scroll-stopping hook (first 1-2 seconds), engaging body content with visual/audio cues, trending sound suggestions, caption with hashtags, and a CTA for engagement.",
    inputs: [
      { key: "concept", label: "Video Concept", placeholder: "e.g., Day in the life of a freelance designer", type: "text", required: true },
      { key: "duration", label: "Video Length", placeholder: "Select length", type: "select", options: ["15 seconds", "30 seconds", "60 seconds", "90 seconds", "3 minutes"] },
      { key: "format", label: "Content Format", placeholder: "Select format", type: "select", options: ["Talking Head", "Voiceover + B-Roll", "Text Overlay Only", "POV Style", "Green Screen", "Duet/Stitch"] },
      { key: "goal", label: "Video Goal", placeholder: "Select goal", type: "select", options: ["Go Viral", "Drive Traffic", "Build Authority", "Sell Product", "Grow Followers"] },
      { key: "niche", label: "Your Niche", placeholder: "e.g., Finance tips, day-in-life, tech reviews", type: "text" },
    ],
  },
  {
    id: "faceless-video",
    name: "Faceless Video Idea Generator",
    description: "Generate profitable faceless YouTube channel ideas with monetization strategies",
    category: "Content Creation",
    icon: Lightbulb,
    prompt: "Generate detailed faceless YouTube channel and video ideas including niche validation, content format recommendations, monetization strategies (ads, affiliate, sponsorships), production workflow, and growth timeline estimates.",
    inputs: [
      { key: "niche", label: "Preferred Niche", placeholder: "e.g., Personal finance education", type: "text", required: true },
      { key: "tools", label: "Tools Available", placeholder: "Select tools", type: "select", options: ["AI Voiceover Only", "AI Voiceover + Stock Footage", "Screen Recording", "Animation/Motion Graphics", "All of the Above"] },
      { key: "frequency", label: "Upload Frequency", placeholder: "Select frequency", type: "select", options: ["Daily", "3x/week", "2x/week", "Weekly", "Bi-weekly"] },
      { key: "monetization", label: "Primary Monetization Goal", placeholder: "Select goal", type: "select", options: ["Ad Revenue", "Affiliate Marketing", "Digital Products", "Sponsorships", "All Revenue Streams"] },
      { key: "budget", label: "Monthly Production Budget", placeholder: "Select budget", type: "select", options: ["$0 (Free tools only)", "$10-$50", "$50-$200", "$200+"] },
    ],
  },
  {
    id: "thumbnail-text",
    name: "Thumbnail Text Generator",
    description: "Create attention-grabbing thumbnail text and design concepts",
    category: "Content Creation",
    icon: ImageIcon,
    prompt: "Generate 10+ thumbnail text options with design direction notes including text placement, color psychology, emotion triggers, face expression suggestions, and A/B testing recommendations.",
    inputs: [
      { key: "title", label: "Video Title", placeholder: "e.g., I Tried Dropshipping for 30 Days", type: "text", required: true },
      { key: "niche", label: "Channel Niche", placeholder: "e.g., Business/entrepreneurship", type: "text" },
      { key: "style", label: "Thumbnail Style", placeholder: "Select style", type: "select", options: ["Bold Text + Face", "Before/After", "Numbers/Stats", "Curiosity Gap", "Minimalist", "Cluttered/Busy (MrBeast style)"] },
      { key: "emotion", label: "Target Emotion", placeholder: "Select emotion", type: "select", options: ["Shock/Surprise", "Curiosity", "FOMO", "Excitement", "Controversy"] },
    ],
  },
  {
    id: "blog-post",
    name: "Blog Post Generator",
    description: "Write SEO-optimized blog posts with meta descriptions, headers, and internal linking",
    category: "Content Creation",
    icon: PenTool,
    prompt: "Write a COMPLETE, FULL-LENGTH, SEO-optimized blog post — the entire article fully written out. Include a compelling title (H1), meta description, fully written sections under H2/H3 headers with rich detail, real examples, data points, internal/external linking suggestions, image alt text recommendations, and a conclusion with CTA. Write the FULL article at the requested word count — no shortcuts or summaries.",
    inputs: [
      { key: "topic", label: "Blog Topic", placeholder: "e.g., Best side hustles for 2025", type: "text", required: true },
      { key: "length", label: "Target Word Count", placeholder: "Select length", type: "select", options: ["800-1,200 (Short)", "1,200-2,000 (Medium)", "2,000-3,000 (Long)", "3,000+ (Pillar Content)"] },
      { key: "keywords", label: "Target Keywords", placeholder: "e.g., side hustles 2025, make money online, passive income ideas", type: "text", required: true },
      { key: "intent", label: "Search Intent", placeholder: "Select intent", type: "select", options: ["Informational (How-to)", "Listicle (Best of)", "Comparison", "Review", "Guide/Tutorial"] },
      { key: "audience", label: "Target Reader", placeholder: "e.g., Beginners interested in making extra money", type: "text" },
      { key: "tone", label: "Writing Tone", placeholder: "Select tone", type: "select", options: ["Conversational", "Professional", "Authoritative", "Casual/Fun", "Data-Driven"] },
    ],
  },

  // ── Freelancing ─────────────────────────────────
  {
    id: "fiverr-gig",
    name: "Fiverr Gig Generator",
    description: "Create optimized Fiverr gig titles, descriptions, packages, and FAQ",
    category: "Freelancing",
    icon: Briefcase,
    prompt: "Create a complete, optimized Fiverr gig listing including SEO-friendly title, detailed description, 3-tier package structure (Basic/Standard/Premium) with pricing suggestions, FAQ section, requirements list, and tags.",
    inputs: [
      { key: "service", label: "Service You Offer", placeholder: "e.g., Logo design for startups", type: "text", required: true },
      { key: "experience", label: "Experience Level", placeholder: "Select level", type: "select", options: ["Beginner (< 1 year)", "Intermediate (1-3 years)", "Expert (3-5 years)", "Top-Rated (5+ years)"] },
      { key: "category", label: "Fiverr Category", placeholder: "e.g., Graphics & Design > Logo Design", type: "text" },
      { key: "priceRange", label: "Base Price Range", placeholder: "Select range", type: "select", options: ["$5-$15", "$15-$30", "$30-$50", "$50-$100", "$100-$250", "$250+"] },
      { key: "differentiator", label: "What Makes You Different?", placeholder: "e.g., 24-hour delivery, unlimited revisions, brand strategy included", type: "textarea" },
    ],
  },
  {
    id: "upwork-proposal",
    name: "Upwork Proposal Generator",
    description: "Write winning Upwork proposals tailored to specific job postings",
    category: "Freelancing",
    icon: Send,
    prompt: "Write a winning Upwork proposal that demonstrates understanding of the client's needs, highlights relevant experience, proposes a clear approach/timeline, addresses potential concerns, and includes a confident but not pushy closing.",
    inputs: [
      { key: "jobPost", label: "Job Description (paste it)", placeholder: "Paste the full job posting you want to apply to...", type: "textarea", required: true },
      { key: "experience", label: "Your Relevant Experience", placeholder: "e.g., 5 years of React development, built 20+ web apps for startups", type: "textarea", required: true },
      { key: "rate", label: "Your Hourly Rate", placeholder: "e.g., $45/hour", type: "text" },
      { key: "tone", label: "Proposal Tone", placeholder: "Select tone", type: "select", options: ["Professional", "Conversational", "Confident/Bold", "Collaborative"] },
      { key: "portfolio", label: "Portfolio Links/Highlights", placeholder: "e.g., portfolio.com, GitHub link, or describe relevant projects", type: "textarea" },
    ],
  },
  {
    id: "resume-builder",
    name: "Resume Builder",
    description: "Create ATS-optimized resumes tailored to specific roles and industries",
    category: "Freelancing",
    icon: User,
    prompt: "Build a professional, ATS-optimized resume with a compelling summary, quantified achievements, skills section optimized for the target role, and formatting recommendations. Use action verbs and metrics throughout. If personal details are provided (name, email, phone, location, LinkedIn, portfolio), include them in a professional header section.",
    inputs: [
      { key: "role", label: "Target Role", placeholder: "e.g., Senior Frontend Developer", type: "text", required: true },
      { key: "experience", label: "Work Experience Summary", placeholder: "List your relevant positions, companies, and key achievements...", type: "textarea", required: true },
      { key: "skills", label: "Key Skills", placeholder: "e.g., React, TypeScript, Node.js, Team Leadership, Agile", type: "text", required: true },
      { key: "education", label: "Education", placeholder: "e.g., B.S. Computer Science, University of California, 2018", type: "text" },
      { key: "years", label: "Years of Experience", placeholder: "Select range", type: "select", options: ["0-1 (Entry Level)", "1-3 (Junior)", "3-5 (Mid-Level)", "5-10 (Senior)", "10+ (Principal/Lead)"] },
      { key: "style", label: "Resume Style", placeholder: "Select style", type: "select", options: ["Traditional/Corporate", "Modern/Creative", "Technical/Engineering", "Executive", "Career Changer"] },
      { key: "certifications", label: "Certifications & Awards", placeholder: "e.g., AWS Certified, Google Analytics, PMP", type: "text" },
      { key: "languages", label: "Languages Spoken", placeholder: "e.g., English (native), Spanish (fluent), French (basic)", type: "text" },
      { key: "summary", label: "Professional Summary / Objective", placeholder: "Brief overview of your career goals and value proposition (optional — AI will write one if blank)", type: "textarea" },
    ],
  },
  {
    id: "cover-letter",
    name: "Cover Letter Generator",
    description: "Generate personalized cover letters that match job descriptions",
    category: "Freelancing",
    icon: FileSignature,
    prompt: "Write a personalized, compelling cover letter that connects the candidate's experience to the specific job requirements, demonstrates cultural fit, shows enthusiasm without being generic, and includes a confident closing.",
    inputs: [
      { key: "job", label: "Job Title & Company", placeholder: "e.g., Marketing Manager at Stripe", type: "text", required: true },
      { key: "jobDescription", label: "Job Description (key requirements)", placeholder: "Paste or summarize the key requirements from the job posting...", type: "textarea", required: true },
      { key: "background", label: "Your Background", placeholder: "e.g., 4 years in B2B SaaS marketing, led campaigns that drove 200% MQL growth", type: "textarea", required: true },
      { key: "motivation", label: "Why This Company?", placeholder: "e.g., I admire their developer-first approach and want to contribute to their growth", type: "text" },
      { key: "tone", label: "Letter Tone", placeholder: "Select tone", type: "select", options: ["Professional/Formal", "Conversational/Warm", "Confident/Bold", "Creative/Unique"] },
    ],
  },

  // ── Automation / Business ───────────────────────
  {
    id: "side-hustle-idea",
    name: "Side Hustle Idea Generator",
    description: "Get personalized side hustle ideas based on your skills, budget, and goals",
    category: "Automation",
    icon: Rocket,
    prompt: "Generate personalized side hustle ideas with detailed analysis including startup costs, time investment, income potential timeline, required skills, step-by-step launch plan, and scaling strategies.",
    inputs: [
      { key: "skills", label: "Your Skills & Interests", placeholder: "e.g., Writing, social media, graphic design, coding", type: "text", required: true },
      { key: "time", label: "Available Time Per Week", placeholder: "Select hours", type: "select", options: ["2-5 hours", "5-10 hours", "10-20 hours", "20-30 hours", "Full-time"] },
      { key: "budget", label: "Starting Budget", placeholder: "Select budget", type: "select", options: ["$0 (No investment)", "$50-$200", "$200-$500", "$500-$1,000", "$1,000-$5,000", "$5,000+"] },
      { key: "goal", label: "Income Goal", placeholder: "Select goal", type: "select", options: ["$500/month", "$1,000/month", "$2,500/month", "$5,000/month", "$10,000+/month"] },
      { key: "constraints", label: "Any Constraints?", placeholder: "e.g., Must be remote, no client-facing work, passive income preferred", type: "textarea" },
    ],
  },
  {
    id: "business-name",
    name: "Business Name Generator",
    description: "Generate memorable, brandable business names with logo concepts",
    category: "Automation",
    icon: Building2,
    prompt: "Generate 20+ creative business name ideas with notes on brandability, domain availability likelihood, logo concept direction, tagline suggestions, and social media handle availability assessment.",
    inputs: [
      { key: "type", label: "Business Type", placeholder: "e.g., Sustainable clothing brand", type: "text", required: true },
      { key: "values", label: "Brand Values", placeholder: "e.g., Sustainability, premium quality, inclusivity", type: "text" },
      { key: "style", label: "Name Style", placeholder: "Select style", type: "select", options: ["Single Word (Nike, Apple)", "Two Words (Under Armour)", "Compound (Facebook)", "Abstract (Kodak, Xerox)", "Descriptive (General Electric)", "Founder-Based (Ford, Disney)"] },
      { key: "audience", label: "Target Market", placeholder: "e.g., Eco-conscious millennials", type: "text", required: true },
      { key: "avoid", label: "Names/Styles to Avoid", placeholder: "e.g., Nothing too corporate, avoid puns", type: "text" },
    ],
  },
  {
    id: "business-plan",
    name: "Business Plan Generator",
    description: "Create a structured business plan with financials, marketing, and operations",
    category: "Automation",
    icon: ClipboardList,
    prompt: "Write a COMPLETE, investor-ready business plan with every section fully written out. Include a polished executive summary, detailed market analysis with data, competitive landscape analysis, complete business model description, full marketing strategy with channels and budgets, operations plan, detailed 3-year financial projections with revenue/cost breakdowns, funding requirements with use-of-funds breakdown, and comprehensive risk assessment with mitigation strategies. No placeholders — write the actual plan.",
    // premium removed: now free for all
    inputs: [
      { key: "idea", label: "Business Idea", placeholder: "e.g., Subscription box for plant lovers", type: "text", required: true },
      { key: "stage", label: "Business Stage", placeholder: "Select stage", type: "select", options: ["Just an Idea", "Validated Concept", "Early Revenue", "Growing Business", "Seeking Funding"] },
      { key: "funding", label: "Funding Needed", placeholder: "Select amount", type: "select", options: ["Bootstrapped (< $5K)", "$5K-$25K", "$25K-$100K", "$100K-$500K", "$500K+", "Not Sure"] },
      { key: "market", label: "Target Market", placeholder: "e.g., Urban millennials who love indoor plants, $50B global market", type: "text", required: true },
      { key: "model", label: "Revenue Model", placeholder: "Select model", type: "select", options: ["Subscription", "One-Time Sales", "Freemium", "Marketplace", "SaaS", "Service-Based", "Hybrid"] },
      { key: "timeline", label: "Launch Timeline", placeholder: "Select timeline", type: "select", options: ["1 Month", "3 Months", "6 Months", "1 Year"] },
    ],
  },
  {
    id: "ai-startup",
    name: "AI Startup Generator",
    description: "Generate validated AI startup concepts with market analysis and technical specs",
    category: "Automation",
    icon: Cpu,
    prompt: "Generate a detailed AI startup concept including problem validation, solution architecture, market sizing (TAM/SAM/SOM), competitive analysis, MVP feature set, tech stack recommendations, go-to-market strategy, and fundraising narrative.",
    inputs: [
      { key: "industry", label: "Industry / Problem Area", placeholder: "e.g., Healthcare appointment scheduling", type: "text", required: true },
      { key: "aiType", label: "AI Technology Focus", placeholder: "Select focus", type: "select", options: ["Natural Language Processing", "Computer Vision", "Predictive Analytics", "Generative AI", "Recommendation Systems", "Process Automation", "Let AI Suggest"] },
      { key: "audience", label: "Target Users", placeholder: "e.g., Small medical practices with 1-10 doctors", type: "text", required: true },
      { key: "differentiator", label: "Key Differentiator", placeholder: "e.g., Works with existing EHR systems, no training data needed", type: "text" },
      { key: "budget", label: "Development Budget", placeholder: "Select range", type: "select", options: ["$0 (No-code MVP)", "$5K-$25K", "$25K-$100K", "$100K-$500K", "$500K+"] },
      { key: "timeline", label: "MVP Timeline", placeholder: "Select timeline", type: "select", options: ["1 Month", "3 Months", "6 Months", "12 Months"] },
    ],
  },
  {
    id: "income-strategy",
    name: "Income Strategy Generator",
    description: "Create personalized multi-stream income strategies with action plans",
    category: "Automation",
    icon: TrendingUp,
    prompt: "Create a personalized multi-stream income strategy including active and passive income recommendations, prioritized action plan with timelines, resource requirements, risk assessment for each stream, and milestone targets.",
    inputs: [
      { key: "situation", label: "Current Situation", placeholder: "e.g., Full-time job making $60K, $500/month to invest", type: "text", required: true },
      { key: "skills", label: "Skills & Assets", placeholder: "e.g., Writing, investing basics, own a car, coding skills", type: "text", required: true },
      { key: "goal", label: "Income Goal", placeholder: "Select goal", type: "select", options: ["$500/month extra", "$1,000/month extra", "$2,500/month extra", "$5,000/month extra", "Replace full-time income", "$10,000+/month total"] },
      { key: "timeline", label: "Goal Timeline", placeholder: "Select timeline", type: "select", options: ["3 Months", "6 Months", "1 Year", "2 Years"] },
      { key: "riskTolerance", label: "Risk Tolerance", placeholder: "Select level", type: "select", options: ["Conservative (Low Risk)", "Moderate", "Aggressive (High Risk)"] },
      { key: "preferences", label: "Preferences", placeholder: "e.g., Prefer passive income, no client work, interested in digital products", type: "textarea" },
    ],
  },
];

export const getToolsByCategory = (category: ToolCategory) =>
  tools.filter((t) => t.category === category);

export const getToolById = (id: string) => tools.find((t) => t.id === id);
