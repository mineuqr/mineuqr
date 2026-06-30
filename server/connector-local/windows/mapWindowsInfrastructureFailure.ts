import type { PrintFailureReason } from "../../print-connector/domain/PrintFailureReason";
import type { InfrastructureFailureCode } from "../../connector-session/contracts/sessionFailureContracts";

export function mapPrintFailureToInfrastructure(
  reason: PrintFailureReason | null | undefined
): InfrastructureFailureCode {
  switch (reason) {
    case "printer_offline":
      return "connector_unavailable";
    case "no_printer_selected":
      return "connector_unavailable";
    case "paper_out":
      return "connector_unavailable";
    case "permission_denied":
      return "authentication_failure";
    case "timeout":
      return "transport_unavailable";
    case "connection_lost":
      return "transport_unavailable";
    case "unsupported_capability":
      return "version_mismatch";
    case "cancelled":
      return "connector_unavailable";
    case "os_failure":
    default:
      return "connector_unavailable";
  }
}

export function mapWindowsErrorMessage(message: string): InfrastructureFailureCode {
  const lower = message.toLowerCase();
  if (/access denied|permission|unauthorized/.test(lower)) return "authentication_failure";
  if (/timeout|timed out/.test(lower)) return "transport_unavailable";
  if (/offline|not found|unavailable|invalid printer/.test(lower)) return "connector_unavailable";
  if (/paper\s*out/.test(lower)) return "connector_unavailable";
  if (/driver/.test(lower)) return "connector_unavailable";
  return "connector_unavailable";
}
