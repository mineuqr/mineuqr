/**
 * THERMAL-PRINTING-10B — transport-aware execution outcome (separate from delivery confirmation).
 */
import type { ExecutionResult } from "./executionExecutor";
import type { TransportExecutionResult } from "./transports/transportContracts";

export const EXECUTION_OUTCOME_STATUSES = [
  "prepared",
  "executed",
  "failed",
  "transport-not-implemented",
] as const;

export type ExecutionOutcomeStatus =
  (typeof EXECUTION_OUTCOME_STATUSES)[number];

export type ExecutionOutcome = {
  status: ExecutionOutcomeStatus;
  executionResult?: ExecutionResult;
  transportResult?: TransportExecutionResult;
  message?: string;
};

export function resolveExecutionOutcome(input: {
  executionResult?: ExecutionResult;
  transportResult?: TransportExecutionResult;
}): ExecutionOutcome {
  if (!input.executionResult) {
    return { status: "prepared" };
  }

  if (input.executionResult.status !== "completed") {
    return {
      status: "failed",
      executionResult: input.executionResult,
      transportResult: input.transportResult,
      message: input.executionResult.message ?? "Execution did not complete",
    };
  }

  if (!input.transportResult) {
    return {
      status: "prepared",
      executionResult: input.executionResult,
      message: "Execution artifact prepared; transport not attempted",
    };
  }

  if (input.transportResult.status === "not-implemented") {
    return {
      status: "transport-not-implemented",
      executionResult: input.executionResult,
      transportResult: input.transportResult,
      message: input.transportResult.message,
    };
  }

  if (input.transportResult.status === "completed") {
    return {
      status: "executed",
      executionResult: input.executionResult,
      transportResult: input.transportResult,
    };
  }

  return {
    status: "failed",
    executionResult: input.executionResult,
    transportResult: input.transportResult,
    message: input.transportResult.message ?? "Transport delivery failed",
  };
}
