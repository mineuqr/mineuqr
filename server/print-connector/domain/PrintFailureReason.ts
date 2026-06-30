export const PRINT_FAILURE_REASONS = [
  "printer_offline",
  "no_printer_selected",
  "paper_out",
  "permission_denied",
  "connection_lost",
  "timeout",
  "unsupported_capability",
  "os_failure",
  "cancelled",
  "unknown",
] as const;

export type PrintFailureReason = (typeof PRINT_FAILURE_REASONS)[number];
