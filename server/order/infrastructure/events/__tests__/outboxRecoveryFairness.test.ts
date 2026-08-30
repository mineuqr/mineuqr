import { describe, expect, it, vi } from "vitest";
import { comparePendingOutboxForRelay } from "../outbox/outboxRecoveryFairness";
import {
  isOutboxPoisonLastError,
  OUTBOX_POISON_LAST_ERROR_PREFIX,
} from "../outbox/outboxPoison";
import { computeRetryDelayMs, nextOutboxRequeueRetryAt } from "../outbox/outboxRetrySchedule";
import { OrderEventRelay } from "../relay/OrderEventRelay";
import { NoOpEventInfrastructureMetrics } from "../monitoring/EventInfrastructureMetrics";
import type { OutboxRepository } from "../contracts/EventInfrastructureContracts";
import type { StoredOutboxRecord } from "../EventEnvelope";
import type { EventPublisher } from "../contracts/EventInfrastructureContracts";

function record(
  overrides: Partial<StoredOutboxRecord> & { id: string; eventId: string }
): StoredOutboxRecord {
  return {
    eventType: "OrderCreated",
    aggregateType: "Order",
    aggregateId: 1,
    aggregateVersion: null,
    restaurantId: 1,
    sequenceNumber: 1,
    occurredAt: "2026-06-27 10:00:00",
    correlationId: null,
    causationId: null,
    payloadVersion: 1,
    payload: { type: "OrderCreated" },
    status: "pending",
    publishAttempts: 0,
    lastError: null,
    publishedAt: null,
    nextRetryAt: null,
    createdAt: "2026-06-27 10:00:00",
    ...overrides,
  };
}

describe("comparePendingOutboxForRelay", () => {
  it("prefers newer low-attempt work over older high-attempt poison", () => {
    const poison = {
      publishAttempts: 5,
      occurredAt: "2026-06-01 00:00:00",
      sequenceNumber: 1,
    };
    const newer = {
      publishAttempts: 0,
      occurredAt: "2026-08-29 19:00:00",
      sequenceNumber: 2,
    };
    expect(comparePendingOutboxForRelay(poison, newer)).toBeGreaterThan(0);
    const ordered = [poison, newer].sort(comparePendingOutboxForRelay);
    expect(ordered[0]).toBe(newer);
  });
});

describe("outbox poison lastError", () => {
  it("does not treat a generic publisher failure as poison", () => {
    expect(isOutboxPoisonLastError("broker down")).toBe(false);
    expect(isOutboxPoisonLastError(null)).toBe(false);
    expect(
      isOutboxPoisonLastError(`${OUTBOX_POISON_LAST_ERROR_PREFIX}type mismatch`)
    ).toBe(true);
  });
});

describe("outbox requeue backoff", () => {
  it("keeps the existing five-attempt exponential schedule", () => {
    expect(computeRetryDelayMs(1)).toBe(5_000);
    expect(computeRetryDelayMs(5)).toBe(80_000);
  });

  it("schedules requeue in the future without resetting attempts", () => {
    const at = nextOutboxRequeueRetryAt(5, Date.parse("2026-08-30T12:00:00.000Z"));
    expect(at > "2026-08-30 12:00:00").toBe(true);
  });
});

describe("OrderEventRelay fairness with exhausted older events", () => {
  it("publishes a newer pending event when fetch order yields it first", async () => {
    const published: string[] = [];
    const outbox: OutboxRepository = {
      appendInTransaction: vi.fn(),
      fetchPendingBatch: vi.fn(async () => [
        record({
          id: "new",
          eventId: "e-new",
          publishAttempts: 0,
          occurredAt: "2026-08-29 19:00:00",
          sequenceNumber: 99,
        }),
      ]),
      markPublished: vi.fn(async () => true),
      markPublishFailed: vi.fn(),
      countPending: vi.fn(async () => 26),
      requeueFailedBatch: vi.fn(async () => 0),
    };
    const publisher: EventPublisher = {
      publish: vi.fn(async (env) => {
        published.push(env.eventId);
      }),
    };
    const relay = new OrderEventRelay(
      outbox,
      publisher,
      new NoOpEventInfrastructureMetrics()
    );
    const result = await relay.processBatch(50);
    expect(result.published).toBe(1);
    expect(published).toEqual(["e-new"]);
  });

  it("does not mark published twice when markPublished loses the race", async () => {
    const outbox: OutboxRepository = {
      appendInTransaction: vi.fn(),
      fetchPendingBatch: vi.fn(async () => [
        record({ id: "a", eventId: "e1" }),
      ]),
      markPublished: vi.fn(async () => false),
      markPublishFailed: vi.fn(),
      countPending: vi.fn(async () => 1),
      requeueFailedBatch: vi.fn(async () => 0),
    };
    const relay = new OrderEventRelay(
      outbox,
      { publish: vi.fn(async () => undefined) },
      new NoOpEventInfrastructureMetrics()
    );
    const result = await relay.processBatch(10);
    expect(result.skipped).toBe(1);
    expect(result.published).toBe(0);
  });
});
