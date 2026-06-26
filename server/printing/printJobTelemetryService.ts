/**
 * THERMAL-PRINTING-13I.3C.3 — operational telemetry recording + retrieval.
 */
import type { SelectPrintJobTelemetryEvent } from "../../drizzle/schema";
import {
  PRINT_JOB_TELEMETRY_EVENT,
  PRINT_JOB_TELEMETRY_STAGE_ORDER,
  type PrintJobOperationalTelemetry,
  type PrintJobTelemetryEventPayload,
  type PrintJobTelemetryEventType,
  type PrintJobTelemetrySeverity,
  type PrintJobTelemetryTimelineEntry,
} from "../../shared/printing/telemetry";
import { opsLog } from "../_core/opsLog";
import { ensurePrintJobCorrelationId } from "./printJobCorrelationService";
import { findPrintJobById } from "./printJobRepository";
import {
  insertPrintJobTelemetryEvent,
  listPrintJobTelemetryEvents,
} from "./printJobTelemetryRepository";

const FAILURE_EVENTS = new Set<PrintJobTelemetryEventType>([
  PRINT_JOB_TELEMETRY_EVENT.DISPATCH_FAILED,
  PRINT_JOB_TELEMETRY_EVENT.EXECUTION_FAILED,
]);

const RETRY_EVENTS = new Set<PrintJobTelemetryEventType>([
  PRINT_JOB_TELEMETRY_EVENT.DISPATCH_RETRY,
]);

const REPLAY_EVENTS = new Set<PrintJobTelemetryEventType>([
  PRINT_JOB_TELEMETRY_EVENT.DISPATCH_REPLAYED,
]);

function mapRowToTimelineEntry(
  row: SelectPrintJobTelemetryEvent
): PrintJobTelemetryTimelineEntry {
  return {
    id: row.id,
    eventType: row.eventType as PrintJobTelemetryEventType,
    timestamp: row.createdAt,
    correlationId: row.correlationId,
    printJobId: row.printJobId,
    restaurantId: row.restaurantId,
    agentId: row.agentId ?? undefined,
    printerId: row.printerId ?? undefined,
    severity: row.severity as PrintJobTelemetrySeverity,
    payload: (row.payloadJson as Record<string, unknown> | null) ?? {},
  };
}

function deriveCurrentStage(
  timeline: PrintJobTelemetryTimelineEntry[]
): PrintJobTelemetryEventType | "unknown" {
  if (timeline.length === 0) {
    return "unknown";
  }

  let latest: PrintJobTelemetryTimelineEntry | null = null;
  let latestRank = -1;

  for (const entry of timeline) {
    const rank = PRINT_JOB_TELEMETRY_STAGE_ORDER.indexOf(entry.eventType);
    const effectiveRank = rank >= 0 ? rank : 0;
    if (
      !latest ||
      effectiveRank > latestRank ||
      (effectiveRank === latestRank && entry.timestamp >= latest.timestamp)
    ) {
      latest = entry;
      latestRank = effectiveRank;
    }
  }

  return latest?.eventType ?? "unknown";
}

export async function recordPrintJobTelemetryEvent(
  input: PrintJobTelemetryEventPayload
): Promise<number> {
  const severity = input.severity ?? "info";
  const timestamp = input.timestamp ?? new Date().toISOString();

  const eventId = await insertPrintJobTelemetryEvent({
    printJobId: input.printJobId,
    correlationId: input.correlationId,
    eventType: input.eventType,
    restaurantId: input.restaurantId,
    agentId: input.agentId,
    printerId: input.printerId,
    severity,
    payloadJson: input.payload,
  });

  opsLog({
    type: `print_telemetry_${input.eventType}`,
    category: "ORDER",
    severity,
    ts: timestamp,
    correlationId: input.correlationId,
    restaurantId: input.restaurantId,
    metadata: {
      printJobId: input.printJobId,
      eventType: input.eventType,
      agentId: input.agentId,
      printerId: input.printerId,
      telemetryEventId: eventId,
      ...input.payload,
    },
  });

  return eventId;
}

export function recordPrintJobTelemetryFireAndForget(
  input: PrintJobTelemetryEventPayload
): void {
  void recordPrintJobTelemetryEvent(input).catch(() => {
    // Telemetry must never affect printing behavior.
  });
}

export type EmitPrintJobTelemetryInput = Omit<
  PrintJobTelemetryEventPayload,
  "correlationId" | "restaurantId"
> & {
  restaurantId?: number;
  correlationId?: string;
};

export async function emitPrintJobTelemetry(
  input: EmitPrintJobTelemetryInput
): Promise<void> {
  try {
    const job = await findPrintJobById(input.printJobId);
    if (!job) {
      return;
    }

    const correlationId =
      input.correlationId?.trim() || (await ensurePrintJobCorrelationId(job));

    await recordPrintJobTelemetryEvent({
      printJobId: input.printJobId,
      correlationId,
      restaurantId: input.restaurantId ?? job.restaurantId,
      agentId: input.agentId,
      printerId: input.printerId ?? job.printerId ?? undefined,
      eventType: input.eventType,
      severity: input.severity,
      timestamp: input.timestamp,
      payload: input.payload,
    });
  } catch {
    // Observability-only path.
  }
}

export function emitPrintJobTelemetryAsync(input: EmitPrintJobTelemetryInput): void {
  void emitPrintJobTelemetry(input);
}

export async function getPrintJobOperationalTelemetry(
  restaurantId: number,
  printJobId: number
): Promise<PrintJobOperationalTelemetry | null> {
  const job = await findPrintJobById(printJobId);
  if (!job || job.restaurantId !== restaurantId) {
    return null;
  }

  const correlationId = await ensurePrintJobCorrelationId(job);
  const rows = await listPrintJobTelemetryEvents(printJobId);
  const timeline = rows.map(mapRowToTimelineEntry);

  return {
    printJobId,
    correlationId,
    restaurantId,
    currentStage: deriveCurrentStage(timeline),
    timeline,
    failures: timeline.filter((entry) => FAILURE_EVENTS.has(entry.eventType)),
    retries: timeline.filter((entry) => RETRY_EVENTS.has(entry.eventType)),
    replays: timeline.filter((entry) => REPLAY_EVENTS.has(entry.eventType)),
  };
}

export function mapDispatchReplayReasonToTelemetryEvent(
  replayReason?: string
): PrintJobTelemetryEventType {
  switch (replayReason) {
    case "agent_reconnect":
    case "print_host_restart":
      return PRINT_JOB_TELEMETRY_EVENT.DISPATCH_REPLAYED;
    case "notify_retry":
      return PRINT_JOB_TELEMETRY_EVENT.DISPATCH_RETRY;
    default:
      return PRINT_JOB_TELEMETRY_EVENT.DISPATCH_RETRY;
  }
}
