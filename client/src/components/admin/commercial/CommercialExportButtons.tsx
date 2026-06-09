import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { downloadReportFile } from "@/lib/admin/downloadReportFile";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type CommercialExportButtonsProps = {
  locale: "en" | "ar";
  disabled?: boolean;
  variant?: "outline" | "default";
  size?: "sm" | "default";
};

export function CommercialExportButtons({
  locale,
  disabled = false,
  variant = "outline",
  size = "sm",
}: CommercialExportButtonsProps) {
  const { t, language } = useLanguage();
  const exportMutation = trpc.admin.exportCommercialReport.useMutation({
    onSuccess: (file) => {
      downloadReportFile(file);
      toast.success(t("common.exported") || "Exported successfully");
    },
    onError: (error) => {
      toast.error(error.message || t("common.error"));
    },
  });

  const runExport = (format: "csv" | "xlsx" | "pdf") => {
    exportMutation.mutate({ format, locale: language === "ar" ? "ar" : "en" });
  };

  const busy = disabled || exportMutation.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={busy} className="shrink-0 shadow-sm">
          <Download className="h-4 w-4" />
          {t("common.export") || "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => runExport("csv")} disabled={busy}>
          <FileText className="me-2 h-4 w-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runExport("xlsx")} disabled={busy}>
          <FileSpreadsheet className="me-2 h-4 w-4" />
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runExport("pdf")} disabled={busy}>
          <FileText className="me-2 h-4 w-4" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
