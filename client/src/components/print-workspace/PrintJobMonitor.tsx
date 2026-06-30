import { Button } from "@/components/ui/button";
import type { PrintWorkspaceActionHandle } from "@/lib/print-workspace/usePrintWorkspaceActions";
import {
  canCancelPrintJob,
  canMarkPrinted,
  canRetryPrint,
  canStartPrint,
  derivePrintJobTimeline,
  formatPrintJobTimestamp,
  isActivePrintJobStatus,
  operatorPrintErrorMessage,
  printAttemptOutcomeLabel,
  printJobLiveStatusLabel,
  printJobMonitorTone,
  printJobSourceLabel,
  printJobStatusLabel,
  selectPrimaryPrintJob,
  type PrintWorkspacePrintJob,
} from "@/lib/print-workspace/printJobViewModels";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Printer,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

const TONE_STYLES = {
  neutral: {
    border: "border-slate-800",
    bg: "bg-slate-900/40",
    accent: "text-slate-300",
  },
  progress: {
    border: "border-sky-500/35",
    bg: "bg-sky-500/8",
    accent: "text-sky-200",
  },
  success: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    accent: "text-emerald-300",
  },
  failed: {
    border: "border-red-500/35",
    bg: "bg-red-500/8",
    accent: "text-red-200",
  },
  cancelled: {
    border: "border-slate-600/50",
    bg: "bg-slate-800/40",
    accent: "text-slate-300",
  },
} as const;

function TimelineStep({
  step,
  isLast,
}: {
  step: ReturnType<typeof derivePrintJobTimeline>[number];
  isLast: boolean;
}) {
  const dotClass = cn(
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
    step.state === "complete" && "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
    step.state === "current" && "border-sky-500/50 bg-sky-500/15 text-sky-200",
    step.state === "upcoming" && "border-slate-700 bg-slate-900/60 text-slate-500",
    step.state === "failed" && "border-red-500/50 bg-red-500/15 text-red-200",
    step.state === "cancelled" && "border-slate-600 bg-slate-800/80 text-slate-400"
  );

  return (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      <div className="flex flex-col items-center">
        <div className={dotClass}>
          {step.state === "current" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {step.state === "complete" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          {step.state === "failed" ? <XCircle className="h-3.5 w-3.5" /> : null}
          {step.state === "cancelled" ? <Ban className="h-3.5 w-3.5" /> : null}
          {step.state === "upcoming" ? "·" : null}
        </div>
        {!isLast ? <div className="mt-1 h-8 w-px bg-slate-700/80" /> : null}
      </div>
      <div className="min-w-0 pb-4">
        <p
          className={cn(
            "text-sm font-medium",
            step.state === "current"
              ? "text-white"
              : step.state === "failed"
                ? "text-red-200"
                : step.state === "cancelled"
                  ? "text-slate-400"
                  : step.state === "complete"
                    ? "text-emerald-300"
                    : "text-slate-500"
          )}
        >
          {step.label}
        </p>
      </div>
    </div>
  );
}

export function PrintJobMonitor({
  language,
  restaurantId,
  orderId,
  orderNumber,
  printJobs,
  printingReady,
  actions,
  isRefreshing,
}: {
  language: string;
  restaurantId: number;
  orderId: number;
  orderNumber: string;
  printJobs: PrintWorkspacePrintJob[];
  printingReady: boolean;
  actions: PrintWorkspaceActionHandle;
  isRefreshing?: boolean;
}) {
  const isAr = language === "ar";
  const [detailsOpen, setDetailsOpen] = useState(false);

  const primaryJob = useMemo(() => selectPrimaryPrintJob(printJobs), [printJobs]);
  const tone = printJobMonitorTone(primaryJob);
  const styles = TONE_STYLES[tone];
  const timeline = primaryJob ? derivePrintJobTimeline(primaryJob, language) : [];
  const friendlyError = operatorPrintErrorMessage(primaryJob?.lastError, language);
  const showProgress = primaryJob != null && isActivePrintJobStatus(primaryJob.status);

  const historyAttempts = useMemo(() => {
    const rows = printJobs.flatMap((job) =>
      job.attempts.map((attempt) => ({
        ...attempt,
        printerName: job.printerName,
        jobStatus: job.status,
        jobSource: job.source,
      }))
    );
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [printJobs]);

  const actionContext = { restaurantId, orderId, orderNumber };

  const handleRetry = () => {
    void actions.reprint(actionContext);
  };

  const handlePrint = () => {
    void actions.printOrder(actionContext);
  };

  const showFailurePanel = primaryJob?.status === "failed";
  const showCancelledPanel = primaryJob?.status === "cancelled";

  return (
    <div className={cn("rounded-xl border p-4 sm:p-5", styles.border, styles.bg)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isAr ? "حالة الطباعة" : "Print status"}
          </p>
          {primaryJob ? (
            <p className={cn("text-lg font-semibold", styles.accent)}>
              {printJobLiveStatusLabel(primaryJob, language)}
            </p>
          ) : (
            <p className="text-lg font-semibold text-slate-300">
              {isAr ? "لم تتم طباعة هذا الطلب بعد." : "This order has not been printed yet."}
            </p>
          )}
        </div>
        {showProgress || isRefreshing ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
            {isAr ? "جاري التحديث…" : "Updating…"}
          </div>
        ) : null}
      </div>

      {primaryJob ? (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">{isAr ? "الوقت" : "Time"}</dt>
            <dd className="text-slate-200">
              {formatPrintJobTimestamp(
                primaryJob.completedAt ??
                  primaryJob.printingAt ??
                  primaryJob.dispatchedAt ??
                  primaryJob.createdAt,
                language
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{isAr ? "الطابعة" : "Printer"}</dt>
            <dd className="text-slate-200">
              {primaryJob.printerName ?? (isAr ? "غير معروفة" : "Unknown")}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{isAr ? "المحاولات" : "Attempts"}</dt>
            <dd className="text-slate-200">{primaryJob.attemptCount}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{isAr ? "المصدر" : "Source"}</dt>
            <dd className="text-slate-200">
              {printJobSourceLabel(primaryJob.source, language)}
            </dd>
          </div>
        </dl>
      ) : null}

      {primaryJob ? (
        <div className="mt-5 flex flex-wrap gap-4">
          {timeline.map((step, index) => (
            <TimelineStep
              key={step.id}
              step={step}
              isLast={index === timeline.length - 1}
            />
          ))}
        </div>
      ) : null}

      {showFailurePanel ? (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/8 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-medium text-red-100">
                {isAr ? "فشلت الطباعة." : "Printing failed."}
              </p>
              <p className="text-sm leading-relaxed text-red-100/90">
                {friendlyError ??
                  (isAr
                    ? "تحقق من الطابعة ثم أعد المحاولة."
                    : "Check your printer, then try again.")}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  disabled={!printingReady || actions.isBusy}
                  onClick={handleRetry}
                >
                  <RotateCcw className="h-4 w-4 me-1" />
                  {isAr ? "إعادة الطباعة" : "Retry print"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDetailsOpen((open) => !open)}
                >
                  {detailsOpen ? (
                    <ChevronUp className="h-4 w-4 me-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 me-1" />
                  )}
                  {isAr ? "عرض التفاصيل" : "View details"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showCancelledPanel ? (
        <p className="mt-4 text-sm text-slate-400">
          {isAr
            ? "تم إلغاء هذه الطباعة. يمكنك إعادة الطباعة عند الحاجة."
            : "This print was cancelled. You can reprint when needed."}
        </p>
      ) : null}

      {!showFailurePanel ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {canStartPrint(printJobs, printingReady) ? (
            <Button
              type="button"
              size="sm"
              variant="default"
              disabled={actions.isBusy}
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 me-1" />
              {isAr ? "طباعة" : "Print"}
            </Button>
          ) : null}
          {canRetryPrint(primaryJob) && !showFailurePanel ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!printingReady || actions.isBusy}
              onClick={handleRetry}
            >
              <RotateCcw className="h-4 w-4 me-1" />
              {isAr ? "إعادة الطباعة" : "Reprint"}
            </Button>
          ) : null}
          {primaryJob?.status === "printed" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!printingReady || actions.isBusy}
              onClick={handleRetry}
            >
              <RotateCcw className="h-4 w-4 me-1" />
              {isAr ? "إعادة الطباعة" : "Reprint"}
            </Button>
          ) : null}
          {canCancelPrintJob(primaryJob) ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={actions.isBusy}
              onClick={() => void actions.cancelPrint(actionContext)}
            >
              <Ban className="h-4 w-4 me-1" />
              {isAr ? "إلغاء الطباعة" : "Cancel print"}
            </Button>
          ) : null}
          {canMarkPrinted(primaryJob) ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={actions.isBusy}
              onClick={() => void actions.markPrinted(actionContext)}
            >
              <CheckCircle2 className="h-4 w-4 me-1" />
              {isAr ? "تعيين كمطبوع" : "Mark printed"}
            </Button>
          ) : null}
          {!showFailurePanel && historyAttempts.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setDetailsOpen((open) => !open)}
            >
              {detailsOpen ? (
                <ChevronUp className="h-4 w-4 me-1" />
              ) : (
                <ChevronDown className="h-4 w-4 me-1" />
              )}
              {isAr ? "عرض التفاصيل" : "View details"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {detailsOpen && historyAttempts.length > 0 ? (
        <div className="mt-5 border-t border-slate-800 pt-4">
          <p className="mb-3 text-sm font-medium text-slate-300">
            {isAr ? "سجل الطباعة" : "Print history"}
          </p>
          <ul className="space-y-2">
            {historyAttempts.map((attempt) => {
              const attemptError = operatorPrintErrorMessage(attempt.errorMessage, language);
              return (
                <li
                  key={`${attempt.attemptNumber}-${attempt.createdAt}`}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">
                        {printJobStatusLabel(attempt.status, language)} ·{" "}
                        {printAttemptOutcomeLabel(attempt.outcome, language)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatPrintJobTimestamp(attempt.createdAt, language)}
                        {attempt.printerName
                          ? ` · ${attempt.printerName}`
                          : null}
                      </p>
                    </div>
                  </div>
                  {attemptError ? (
                    <p className="mt-2 text-xs leading-relaxed text-red-200/90">{attemptError}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
