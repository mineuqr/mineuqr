import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RouterOutputs } from "@/lib/trpc";
import { History } from "lucide-react";

type DiagnosticRun = RouterOutputs["printOps"]["listDiagnosticRuns"][number];

function formatTimestamp(value: string | null | undefined, isAr: boolean): string {
  if (!value) {
    return isAr ? "-" : "-";
  }
  return value.replace("T", " ").slice(0, 19);
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "accepted") return "secondary";
  return "outline";
}

export function DiagnosticHistoryPanel({
  runs,
  isAr,
  isLoading,
}: {
  runs: DiagnosticRun[] | undefined;
  isAr: boolean;
  isLoading: boolean;
}) {
  if (isLoading) {
    return null;
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          {isAr ? "سجل الطباعة التشخيصية" : "Diagnostic Print History"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(runs?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {isAr ? "لا توجد عمليات طباعة تشخيصية بعد" : "No diagnostic test prints yet"}
          </p>
        ) : (
          <div className="space-y-3">
            {runs?.map((run) => (
              <div key={run.diagnosticId} className="rounded-lg border border-border/30 p-3 text-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs">{run.diagnosticId}</span>
                  <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                </div>
                <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <span>
                    {isAr ? "الطابعة" : "Printer"}: {run.printerId}
                  </span>
                  <span>
                    {isAr ? "الوكيل" : "Agent"}: {run.agentId ?? (isAr ? "غير متوفر" : "n/a")}
                  </span>
                  <span>
                    {isAr ? "بواسطة" : "Triggered by"}: {run.triggeredByLabel}
                  </span>
                  <span>
                    {isAr ? "وقت الإرسال" : "Submitted"}: {formatTimestamp(run.createdAt, isAr)}
                  </span>
                  {run.completedAt ? (
                    <span>
                      {isAr ? "اكتمل" : "Completed"}: {formatTimestamp(run.completedAt, isAr)}
                    </span>
                  ) : null}
                </div>
                {run.error ? (
                  <p className="mt-2 text-xs text-destructive">{run.error}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
