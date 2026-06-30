import type { RouterOutputs } from "@/lib/trpc";
import { formatTimestamp } from "@/lib/print-workspace/viewModels";

export type PrintWorkspacePrintJob =
  RouterOutputs["printWorkspace"]["read"]["getOrderDetail"] extends infer D
    ? D extends { printJobs: infer J }
      ? J extends (infer Item)[]
        ? Item
        : never
      : never
    : never;

export type PrintWorkspacePrintAttempt = PrintWorkspacePrintJob["attempts"][number];

export type PrintJobStatus =
  | "pending"
  | "dispatched"
  | "printing"
  | "printed"
  | "failed"
  | "cancelled";

const ACTIVE_STATUSES = new Set<PrintJobStatus>(["pending", "dispatched", "printing"]);
const CANCELLABLE_STATUSES = new Set<PrintJobStatus>(["pending", "dispatched", "printing"]);
const MARK_PRINTED_STATUSES = new Set<PrintJobStatus>(["dispatched", "printing"]);

export function isActivePrintJobStatus(status: string): status is PrintJobStatus {
  return ACTIVE_STATUSES.has(status as PrintJobStatus);
}

export function selectPrimaryPrintJob(jobs: PrintWorkspacePrintJob[]): PrintWorkspacePrintJob | null {
  if (jobs.length === 0) return null;
  const sorted = [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return sorted.find((job) => isActivePrintJobStatus(job.status)) ?? sorted[0] ?? null;
}

export function hasActivePrintJob(jobs: PrintWorkspacePrintJob[]): boolean {
  return jobs.some((job) => isActivePrintJobStatus(job.status));
}

export function printJobStatusLabel(status: string, language: string): string {
  const isAr = language === "ar";
  const map: Record<PrintJobStatus, { en: string; ar: string }> = {
    pending: { en: "Queued", ar: "في الانتظار" },
    dispatched: { en: "Sending", ar: "جاري الإرسال" },
    printing: { en: "Printing", ar: "جاري الطباعة" },
    printed: { en: "Printed", ar: "تمت الطباعة" },
    failed: { en: "Failed", ar: "فشلت" },
    cancelled: { en: "Cancelled", ar: "أُلغيت" },
  };
  const entry = map[status as PrintJobStatus];
  if (!entry) return status;
  return isAr ? entry.ar : entry.en;
}

export function printJobLiveStatusLabel(job: PrintWorkspacePrintJob, language: string): string {
  const isAr = language === "ar";
  switch (job.status as PrintJobStatus) {
    case "pending":
      return isAr ? "في الانتظار…" : "Queued…";
    case "dispatched":
      return isAr ? "جاري الإرسال إلى الطابعة…" : "Sending to printer…";
    case "printing":
      return isAr ? "جاري الطباعة…" : "Printing…";
    case "printed":
      return isAr ? "تمت الطباعة بنجاح" : "Printed successfully";
    case "failed":
      return isAr ? "فشلت الطباعة" : "Print failed";
    case "cancelled":
      return isAr ? "أُلغيت الطباعة" : "Print cancelled";
    default:
      return printJobStatusLabel(job.status, language);
  }
}

export function printAttemptOutcomeLabel(outcome: string, language: string): string {
  const isAr = language === "ar";
  const map: Record<string, { en: string; ar: string }> = {
    in_progress: { en: "In progress", ar: "قيد التنفيذ" },
    success: { en: "Success", ar: "نجحت" },
    failure: { en: "Failed", ar: "فشلت" },
    cancelled: { en: "Cancelled", ar: "أُلغيت" },
  };
  const entry = map[outcome];
  if (!entry) return outcome;
  return isAr ? entry.ar : entry.en;
}

export function operatorPrintErrorMessage(
  error: string | null | undefined,
  language: string
): string | null {
  if (!error?.trim()) return null;
  const isAr = language === "ar";
  const lower = error.toLowerCase();

  if (lower.includes("paper")) {
    return isAr
      ? "قد يكون الورق نفد أو الطابعة تحتاج ورقاً."
      : "Paper may be empty or the printer needs paper.";
  }
  if (
    lower.includes("offline") ||
    lower.includes("unavailable") ||
    lower.includes("not ready") ||
    lower.includes("disconnected")
  ) {
    return isAr
      ? "الطابعة غير متاحة. تأكد أنها مشغّلة ومتصلة."
      : "The printer is unavailable. Make sure it is on and connected.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return isAr ? "انتهت مهلة الطباعة. أعد المحاولة." : "Printing timed out. Try again.";
  }
  if (
    lower.includes("execution") ||
    lower.includes("gateway") ||
    lower.includes("connector session") ||
    lower.includes("runtime") ||
    error.includes("{") ||
    error.includes("Error:")
  ) {
    return isAr
      ? "تعذّرت الطباعة. تحقق من الطابعة وموصل MineuQR ثم أعد المحاولة."
      : "Printing could not complete. Check your printer and MineuQR Connector, then try again.";
  }

  if (error.length > 160) {
    return isAr ? "تعذّرت الطباعة. أعد المحاولة." : "Printing failed. Try again.";
  }

  return error;
}

export type PrintJobTimelineStep = {
  id: "queued" | "printing" | "done";
  label: string;
  state: "complete" | "current" | "upcoming" | "failed" | "cancelled";
};

export function derivePrintJobTimeline(
  job: PrintWorkspacePrintJob,
  language: string
): PrintJobTimelineStep[] {
  const isAr = language === "ar";
  const status = job.status as PrintJobStatus;

  const queued: PrintJobTimelineStep = {
    id: "queued",
    label: isAr ? "في الانتظار" : "Queued",
    state: "upcoming",
  };
  const printing: PrintJobTimelineStep = {
    id: "printing",
    label: isAr ? "الطباعة" : "Printing",
    state: "upcoming",
  };
  const done: PrintJobTimelineStep = {
    id: "done",
    label:
      status === "printed"
        ? isAr
          ? "تمت الطباعة"
          : "Printed"
        : status === "cancelled"
          ? isAr
            ? "أُلغيت"
            : "Cancelled"
          : status === "failed"
            ? isAr
              ? "فشلت"
              : "Failed"
            : isAr
              ? "النتيجة"
              : "Result",
    state: "upcoming",
  };

  if (status === "pending") {
    queued.state = "current";
  } else if (status === "dispatched" || status === "printing") {
    queued.state = "complete";
    printing.state = "current";
  } else if (status === "printed") {
    queued.state = "complete";
    printing.state = "complete";
    done.state = "complete";
  } else if (status === "failed") {
    queued.state = "complete";
    printing.state = "complete";
    done.state = "failed";
  } else if (status === "cancelled") {
    queued.state = "complete";
    printing.state = "upcoming";
    done.state = "cancelled";
  }

  return [queued, printing, done];
}

export function canCancelPrintJob(job: PrintWorkspacePrintJob | null): boolean {
  return job != null && CANCELLABLE_STATUSES.has(job.status as PrintJobStatus);
}

export function canMarkPrinted(job: PrintWorkspacePrintJob | null): boolean {
  return job != null && MARK_PRINTED_STATUSES.has(job.status as PrintJobStatus);
}

export function canRetryPrint(job: PrintWorkspacePrintJob | null): boolean {
  if (!job) return false;
  return job.status === "failed" || job.status === "cancelled";
}

export function canStartPrint(
  jobs: PrintWorkspacePrintJob[],
  printingReady: boolean
): boolean {
  return printingReady && !hasActivePrintJob(jobs);
}

export function formatPrintJobTimestamp(value: string | null, language: string): string {
  return formatTimestamp(value, language);
}

export function printJobSourceLabel(source: string, language: string): string {
  const isAr = language === "ar";
  const map: Record<string, { en: string; ar: string }> = {
    order_event: { en: "Automatic", ar: "تلقائي" },
    operator: { en: "Manual", ar: "يدوي" },
    reprint: { en: "Reprint", ar: "إعادة طباعة" },
  };
  const entry = map[source];
  if (!entry) return source;
  return isAr ? entry.ar : entry.en;
}

export type PrintJobMonitorTone = "neutral" | "progress" | "success" | "failed" | "cancelled";

export function printJobMonitorTone(job: PrintWorkspacePrintJob | null): PrintJobMonitorTone {
  if (!job) return "neutral";
  switch (job.status as PrintJobStatus) {
    case "pending":
    case "dispatched":
    case "printing":
      return "progress";
    case "printed":
      return "success";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return "neutral";
  }
}
