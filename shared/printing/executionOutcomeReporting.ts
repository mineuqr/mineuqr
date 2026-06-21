/**
 * THERMAL-PRINTING-10C — execution outcome classification for server reporting.
 */
import type { ExecutionOutcome, ExecutionOutcomeStatus } from "./executionOutcome";
import type {
  ExecutionOutcomeReportCategory,
} from "./executionOutcomeMessages";
import type { TransportExecutionResult } from "./transports/transportContracts";

export type ClassifiedExecutionOutcome = ExecutionOutcome & {
  category: ExecutionOutcomeReportCategory;
};

function classifyTransportFailure(
  transportResult: TransportExecutionResult
): ExecutionOutcomeReportCategory {
  if (transportResult.failureCode === "retry-exhausted") {
    return "retry-exhausted";
  }
  if (
    transportResult.failureCode === "timeout" ||
    transportResult.failureCode === "connection-failed" ||
    transportResult.message?.toLowerCase().includes("timed out") ||
    transportResult.message?.toLowerCase().includes("econnrefused") ||
    transportResult.message?.toLowerCase().includes("unreachable")
  ) {
    return "printer-unreachable";
  }
  return "transport-failure";
}

export function classifyExecutionOutcome(
  outcome: ExecutionOutcome
): ClassifiedExecutionOutcome {
  const status = outcome.status;

  if (status === "executed") {
    return { ...outcome, category: "execution-success" };
  }

  if (status === "prepared") {
    return { ...outcome, category: "execution-failure" };
  }

  if (status === "transport-not-implemented") {
    return { ...outcome, category: "transport-failure" };
  }

  if (status === "failed") {
    if (outcome.executionResult && outcome.executionResult.status !== "completed") {
      return { ...outcome, category: "execution-failure" };
    }
    if (outcome.transportResult) {
      return {
        ...outcome,
        category: classifyTransportFailure(outcome.transportResult),
      };
    }
    return { ...outcome, category: "execution-failure" };
  }

  return { ...outcome, category: "execution-failure" };
}

export function executionOutcomeStatusForReport(
  outcome: ExecutionOutcome
): ExecutionOutcomeStatus {
  return outcome.status;
}
