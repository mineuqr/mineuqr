/**
 * THERMAL-PRINTING-13I.6 — map routing/resolution failures to actionable messages.
 */
import {
  ROUTING_FAILURE_CODES,
  RoutingRejectedError,
} from "./routingTypes";
import {
  RESOLUTION_FAILURE_CODES,
  ResolutionRejectedError,
} from "./resolutionTypes";

export function mapDiagnosticDispatchFailureReason(error: unknown): string {
  if (error instanceof RoutingRejectedError) {
    switch (error.code) {
      case ROUTING_FAILURE_CODES.NO_CANDIDATES:
        return "No online print agent is available for this printer";
      case ROUTING_FAILURE_CODES.UNRESOLVED_PRINTER:
        return "Printer is not resolved to an online agent profile";
      case ROUTING_FAILURE_CODES.RESOLUTION_CONFLICT:
        return "Printer profile ownership conflict between multiple agents";
      case ROUTING_FAILURE_CODES.MULTIPLE_CANDIDATES:
        return "Multiple online agents match this printer; resolution is ambiguous";
      case ROUTING_FAILURE_CODES.OFFLINE_OWNER:
        return "Assigned print agent is offline";
      default:
        return error.message;
    }
  }

  if (error instanceof ResolutionRejectedError) {
    switch (error.code) {
      case RESOLUTION_FAILURE_CODES.UNKNOWN_DB_PRINTER:
        return "Printer is not registered in the print host resolution registry";
      case RESOLUTION_FAILURE_CODES.UNKNOWN_PROFILE:
        return "Printer profile is not owned by a connected agent";
      case RESOLUTION_FAILURE_CODES.RESOLUTION_CONFLICT:
        return "Printer profile ownership conflict between multiple agents";
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Diagnostic test print dispatch failed";
}
