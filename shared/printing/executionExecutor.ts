/**
 * THERMAL-PRINTING-10A — execution executor contracts (payload boundary, no device I/O).
 */
import type { AgentJobTicketPayload } from "./agentJobMessages";
import type { ExecutionMethod } from "./executionCapabilities";
import type { RuntimeExecutionPlanSummary } from "./executionIntegration";

export type ExecutionExecutorMethod = ExecutionMethod;

export const EXECUTION_EXECUTION_STATUSES = [
  "completed",
  "failed",
  "not-implemented",
  "rejected",
] as const;

export type ExecutionExecutionStatus =
  (typeof EXECUTION_EXECUTION_STATUSES)[number];

export const ESC_POS_PAYLOAD_KIND = "escpos-bytes" as const;

export type EscPosPayload = {
  kind: typeof ESC_POS_PAYLOAD_KIND;
  bytes: Uint8Array;
  byteLength: number;
  encoding: "escpos";
};

export type ExecutionExecutionArtifact = EscPosPayload;

export type ExecutionExecutionResult = {
  status: ExecutionExecutionStatus;
  method: ExecutionMethod;
  artifact?: ExecutionExecutionArtifact;
  message?: string;
};

export type ExecutionExecutorJobPayload = {
  jobId: number;
  restaurantId: number;
  printerId: number;
  orderId: number;
  ticket: AgentJobTicketPayload;
};

export type ExecutionExecutorInput = {
  executionPlan: RuntimeExecutionPlanSummary;
  job: ExecutionExecutorJobPayload;
};

export interface ExecutionExecutor {
  readonly method: ExecutionMethod;
  execute(input: ExecutionExecutorInput): ExecutionExecutionResult;
}

export class ExecutionExecutorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionExecutorError";
  }
}
