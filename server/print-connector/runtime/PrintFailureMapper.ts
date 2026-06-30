import type { PrintFailureReason } from "../domain/PrintFailureReason";

const PATTERNS: Array<{ pattern: RegExp; reason: PrintFailureReason }> = [
  { pattern: /offline|not found|unavailable/i, reason: "printer_offline" },
  { pattern: /paper\s*out|out of paper/i, reason: "paper_out" },
  { pattern: /permission|access denied|unauthorized/i, reason: "permission_denied" },
  { pattern: /timeout|timed out/i, reason: "timeout" },
  { pattern: /connection|disconnect|lost/i, reason: "connection_lost" },
  { pattern: /unsupported|not supported/i, reason: "unsupported_capability" },
  { pattern: /cancel/i, reason: "cancelled" },
];

export function mapErrorToPrintFailureReason(error: unknown): PrintFailureReason {
  const message = error instanceof Error ? error.message : String(error);
  for (const { pattern, reason } of PATTERNS) {
    if (pattern.test(message)) return reason;
  }
  return "os_failure";
}

export function failureResultMessage(reason: PrintFailureReason): string {
  switch (reason) {
    case "printer_offline":
      return "Printer is offline or unavailable";
    case "no_printer_selected":
      return "No printer selected for this restaurant";
    case "paper_out":
      return "Printer is out of paper";
    case "permission_denied":
      return "Permission denied to access the printer";
    case "connection_lost":
      return "Connection to the printer was lost";
    case "timeout":
      return "Print operation timed out";
    case "unsupported_capability":
      return "Printer does not support the requested capability";
    case "cancelled":
      return "Print operation was cancelled";
    case "os_failure":
      return "Operating system print failure";
    default:
      return "Unknown print failure";
  }
}
