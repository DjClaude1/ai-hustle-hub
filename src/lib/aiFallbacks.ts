const normalizeLine = (line: string) =>
  line
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const SECTION_ALIASES = {
  summary: ["summary", "professional summary", "profile", "objective"],
  experience: ["experience", "work experience", "employment history", "professional experience"],
  education: ["education", "academic background", "qualifications"],
  skills: ["skills", "technical skills", "core competencies", "competencies"],
};

const allSectionAliases = Object.values(SECTION_ALIASES).flat();

const matchesSectionHeading = (line: string, aliases: string[]) => {
  const normalized = normalizeLine(line);
  return aliases.some(
    (alias) => normalized === alias || normalized.startsWith(`${alias} `) || normalized.endsWith(` ${alias}`),
  );
};

const isSectionHeading = (line: string) => matchesSectionHeading(line, allSectionAliases);

const extractSection = (lines: string[], aliases: string[]) => {
  const startIndex = lines.findIndex((line) => matchesSectionHeading(line, aliases));
  if (startIndex === -1) return "";

  const collected: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      if (collected.length && collected[collected.length - 1] !== "") collected.push("");
      continue;
    }
    if (isSectionHeading(line)) break;
    collected.push(line);
  }

  return collected.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

const extractTopLine = (lines: string[], predicate: (line: string) => boolean) => lines.find(predicate) ?? "";

export const isAiCreditsError = (error: unknown, status?: number) => {
  if (status === 402) return true;
  if (!error) return false;

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const nestedResponse = (record.response as Record<string, unknown> | undefined) ?? undefined;
    const errorStatus = Number(record.status ?? record.statusCode ?? nestedResponse?.status ?? NaN);
    const message = String(record.message ?? record.error ?? record.details ?? "");

    if (errorStatus === 402 || record.code === 402 || record.code === "402") return true;
    return /credits exhausted|payment required|\b402\b/i.test(message);
  }

  return /credits exhausted|payment required|\b402\b/i.test(String(error));
};

export const buildManualGenerationBrief = ({
  toolName,
  toolPrompt,
  userInput,
}: {
  toolName: string;
  toolPrompt: string;
  userInput: string;
}) => {
  const safeUserInput = userInput.trim() || "No additional user requirements were provided.";

  return [
    "AI generation is temporarily unavailable in the app because the workspace AI balance is empty.",
    "Use the complete brief below in ChatGPT, OpenAI, or another LLM so you can keep working right away.",
    "",
    `Tool: ${toolName}`,
    "",
    "Task:",
    toolPrompt,
    "",
    "User requirements:",
    safeUserInput,
    "",
    "Output requirements:",
    "- Return the final deliverable, not an outline.",
    "- Follow the task and user requirements exactly.",
    "- Make the result detailed, polished, and ready to use.",
  ].join("\n");
};

export const buildOfflineImagePrompt = ({
  context,
  style,
  useCase,
  negativePrompt,
}: {
  context: string;
  style: string;
  useCase: string;
  negativePrompt?: string;
}) => {
  const parts = [
    context.trim() || "digital product artwork",
    useCase ? `for ${useCase}` : "",
    `${style.toLowerCase()} style`,
    "clean composition",
    "professional lighting",
    "high detail",
    "sharp focus",
  ].filter(Boolean);

  if (negativePrompt?.trim()) {
    parts.push(`avoid ${negativePrompt.trim()}`);
  }

  return parts.join(", ");
};

export const buildFallbackSocialCaption = ({ toolName, output }: { toolName: string; output: string }) => {
  const snippet = output.replace(/\s+/g, " ").trim();
  const cleanedSnippet = snippet.length > 90 ? `${snippet.slice(0, 87).trimEnd()}…` : snippet;
  const base = cleanedSnippet
    ? `Just created a ${toolName} result: ${cleanedSnippet}`
    : `Just created a new ${toolName} result.`;
  const caption = `${base} What would you improve first?`;
  return caption.length > 220 ? `${caption.slice(0, 217).trimEnd()}…` : caption;
};

export const extractBasicCvData = (cvText: string) => {
  const sanitizedText = cvText.replace(/\r/g, "");
  const lines = sanitizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const topLines = lines.slice(0, 10);
  const email = sanitizedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone = sanitizedText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? "";
  const linkedIn = sanitizedText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0] ?? "";
  const urls = sanitizedText.match(/(?:https?:\/\/)?(?:www\.)?[A-Z0-9.-]+\.[A-Z]{2,}(?:\/[^\s)]*)?/gi) ?? [];
  const portfolio = urls.find((url) => !/linkedin\.com/i.test(url) && !/mailto:/i.test(url)) ?? "";

  const fullName = extractTopLine(
    topLines,
    (line) =>
      /^[A-Za-z][A-Za-z'.,\-\s]{2,60}$/.test(line) &&
      line.split(/\s+/).length >= 2 &&
      line.split(/\s+/).length <= 4 &&
      !/@|https?:\/\//i.test(line) &&
      !isSectionHeading(line),
  );

  const role = extractTopLine(
    topLines,
    (line) =>
      line !== fullName &&
      !/@|https?:\/\//i.test(line) &&
      !/\d/.test(line) &&
      line.length <= 80 &&
      !isSectionHeading(line),
  );

  const location = extractTopLine(
    topLines,
    (line) =>
      line !== fullName &&
      line !== role &&
      !/@|https?:\/\//i.test(line) &&
      !/\d{3,}/.test(line) &&
      (line.includes(",") || /remote|south africa|usa|uk|canada|australia|europe/i.test(line)),
  );

  const summary = extractSection(lines, SECTION_ALIASES.summary);
  const experience = extractSection(lines, SECTION_ALIASES.experience);
  const education = extractSection(lines, SECTION_ALIASES.education);
  const skillsRaw = extractSection(lines, SECTION_ALIASES.skills);
  const skills = skillsRaw
    ? Array.from(
        new Set(
          skillsRaw
            .split(/\n|,/)
            .map((item) => item.replace(/^[-•*]\s*/, "").trim())
            .filter(Boolean),
        ),
      )
        .slice(0, 16)
        .join(", ")
    : "";

  return {
    fullName,
    email,
    phone,
    location,
    linkedIn,
    portfolio,
    role,
    experience,
    skills,
    education,
    summary,
  };
};
