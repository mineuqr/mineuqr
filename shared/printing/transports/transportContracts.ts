/**
 * THERMAL-PRINTING-10B — transport layer contracts.
 */
import type { ExecutionTransport } from "../executionCapabilities";
import type { ExecutionContext } from "../executionContext";
import type { ExecutionResult } from "../executionExecutor";
import type { RuntimeExecutionPlanSummary } from "../executionIntegration";
import type { PrinterProfile } from "../printerProfiles";

export type NetworkTransportEndpoint = {
  host: string;
  port: number;
};

export const TRANSPORT_EXECUTION_STATUSES = [
  "completed",
  "failed",
  "not-implemented",
  "rejected",
] as const;

export type TransportExecutionStatus =
  (typeof TRANSPORT_EXECUTION_STATUSES)[number];

export type TransportExecutionResult = {
  status: TransportExecutionStatus;
  transport: ExecutionTransport;
  bytesTransmitted?: number;
  message?: string;
};

export type TransportExecutionRequest = {
  executionResult: ExecutionResult;
  executionPlan: RuntimeExecutionPlanSummary;
  executionContext: ExecutionContext;
  printerProfile: PrinterProfile;
  networkEndpoint?: NetworkTransportEndpoint;
};

export interface ExecutionTransportAdapter {
  readonly transport: ExecutionTransport;
  deliver(request: TransportExecutionRequest): Promise<TransportExecutionResult>;
}

export type TransportRegistry = {
  get(transport: ExecutionTransport): ExecutionTransportAdapter | undefined;
  listSupported(): ExecutionTransport[];
  listNotImplemented(): ExecutionTransport[];
};
