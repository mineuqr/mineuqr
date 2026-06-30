export const PRINT_JOB_STATUSES = [
  "pending",
  "dispatched",
  "printing",
  "printed",
  "failed",
  "cancelled",
] as const;

export type PrintJobStatus = (typeof PRINT_JOB_STATUSES)[number];

export const PRINT_JOB_SOURCES = ["order_event", "operator", "reprint"] as const;

export type PrintJobSource = (typeof PRINT_JOB_SOURCES)[number];

export const TERMINAL_PRINT_JOB_STATUSES: ReadonlySet<PrintJobStatus> = new Set<PrintJobStatus>([
  "printed",
  "failed",
  "cancelled",
]);

export function canTransitionPrintJobStatus(
  from: PrintJobStatus,
  to: PrintJobStatus
): boolean {
  if (from === to) return false;
  if (TERMINAL_PRINT_JOB_STATUSES.has(from)) return false;

  switch (from) {
    case "pending":
      return to === "dispatched" || to === "cancelled" || to === "failed";
    case "dispatched":
      return to === "printing" || to === "cancelled" || to === "failed";
    case "printing":
      return to === "printed" || to === "failed" || to === "cancelled";
    default:
      return false;
  }
}
