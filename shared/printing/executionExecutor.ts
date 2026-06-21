/**
 * THERMAL-PRINTING-10A / 10B — execution executor contracts (artifact generation, no device I/O).
 */
import type { AgentJobTicketPayload } from "./agentJobMessages";
import type { ExecutionMethod } from "./executionCapabilities";
import type { RuntimeExecutionPlanSummary } from "./executionIntegration";

export type ExecutionExecutorMethod = ExecutionMethod;

export const EXECUTION_STATUSES = [
  "completed",
  "failed",
  "not-implemented",
  "rejected",
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

/** @deprecated Renamed to EXECUTION_STATUSES in THERMAL-PRINTING-10B */
export const EXECUTION_EXECUTION_STATUSES = EXECUTION_STATUSES;

/** @deprecated Renamed to ExecutionStatus in THERMAL-PRINTING-10B */
export type ExecutionExecutionStatus = ExecutionStatus;

export const ESC_POS_PAYLOAD_KIND = "escpos-bytes" as const;

export type EscPosPayload = {
  kind: typeof ESC_POS_PAYLOAD_KIND;
  bytes: Uint8Array;
  byteLength: number;
  encoding: "escpos";
};

/**
 * Expandable execution artifact union (10B.0B).
 * Future: SpoolerArtifact | AirPrintArtifact | VendorSdkArtifact | BridgeAgentArtifact
 */
export type ExecutionArtifact = EscPosPayload;

/** @deprecated Renamed to ExecutionArtifact in THERMAL-PRINTING-10B */
export type ExecutionExecutionArtifact = ExecutionArtifact;

export function isEscPosPayload(artifact: ExecutionArtifact): artifact is EscPosPayload {
  return artifact.kind === ESC_POS_PAYLOAD_KIND;
}

export type ExecutionResult = {
  status: ExecutionStatus;
  method: ExecutionMethod;
  artifact?: ExecutionArtifact;
  message?: string;
};

/** @deprecated Renamed to ExecutionResult in THERMAL-PRINTING-10B */
export type ExecutionExecutionResult = ExecutionResult;

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
  execute(input: ExecutionExecutorInput): ExecutionResult;
}

export class ExecutionExecutorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionExecutorError";
  }
}
