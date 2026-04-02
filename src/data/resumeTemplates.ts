export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  style: string;
  premium: boolean;
  promptAddon: string;
}

export const resumeTemplates: ResumeTemplate[] = [
  {
    id: "classic-professional",
    name: "Classic Professional",
    description: "Clean, traditional layout perfect for corporate and established industries",
    style: "Traditional",
    premium: false,
    promptAddon: "Format this resume in a CLASSIC PROFESSIONAL style: clean serif-style formatting, traditional section order (Contact → Summary → Experience → Education → Skills), conservative layout with clear section dividers, bullet points for achievements. Use a formal, polished tone.",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Sleek, minimalist design with generous whitespace and modern typography",
    style: "Modern",
    premium: false,
    promptAddon: "Format this resume in a MODERN MINIMALIST style: clean sans-serif formatting, plenty of whitespace, two-column layout suggestion (sidebar for skills/contact, main area for experience), subtle section headers, modern bullet style. Keep it elegant and uncluttered.",
  },
  {
    id: "tech-focused",
    name: "Tech & Engineering",
    description: "Optimized for technical roles with prominent skills and project sections",
    style: "Technical",
    premium: false,
    promptAddon: "Format this resume in a TECHNICAL/ENGINEERING style: prominent technical skills section with categorized skill groups, dedicated projects section, GitHub/portfolio links highlighted, concise achievement-focused bullets with metrics, monospace formatting for technical terms.",
  },
  {
    id: "executive-suite",
    name: "Executive Suite",
    description: "Elegant, authoritative design for C-level and senior leadership positions",
    style: "Executive",
    premium: true,
    promptAddon: "Format this resume in an EXECUTIVE SUITE style: commanding presence with bold name header, executive summary (not objective), board memberships and advisory roles section, P&L responsibility highlights, strategic initiative focus, leadership philosophy statement, industry recognition section.",
  },
  {
    id: "creative-portfolio",
    name: "Creative Portfolio",
    description: "Bold, visually striking layout for designers, artists, and creative professionals",
    style: "Creative",
    premium: true,
    promptAddon: "Format this resume in a CREATIVE PORTFOLIO style: visually distinctive layout with creative section headers, portfolio highlights section with project descriptions, creative skills visualization suggestions, personal brand statement, awards and exhibitions section, unconventional but professional formatting.",
  },
  {
    id: "academic-research",
    name: "Academic & Research",
    description: "Scholarly format with publications, research, and teaching sections",
    style: "Academic",
    premium: true,
    promptAddon: "Format this resume as an ACADEMIC CV: include Publications section (formatted in APA/IEEE style), Research Experience, Teaching Experience, Grants & Funding, Conference Presentations, Professional Memberships, Research Interests, and Academic Service sections. Use formal academic tone.",
  },
  {
    id: "startup-disruptor",
    name: "Startup Disruptor",
    description: "Dynamic layout showcasing impact metrics and growth stories",
    style: "Startup",
    premium: true,
    promptAddon: "Format this resume in a STARTUP DISRUPTOR style: lead with impact metrics and growth numbers, include a 'Key Wins' highlight reel at top, startup-friendly language, emphasis on versatility and wearing multiple hats, revenue/growth metrics prominently featured, side projects and entrepreneurial ventures section.",
  },
  {
    id: "federal-government",
    name: "Federal & Government",
    description: "Compliant format for government and public sector applications",
    style: "Government",
    premium: true,
    promptAddon: "Format this resume in FEDERAL/GOVERNMENT style: detailed and comprehensive (longer format is expected), include citizenship status placeholder, security clearance section, KSAs (Knowledge, Skills, and Abilities), GS grade targeting, compliance-focused language, detailed duties and accomplishments for each role.",
  },
  {
    id: "career-changer",
    name: "Career Transition",
    description: "Strategic layout that emphasizes transferable skills over chronology",
    style: "Transition",
    premium: true,
    promptAddon: "Format this resume for a CAREER TRANSITION: lead with a compelling career pivot narrative, use a functional/combination format emphasizing transferable skills over chronological history, include a 'Relevant Skills & Achievements' section grouped by competency area, bridge statement connecting past experience to target role.",
  },
  {
    id: "international-multilingual",
    name: "International & Multilingual",
    description: "Globally-oriented format for international roles and multilingual professionals",
    style: "International",
    premium: true,
    promptAddon: "Format this resume for INTERNATIONAL roles: prominent language proficiency section with CEFR levels, international experience highlights, cross-cultural competencies, work authorization section, global project experience, timezone flexibility, cross-border collaboration examples, localization awareness.",
  },
];

export const getFreeTemplates = () => resumeTemplates.filter((t) => !t.premium);
export const getAllTemplates = () => resumeTemplates;
export const getTemplateById = (id: string) => resumeTemplates.find((t) => t.id === id);
