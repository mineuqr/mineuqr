import { HealthStatusBadge } from "@/components/print-workspace/HealthStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";

export function WorkspaceDiagnosticsSection({
  restaurantId,
  language,
  enabled,
  expanded,
  onExpandedChange,
}: {
  restaurantId: number;
  language: string;
  enabled: boolean;
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
}) {
  const isAr = language === "ar";
  const [adminMode, setAdminMode] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const summaryQuery = trpc.printWorkspace.read.getDiagnosticsSummary.useQuery(
    { restaurantId },
    { enabled: enabled && restaurantId > 0, refetchInterval: 30_000 }
  );

  const reportQuery = trpc.printWorkspace.read.getTechnicalReport.useQuery(
    { restaurantId },
    { enabled: reportOpen && enabled && restaurantId > 0 }
  );

  const cards = summaryQuery.data?.cards ?? [];

  const exportReport = () => {
    if (!reportQuery.data) return;
    const blob = new Blob([JSON.stringify(reportQuery.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mineuqr-print-diagnostics-${restaurantId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!expanded) {
    return null;
  }

  return (
    <div className="space-y-4">
      {summaryQuery.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-white">{card.title}</p>
                <HealthStatusBadge state={card.status} language={language} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{card.detail}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setReportOpen(true)}>
          <FileText className="h-4 w-4 me-1" />
          {isAr ? "عرض التقرير التقني" : "View Technical Report"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!reportQuery.data}
          onClick={exportReport}
        >
          <Download className="h-4 w-4 me-1" />
          {isAr ? "تصدير التشخيص" : "Export Diagnostics"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={adminMode ? "default" : "ghost"}
          onClick={() => setAdminMode((v) => !v)}
        >
          {isAr ? "وضع المسؤول" : "Administrator mode"}
        </Button>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-slate-800 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>{isAr ? "التقرير التقني" : "Technical Report"}</DialogTitle>
          </DialogHeader>
          {reportQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : reportQuery.data ? (
            <TechnicalReportView data={reportQuery.data} adminMode={adminMode} language={language} />
          ) : (
            <p className="text-sm text-slate-400">
              {isAr ? "لا تتوفر بيانات." : "No data available."}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TechnicalReportView({
  data,
  adminMode,
  language,
}: {
  data: Record<string, unknown>;
  adminMode: boolean;
  language: string;
}) {
  const isAr = language === "ar";
  const sections = [
    { key: "connector", label: isAr ? "الموصل" : "Connector" },
    { key: "session", label: isAr ? "الجلسة" : "Session" },
    { key: "printer", label: isAr ? "الطابعة" : "Printer" },
  ] as const;

  return (
    <div className="space-y-4 text-sm">
      <p className="text-xs text-slate-500">
        {isAr ? "تم التقييم: " : "Evaluated: "}
        {String(data.evaluatedAt ?? "—")}
      </p>
      {sections.map(({ key, label }) => {
        const section = data[key];
        if (!section || typeof section !== "object") {
          return (
            <div key={key} className="rounded-lg border border-slate-800 p-3">
              <p className="font-medium text-white">{label}</p>
              <p className="mt-1 text-slate-500">{isAr ? "غير متوفر" : "Not available"}</p>
            </div>
          );
        }
        return (
          <div key={key} className="rounded-lg border border-slate-800 p-3">
            <p className="mb-2 font-medium text-white">{label}</p>
            <dl className="space-y-1">
              {flattenEntries(section as Record<string, unknown>, adminMode ? 4 : 2).map(
                ([path, value]) => (
                  <div key={path} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2">
                    <dt className="text-xs text-slate-500">{path}</dt>
                    <dd className={cn("text-xs text-slate-300", !adminMode && "truncate")}>
                      {formatValue(value)}
                    </dd>
                  </div>
                )
              )}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

function flattenEntries(
  obj: Record<string, unknown>,
  maxDepth: number,
  prefix = "",
  depth = 0
): [string, unknown][] {
  if (depth >= maxDepth) {
    return [[prefix || "value", obj]];
  }
  const entries: [string, unknown][] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      entries.push(...flattenEntries(value as Record<string, unknown>, maxDepth, path, depth + 1));
    } else {
      entries.push([path, value]);
    }
  }
  return entries;
}

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
