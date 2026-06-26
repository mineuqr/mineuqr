/**
 * THERMAL-PRINTING-13I.3C.3 — operational telemetry taxonomy.
 */

export const PRINT_JOB_TELEMETRY_EVENT = {
  JOB_CREATED: "job_created",
  ROUTING_COMPLETED: "routing_completed",
  ASSIGNMENT_COMPLETED: "assignment_completed",
  DISPATCH_STARTED: "dispatch_started",
  DISPATCH_NOTIFIED: "dispatch_notified",
  DISPATCH_RETRY: "dispatch_retry",
  DISPATCH_REPLAYED: "dispatch_replayed",
  DISPATCH_FAILED: "dispatch_failed",
  AGENT_FETCH: "agent_fetch",
  EXECUTION_STARTED: "execution_started",
  EXECUTION_COMPLETED: "execution_completed",
  EXECUTION_FAILED: "execution_failed",
  DELIVERY_ACKNOWLEDGED: "delivery_acknowledged",
  DELIVERY_CONFIRMED: "delivery_confirmed",
  FINAL_OUTCOME: "final_outcome",
} as const;

export type PrintJobTelemetryEventType =
  (typeof PRINT_JOB_TELEMETRY_EVENT)[keyof typeof PRINT_JOB_TELEMETRY_EVENT];

export const PRINT_JOB_TELEMETRY_STAGE_ORDER: PrintJobTelemetryEventType[] = [
  PRINT_JOB_TELEMETRY_EVENT.JOB_CREATED,
  PRINT_JOB_TELEMETRY_EVENT.ROUTING_COMPLETED,
  PRINT_JOB_TELEMETRY_EVENT.ASSIGNMENT_COMPLETED,
  PRINT_JOB_TELEMETRY_EVENT.DISPATCH_STARTED,
  PRINT_JOB_TELEMETRY_EVENT.DISPATCH_NOTIFIED,
  PRINT_JOB_TELEMETRY_EVENT.DISPATCH_RETRY,
  PRINT_JOB_TELEMETRY_EVENT.DISPATCH_REPLAYED,
  PRINT_JOB_TELEMETRY_EVENT.AGENT_FETCH,
  PRINT_JOB_TELEMETRY_EVENT.EXECUTION_STARTED,
  PRINT_JOB_TELEMETRY_EVENT.EXECUTION_COMPLETED,
  PRINT_JOB_TELEMETRY_EVENT.EXECUTION_FAILED,
  PRINT_JOB_TELEMETRY_EVENT.DELIVERY_ACKNOWLEDGED,
  PRINT_JOB_TELEMETRY_EVENT.DELIVERY_CONFIRMED,
  PRINT_JOB_TELEMETRY_EVENT.FINAL_OUTCOME,
];

export type PrintJobTelemetrySeverity = "info" | "warn" | "error";

export type PrintJobTelemetryEventPayload = {
  printJobId: number;
  correlationId: string;
  restaurantId: number;
  agentId?: string;
  printerId?: number;
  eventType: PrintJobTelemetryEventType;
  severity?: PrintJobTelemetrySeverity;
  timestamp?: string;
  payload?: Record<string, unknown>;
};

export type PrintJobTelemetryTimelineEntry = {
  id: number;
  eventType: PrintJobTelemetryEventType;
  timestamp: string;
  correlationId: string;
  printJobId: number;
  restaurantId: number;
  agentId?: string;
  printerId?: number;
  severity: PrintJobTelemetrySeverity;
  payload: Record<string, unknown>;
};

export type PrintJobOperationalTelemetry = {
  printJobId: number;
  correlationId: string;
  restaurantId: number;
  currentStage: PrintJobTelemetryEventType | "unknown";
  timeline: PrintJobTelemetryTimelineEntry[];
  failures: PrintJobTelemetryTimelineEntry[];
  retries: PrintJobTelemetryTimelineEntry[];
  replays: PrintJobTelemetryTimelineEntry[];
};
