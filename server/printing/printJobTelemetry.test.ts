import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { PRINT_JOB_TELEMETRY_EVENT } from "../../shared/printing/telemetry";
import { ensurePrintJobCorrelationId } from "./printJobCorrelationService";
import {
  emitPrintJobTelemetry,
  getPrintJobOperationalTelemetry,
  mapDispatchReplayReasonToTelemetryEvent,
  recordPrintJobTelemetryEvent,
} from "./printJobTelemetryService";

type StoredTelemetryEvent = {
  id: number;
  printJobId: number;
  correlationId: string;
  eventType: string;
  restaurantId: number;
  agentId?: string;
  printerId?: number;
  severity: string;
  payloadJson?: Record<string, unknown>;
  createdAt: string;
};

const telemetryStore = vi.hoisted(() => ({
  events: [] as StoredTelemetryEvent[],
  correlations: new Map<number, string>(),
  nextId: 1,
}));

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
}));

vi.mock("./printJobTelemetryRepository", () => ({
  insertPrintJobTelemetryEvent: async (data: {
    printJobId: number;
    correlationId: string;
    eventType: string;
    restaurantId: number;
    agentId?: string;
    printerId?: number;
    severity?: string;
    payloadJson?: Record<string, unknown>;
  }) => {
    const id = telemetryStore.nextId++;
    telemetryStore.events.push({
      id,
      printJobId: data.printJobId,
      correlationId: data.correlationId,
      eventType: data.eventType,
      restaurantId: data.restaurantId,
      agentId: data.agentId,
      printerId: data.printerId,
      severity: data.severity ?? "info",
      payloadJson: data.payloadJson,
      createdAt: new Date().toISOString(),
    });
    return id;
  },
  listPrintJobTelemetryEvents: async (printJobId: number) =>
    telemetryStore.events
      .filter((event) => event.printJobId === printJobId)
      .map((event) => ({
        id: event.id,
        printJobId: event.printJobId,
        correlationId: event.correlationId,
        eventType: event.eventType,
        restaurantId: event.restaurantId,
        agentId: event.agentId ?? null,
        printerId: event.printerId ?? null,
        severity: event.severity,
        payloadJson: event.payloadJson ?? null,
        createdAt: event.createdAt,
      })),
  findPrintJobCorrelationId: async (printJobId: number) =>
    telemetryStore.correlations.get(printJobId) ?? null,
  assignPrintJobCorrelationId: async (printJobId: number, correlationId: string) => {
    telemetryStore.correlations.set(printJobId, correlationId);
    return correlationId;
  },
}));

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
}));

vi.mock("../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

const CORRELATION_ID = "corr-telemetry-lifecycle-001";
const AGENT_ID = "mineuqr-agent-720007";

const baseJob: SelectPrintJob = {
  id: 100,
  restaurantId: 720007,
  orderId: 4080001,
  printerId: 10,
  stationId: null,
  assignedAgentId: AGENT_ID,
  assignedAt: "2026-06-18T12:01:00.000Z",
  dispatchNotifiedAt: null,
  correlationId: CORRELATION_ID,
  status: PRINT_JOB_STATUS.QUEUED,
  attemptCount: 0,
  idempotencyKey: "order:4080001:submitted",
  claimedBy: null,
  leaseExpiresAt: null,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

async function recordLifecycleTimeline(correlationId: string): Promise<void> {
  const base = {
    printJobId: 100,
    correlationId,
    restaurantId: 720007,
    agentId: AGENT_ID,
    printerId: 10,
  };

  const sequence = [
    PRINT_JOB_TELEMETRY_EVENT.JOB_CREATED,
    PRINT_JOB_TELEMETRY_EVENT.ROUTING_COMPLETED,
    PRINT_JOB_TELEMETRY_EVENT.ASSIGNMENT_COMPLETED,
    PRINT_JOB_TELEMETRY_EVENT.DISPATCH_STARTED,
    PRINT_JOB_TELEMETRY_EVENT.DISPATCH_FAILED,
    PRINT_JOB_TELEMETRY_EVENT.DISPATCH_REPLAYED,
    PRINT_JOB_TELEMETRY_EVENT.DISPATCH_NOTIFIED,
    PRINT_JOB_TELEMETRY_EVENT.AGENT_FETCH,
    PRINT_JOB_TELEMETRY_EVENT.EXECUTION_STARTED,
    PRINT_JOB_TELEMETRY_EVENT.EXECUTION_COMPLETED,
    PRINT_JOB_TELEMETRY_EVENT.DELIVERY_ACKNOWLEDGED,
    PRINT_JOB_TELEMETRY_EVENT.DELIVERY_CONFIRMED,
    PRINT_JOB_TELEMETRY_EVENT.FINAL_OUTCOME,
  ] as const;

  for (const eventType of sequence) {
    await recordPrintJobTelemetryEvent({
      ...base,
      eventType,
      severity:
        eventType === PRINT_JOB_TELEMETRY_EVENT.DISPATCH_FAILED ? "warn" : "info",
      payload: { eventType },
    });
  }
}

describe("printJobTelemetry THERMAL-PRINTING-13I.3C.3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    telemetryStore.events = [];
    telemetryStore.nextId = 1;
    telemetryStore.correlations.set(100, CORRELATION_ID);
    repoMocks.findPrintJobById.mockResolvedValue(baseJob);
  });

  it("builds a complete lifecycle timeline with stable correlation id", async () => {
    await recordLifecycleTimeline(CORRELATION_ID);

    const telemetry = await getPrintJobOperationalTelemetry(720007, 100);
    expect(telemetry).not.toBeNull();
    expect(telemetry!.correlationId).toBe(CORRELATION_ID);
    expect(telemetry!.timeline).toHaveLength(13);
    expect(telemetry!.timeline.every((entry) => entry.correlationId === CORRELATION_ID)).toBe(
      true
    );
    expect(telemetry!.currentStage).toBe(PRINT_JOB_TELEMETRY_EVENT.FINAL_OUTCOME);
  });

  it("surfaces retry and replay history separately", async () => {
    await recordPrintJobTelemetryEvent({
      printJobId: 100,
      correlationId: CORRELATION_ID,
      restaurantId: 720007,
      eventType: PRINT_JOB_TELEMETRY_EVENT.DISPATCH_RETRY,
      payload: { reason: "agent_disconnected" },
    });
    await recordPrintJobTelemetryEvent({
      printJobId: 100,
      correlationId: CORRELATION_ID,
      restaurantId: 720007,
      eventType: PRINT_JOB_TELEMETRY_EVENT.DISPATCH_REPLAYED,
      payload: { replayReason: "agent_reconnect" },
    });

    const telemetry = await getPrintJobOperationalTelemetry(720007, 100);
    expect(telemetry!.retries).toHaveLength(1);
    expect(telemetry!.replays).toHaveLength(1);
  });

  it("surfaces execution failure timeline entries", async () => {
    await recordPrintJobTelemetryEvent({
      printJobId: 100,
      correlationId: CORRELATION_ID,
      restaurantId: 720007,
      agentId: AGENT_ID,
      eventType: PRINT_JOB_TELEMETRY_EVENT.EXECUTION_FAILED,
      severity: "error",
      payload: { message: "paper out" },
    });
    await recordPrintJobTelemetryEvent({
      printJobId: 100,
      correlationId: CORRELATION_ID,
      restaurantId: 720007,
      eventType: PRINT_JOB_TELEMETRY_EVENT.FINAL_OUTCOME,
      severity: "error",
      payload: { terminalStatus: "failed" },
    });

    const telemetry = await getPrintJobOperationalTelemetry(720007, 100);
    expect(telemetry!.failures).toHaveLength(1);
    expect(telemetry!.currentStage).toBe(PRINT_JOB_TELEMETRY_EVENT.FINAL_OUTCOME);
  });

  it("keeps correlation consistent when emitting through the helper", async () => {
    await emitPrintJobTelemetry({
      printJobId: 100,
      eventType: PRINT_JOB_TELEMETRY_EVENT.DISPATCH_NOTIFIED,
      agentId: AGENT_ID,
    });

    const telemetry = await getPrintJobOperationalTelemetry(720007, 100);
    expect(telemetry!.correlationId).toBe(CORRELATION_ID);
    expect(telemetry!.timeline[0]?.correlationId).toBe(CORRELATION_ID);
  });

  it("assigns correlation id lazily for legacy jobs", async () => {
    telemetryStore.correlations.delete(100);
    const legacyJob = { ...baseJob, correlationId: null };
    repoMocks.findPrintJobById.mockResolvedValue(legacyJob);

    const correlationId = await ensurePrintJobCorrelationId(legacyJob);
    expect(correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(telemetryStore.correlations.get(100)).toBe(correlationId);
  });

  it("maps dispatch replay reasons to telemetry events", () => {
    expect(mapDispatchReplayReasonToTelemetryEvent("notify_retry")).toBe(
      PRINT_JOB_TELEMETRY_EVENT.DISPATCH_RETRY
    );
    expect(mapDispatchReplayReasonToTelemetryEvent("agent_reconnect")).toBe(
      PRINT_JOB_TELEMETRY_EVENT.DISPATCH_REPLAYED
    );
  });
});
