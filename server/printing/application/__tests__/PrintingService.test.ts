import { describe, expect, it, vi } from "vitest";
import {
  PrintDispatchCoordinator,
  PrintingService,
  type RequestPrintParams,
} from "../PrintingService";
import type { PrintConnectorPort } from "../../contracts/ports/PrintConnectorPort";
import type { PrintStatusPublisher } from "../../contracts/ports/PrintStatusPublisher";
import type {
  CreatePrintJobInput,
  PrintJobRecord,
  PrintJobRepository,
  UpdatePrintJobStatusInput,
} from "../../contracts/repositories/PrintJobRepository";
import type { PrintJobAttemptRepository } from "../../contracts/repositories/PrintJobAttemptRepository";
import type { PrintJobHistoryRepository } from "../../contracts/repositories/PrintJobHistoryRepository";
import type { PrintPayloadBuilderPort } from "../../contracts/PrintPayloadBuilderPort";
import { PRINT_PAYLOAD_SCHEMA_VERSION } from "../../domain/PrintPayload";
import { canTransitionPrintJobStatus } from "../../domain/PrintJobStatus";

const samplePayload = {
  schemaVersion: PRINT_PAYLOAD_SCHEMA_VERSION,
  restaurantId: 1,
  orderId: 9,
  orderNumber: "ORD-9",
  orderStatus: "ready",
  tableNumber: 2,
  totalAmount: "10.00",
  createdAt: "2026-06-27T10:00:00.000Z",
  lineItems: [],
  requestedAt: "2026-06-27T10:01:00.000Z",
  trigger: { source: "order_event" as const, eventType: "OrderReady", eventId: "e1" },
};

function makeJob(overrides: Partial<PrintJobRecord> = {}): PrintJobRecord {
  return {
    id: 1,
    restaurantId: 1,
    orderId: 9,
    orderNumber: "ORD-9",
    status: "pending",
    source: "order_event",
    idempotencyKey: "order-event:OrderReady:e1",
    triggerEventType: "OrderReady",
    triggerEventId: "e1",
    correlationId: null,
    payloadVersion: 1,
    payload: samplePayload,
    attemptCount: 0,
    lastError: null,
    operatorUserId: null,
    createdAt: "2026-06-27T10:01:00.000Z",
    updatedAt: "2026-06-27T10:01:00.000Z",
    dispatchedAt: null,
    printingAt: null,
    completedAt: null,
    ...overrides,
  };
}

function createInMemoryJobs(): {
  repo: PrintJobRepository;
  records: Map<number, PrintJobRecord>;
} {
  const records = new Map<number, PrintJobRecord>();
  let nextId = 1;

  const repo: PrintJobRepository = {
    async create(input: CreatePrintJobInput) {
      const job = makeJob({
        id: nextId++,
        ...input,
        status: "pending",
        attemptCount: 0,
        payload: input.payload,
        triggerEventType: input.triggerEventType ?? null,
        triggerEventId: input.triggerEventId ?? null,
        correlationId: input.correlationId ?? null,
        operatorUserId: input.operatorUserId ?? null,
      });
      records.set(job.id, job);
      return job;
    },
    async findById(jobId, restaurantId) {
      const job = records.get(jobId);
      return job && job.restaurantId === restaurantId ? job : null;
    },
    async findByIdempotencyKey(restaurantId, idempotencyKey) {
      return [...records.values()].find(
        (job) => job.restaurantId === restaurantId && job.idempotencyKey === idempotencyKey
      ) ?? null;
    },
    async listByOrder(restaurantId, orderId) {
      return [...records.values()].filter(
        (job) => job.restaurantId === restaurantId && job.orderId === orderId
      );
    },
    async updateStatus(input: UpdatePrintJobStatusInput) {
      const job = records.get(input.jobId);
      if (!job || job.restaurantId !== input.restaurantId || job.status !== input.fromStatus) {
        return null;
      }
      const updated = {
        ...job,
        status: input.toStatus,
        lastError: input.lastError ?? job.lastError,
        dispatchedAt: input.dispatchedAt ?? job.dispatchedAt,
        printingAt: input.printingAt ?? job.printingAt,
        completedAt: input.completedAt ?? job.completedAt,
        attemptCount: input.incrementAttempt ? job.attemptCount + 1 : job.attemptCount,
        updatedAt: new Date().toISOString(),
      };
      records.set(job.id, updated);
      return updated;
    },
  };

  return { repo, records };
}

function createService(connector: PrintConnectorPort) {
  const { repo } = createInMemoryJobs();
  const attempts: PrintJobAttemptRepository = {
    create: vi.fn(async (input) => ({
      id: 1,
      ...input,
      errorMessage: input.errorMessage ?? null,
      metadata: input.metadata ?? null,
      createdAt: new Date().toISOString(),
    })),
    listByJob: vi.fn(async () => []),
  };
  const history: PrintJobHistoryRepository = {
    append: vi.fn(async (input) => ({
      id: 1,
      ...input,
      fromStatus: input.fromStatus ?? null,
      metadata: input.metadata ?? null,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    })),
    listByJob: vi.fn(async () => []),
  };
  const publisher: PrintStatusPublisher = { publish: vi.fn(async () => undefined) };
  const payloadBuilder: PrintPayloadBuilderPort = {
    build: vi.fn(async () => samplePayload),
  };
  const coordinator = new PrintDispatchCoordinator(repo, attempts, history, connector, publisher);
  const service = new PrintingService(
    repo,
    attempts,
    history,
    payloadBuilder,
    coordinator,
    publisher
  );

  return { service, repo, attempts, history, publisher, connector };
}

describe("Print job lifecycle", () => {
  it("allows valid operational transitions only", () => {
    expect(canTransitionPrintJobStatus("pending", "dispatched")).toBe(true);
    expect(canTransitionPrintJobStatus("pending", "printed")).toBe(false);
    expect(canTransitionPrintJobStatus("printed", "pending")).toBe(false);
    expect(canTransitionPrintJobStatus("printing", "printed")).toBe(true);
  });
});

describe("PrintingService", () => {
  it("creates, dispatches, and records connector submission", async () => {
    const submit = vi.fn(async () => undefined);
    const { service } = createService({ submit });

    const params: RequestPrintParams = {
      restaurantId: 1,
      orderId: 9,
      orderNumber: "ORD-9",
      source: "order_event",
      idempotencyKey: "order-event:OrderReady:e1",
      triggerEventType: "OrderReady",
      triggerEventId: "e1",
      payload: samplePayload,
      dispatch: true,
    };

    const job = await service.requestPrint(params);

    expect(job.status).toBe("printing");
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: job.id,
        restaurantId: 1,
        orderId: 9,
      })
    );
  });

  it("is idempotent for duplicate order-event keys", async () => {
    const submit = vi.fn(async () => undefined);
    const { service } = createService({ submit });

    const params: RequestPrintParams = {
      restaurantId: 1,
      orderId: 9,
      orderNumber: "ORD-9",
      source: "order_event",
      idempotencyKey: "order-event:OrderReady:e1",
      payload: samplePayload,
      dispatch: true,
    };

    const first = await service.requestPrint(params);
    const second = await service.requestPrint(params);

    expect(second.id).toBe(first.id);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("marks active jobs printed from workspace command path", async () => {
    const { service } = createService({ submit: vi.fn(async () => undefined) });
    const job = await service.requestPrint({
      restaurantId: 1,
      orderId: 9,
      orderNumber: "ORD-9",
      source: "operator",
      idempotencyKey: "operator:1",
      payload: samplePayload,
      dispatch: true,
    });

    const updated = await service.markPrinted({
      restaurantId: 1,
      orderId: 9,
      jobId: job.id,
      operatorUserId: 42,
    });

    expect(updated?.status).toBe("printed");
  });
});
