/**
 * REPORTING-PRODUCT-HOTFIX-1 — Sticky Reporting header export toolbar (presentation).
 * Relocates Excel actions; does not change export generation.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FileSpreadsheet } from "lucide-react";

export function ReportingExcelToolbar({
  language,
  onExportMonth,
  onExportYear,
  upgradeSlot,
  className,
  toolbarId,
}: {
  language: string;
  onExportMonth: () => void;
  onExportYear: () => void;
  upgradeSlot?: ReactNode;
  className?: string;
  toolbarId?: string;
}) {
  const isAr = language === "ar";

  return (
    <div
      id={toolbarId}
      className={cn(
        "flex flex-col gap-2 rounded-2xl border border-slate-700/50 bg-slate-900/70 p-3 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:p-3.5",
        className
      )}
      role="region"
      aria-label={isAr ? "شريط تصدير التقارير" : "Reporting export toolbar"}
    >
      <div className="flex min-w-0 items-center gap-2 text-slate-300">
        <FileSpreadsheet
          className="h-4 w-4 shrink-0 text-emerald-400"
          aria-hidden
        />
        <p className="text-xs font-medium sm:text-sm">
          {isAr ? "تصدير Excel" : "Excel export"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExportMonth}
          className="min-h-10 rounded-xl border border-green-500/30 bg-green-500/10 px-3.5 py-2 text-sm font-medium text-green-400 motion-safe:transition hover:bg-green-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/40"
        >
          {isAr ? "Excel لهذا الشهر" : "Excel for this month"}
        </button>
        <button
          type="button"
          onClick={onExportYear}
          className="min-h-10 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-sm font-medium text-cyan-400 motion-safe:transition hover:bg-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
        >
          {isAr ? "Excel لهذه السنة" : "Excel for this year"}
        </button>
      </div>
      {upgradeSlot ? <div className="w-full">{upgradeSlot}</div> : null}
    </div>
  );
}
