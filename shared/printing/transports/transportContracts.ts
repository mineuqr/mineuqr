/**
 * THERMAL-PRINTING-10C — transport layer contracts (extended for physical execution).
 */
import type { ExecutionTransport } from "../executionCapabilities";
import type { ExecutionContext } from "../executionContext";
import type { ExecutionResult } from "../executionExecutor";
import type { RuntimeExecutionPlanSummary } from "../executionIntegration";
import type { PrinterProfile } from "../printerProfiles";
import type { UsbTransportEndpoint } from "./usbTransportEndpoint";

export type { UsbTransportEndpoint } from "./usbTransportEndpoint";
export {
  normalizeUsbTransportEndpoint,
  isUsbDevicePathEndpoint,
  isUsbWindowsSpoolerEndpoint,
} from "./usbTransportEndpoint";

export type NetworkTransportEndpoint = {
  host: string;
  port: number;
};

export type BluetoothTransportEndpoint = {
  devicePath: string;
};

export const TRANSPORT_EXECUTION_STATUSES = [
  "completed",
  "failed",
  "not-implemented",
  "rejected",
] as const;

export type TransportExecutionStatus =
  (typeof TRANSPORT_EXECUTION_STATUSES)[number];

export const TRANSPORT_FAILURE_CODES = [
  "timeout",
  "connection-failed",
  "write-failed",
  "endpoint-missing",
  "retry-exhausted",
  "unsupported-artifact",
] as const;

export type TransportFailureCode = (typeof TRANSPORT_FAILURE_CODES)[number];

export type TransportExecutionResult = {
  status: TransportExecutionStatus;
  transport: ExecutionTransport;
  bytesTransmitted?: number;
  attempts?: number;
  failureCode?: TransportFailureCode;
  message?: string;
};

export type TransportExecutionRequest = {
  executionResult: ExecutionResult;
  executionPlan: RuntimeExecutionPlanSummary;
  executionContext: ExecutionContext;
  printerProfile: PrinterProfile;
  networkEndpoint?: NetworkTransportEndpoint;
  usbEndpoint?: UsbTransportEndpoint;
  bluetoothEndpoint?: BluetoothTransportEndpoint;
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
