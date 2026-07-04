// Universal download helpers: TXT, Markdown, PDF (from a rendered DOM node),
// and DOCX (from markdown-ish source).
import { saveAs } from "file-saver";

export const downloadText = (text: string, filename: string) => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  saveAs(blob, filename.endsWith(".txt") ? filename : `${filename}.txt`);
};

export const downloadMarkdown = (text: string, filename: string) => {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, filename.endsWith(".md") ? filename : `${filename}.md`);
};

export const downloadPDF = async (
  node: HTMLElement | null,
  filename: string,
  fallbackText?: string,
) => {
  // Lazy-load html2pdf.js so it doesn't bloat initial bundle
  const html2pdf: any = (await import("html2pdf.js")).default;
  const target = node ?? document.createElement("div");
  if (!node && fallbackText) target.innerText = fallbackText;
  await html2pdf()
    .set({
      margin: [12, 12, 12, 12],
      filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
      image: { type: "jpeg", quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    })
    .from(target)
    .save();
};

// Very lightweight markdown → DOCX (headings, bold, italic, lists, paragraphs)
export const downloadDOCX = async (markdown: string, filename: string) => {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    LevelFormat,
  } = await import("docx");

  const parseInline = (line: string) => {
    const runs: any[] = [];
    // Split on **bold** and *italic*
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) runs.push(new TextRun(line.slice(last, m.index)));
      const tok = m[0];
      if (tok.startsWith("**")) {
        runs.push(new TextRun({ text: tok.slice(2, -2), bold: true }));
      } else {
        runs.push(new TextRun({ text: tok.slice(1, -1), italics: true }));
      }
      last = m.index + tok.length;
    }
    if (last < line.length) runs.push(new TextRun(line.slice(last)));
    return runs.length ? runs : [new TextRun(line)];
  };

  const paragraphs: any[] = [];
  const lines = markdown.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ children: [new TextRun("")] }));
      continue;
    }
    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: parseInline(line.slice(2)),
        }),
      );
      continue;
    }
    if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: parseInline(line.slice(3)),
        }),
      );
      continue;
    }
    if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: parseInline(line.slice(4)),
        }),
      );
      continue;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: parseInline(bullet[1]),
        }),
      );
      continue;
    }
    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (numbered) {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: parseInline(numbered[1]),
        }),
      );
      continue;
    }
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: parseInline(line),
      }),
    );
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "numbers",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
    },
    sections: [{ children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
};
