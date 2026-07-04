import { useState } from "react";
import { Download, FileText, FileCode, FileType, FileType2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { downloadDOCX, downloadMarkdown, downloadPDF, downloadText } from "@/lib/downloads";

interface DownloadMenuProps {
  content: string;
  filename: string;
  previewRef?: React.RefObject<HTMLElement>;
  size?: "sm" | "default";
  variant?: "outline" | "hero" | "accent" | "default";
}

export const DownloadMenu = ({
  content,
  filename,
  previewRef,
  size = "sm",
  variant = "outline",
}: DownloadMenuProps) => {
  const [busy, setBusy] = useState<null | "txt" | "md" | "pdf" | "docx">(null);

  const run = async (fmt: "txt" | "md" | "pdf" | "docx") => {
    if (!content?.trim()) {
      toast.error("Nothing to download yet.");
      return;
    }
    setBusy(fmt);
    try {
      if (fmt === "txt") downloadText(content, filename);
      else if (fmt === "md") downloadMarkdown(content, filename);
      else if (fmt === "pdf") await downloadPDF(previewRef?.current ?? null, filename, content);
      else if (fmt === "docx") await downloadDOCX(content, filename);
      toast.success(`Downloaded ${fmt.toUpperCase()}`);
    } catch (e) {
      console.error("Download failed", e);
      toast.error(`Could not export ${fmt.toUpperCase()}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-1.5">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => run("txt")} disabled={!!busy}>
          <FileText className="h-4 w-4" /> Plain text (.txt)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("md")} disabled={!!busy}>
          <FileCode className="h-4 w-4" /> Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("pdf")} disabled={!!busy}>
          <FileType className="h-4 w-4" /> PDF (.pdf)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("docx")} disabled={!!busy}>
          <FileType2 className="h-4 w-4" /> Word (.docx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
