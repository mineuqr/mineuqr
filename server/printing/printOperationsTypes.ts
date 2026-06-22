/**
 * THERMAL-PRINTING-11C — read-only operational API types.
 */
import type { ExecutionTransport } from "../../shared/printing/executionCapabilities";

export type PrintOperationsSummary = {
  totalPrinters: number;
  activePrinters: number;
  inactivePrinters: number;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  queuedJobs: number;
};

export type PrinterOverviewItem = {
  id: number;
  name: string;
  profileId: string;
  transport: ExecutionTransport | "unknown";
  isActive: boolean;
  isDefault: boolean;
  lastActivityAt: string | null;
};

export type PrinterResolutionStatus =
  | { status: "resolved"; agentId: string; profilePrinterId: string }
  | { status: "unresolved"; reason: string };

export type PrinterDetailView = PrinterOverviewItem & {
  paperWidthMm: number;
  resolution: PrinterResolutionStatus;
  recentJobs: PrintJobQueueItem[];
};

export type PrintJobOperationalStatus =
  | "queued"
  | "assigned"
  | "executing"
  | "delivered"
  | "failed"
  | "cancelled"
  | "expired";

export type PrintJobQueueItem = {
  id: number;
  orderId: number;
  printerId: number | null;
  stationId: number | null;
  stationName: string | null;
  dbStatus: string;
  operationalStatus: PrintJobOperationalStatus;
  createdAt: string;
  updatedAt: string;
  assignedAgentId: string | null;
};

export type PrintJobDetailView = PrintJobQueueItem & {
  idempotencyKey: string;
  attemptCount: number;
  assignment: {
    agentId: string;
    assignedAt: string;
    printerId: number;
  } | null;
  routing: {
    agentId: string;
    reason: string;
  } | null;
  executionOutcome: {
    outcomeStatus: string;
    category: string;
    transport?: ExecutionTransport;
    message?: string;
    timestamp: string;
  } | null;
  deliveryState: {
    state: string;
    acknowledgedAt: string;
    deliveredAt?: string;
  } | null;
  protocolStatus: {
    state: string;
    timestamp: string;
  } | null;
};

export type PrintFailureItem = {
  jobId: number;
  orderId: number;
  printerId: number | null;
  failureLayer: "resolution" | "assignment" | "transport" | "execution" | "job-status";
  failureCode: string;
  failureMessage: string;
  timestamp: string;
};

export type PaginatedPrintJobs = {
  jobs: PrintJobQueueItem[];
  total: number;
  limit: number;
  offset: number;
};

export type StationOverviewItem = {
  id: number;
  name: string;
  printerId: number;
  printerName: string | null;
  jobCount: number;
};

export type AgentOverviewItem = {
  agentId: string;
  status: "offline" | "online" | "stale";
  platform: "windows" | "android" | "ios";
  connectedAt: string | null;
  lastHeartbeatAt: string | null;
  reportedProfileCount: number;
};
