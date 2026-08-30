import { describe, expect, it, vi } from "vitest";
import type {
  OutboxRepository,
} from "../contracts/EventInfrastructureContracts";
import type { StoredOutboxRecord } from "../EventEnvelope";
import {
  computeRetryDelayMs,
  OrderEventRelay,
} from "../relay/OrderEventRelay";
import type { EventPublisher } from "../contracts/EventInfrastructureContracts";
import { NoOpEventInfrastructureMetrics } from "../monitoring/EventInfrastructureMetrics";

function makeRecord(
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

function mockOutbox(overrides: Partial<OutboxRepository> = {}): OutboxRepository {
  return {
    appendInTransaction: vi.fn(),
    fetchPendingBatch: vi.fn(async () => []),
    markPublished: vi.fn(async () => true),
    markPublishFailed: vi.fn(),
    countPending: vi.fn(async () => 0),
    requeueFailedBatch: vi.fn(async () => 0),
    ...overrides,
  };
}

describe("OrderEventRelay", () => {
  it("publishes pending records in occurred-at / sequence order", async () => {
    const published: string[] = [];
    const outbox = mockOutbox({
      fetchPendingBatch: vi.fn(async () => [
        makeRecord({ id: "a", eventId: "e1", sequenceNumber: 1 }),
        makeRecord({ id: "b", eventId: "e2", sequenceNumber: 2 }),
      ]),
      markPublished: vi.fn(async () => true),
      countPending: vi.fn(async () => 2),
    });
    const publisher: EventPublisher = {
      publish: vi.fn(async (env) => {
        published.push(env.eventId);
      }),
    };

    const relay = new OrderEventRelay(outbox, publisher, new NoOpEventInfrastructureMetrics());
    const result = await relay.processBatch(10);

    expect(result).toEqual({ processed: 2, published: 2, failed: 0, skipped: 0 });
    expect(published).toEqual(["e1", "e2"]);
  });

  it("skips duplicate publication when markPublished loses race", async () => {
    const outbox = mockOutbox({
      fetchPendingBatch: vi.fn(async () => [
        makeRecord({ id: "a", eventId: "e1" }),
      ]),
      markPublished: vi.fn(async () => false),
      countPending: vi.fn(async () => 1),
    });
    const publisher: EventPublisher = {
      publish: vi.fn(async () => undefined),
    };

    const relay = new OrderEventRelay(outbox, publisher, new NoOpEventInfrastructureMetrics());
    const result = await relay.processBatch(10);

    expect(result.skipped).toBe(1);
    expect(result.published).toBe(0);
  });

  it("schedules retry with exponential backoff on publish failure", async () => {
    const outbox = mockOutbox({
      fetchPendingBatch: vi.fn(async () => [
        makeRecord({ id: "a", eventId: "e1", publishAttempts: 1 }),
      ]),
      markPublished: vi.fn(),
      countPending: vi.fn(async () => 1),
    });
    const publisher: EventPublisher = {
      publish: vi.fn(async () => {
        throw new Error("broker down");
      }),
    };

    const relay = new OrderEventRelay(outbox, publisher, new NoOpEventInfrastructureMetrics());
    await relay.processBatch(10);

    expect(outbox.markPublishFailed).toHaveBeenCalledWith(
      "a",
      "broker down",
      expect.any(String),
      false
    );
  });

  it("marks dead-letter after max publish attempts", async () => {
    const outbox = mockOutbox({
      fetchPendingBatch: vi.fn(async () => [
        makeRecord({ id: "a", eventId: "e1", publishAttempts: 4 }),
      ]),
      markPublished: vi.fn(),
      countPending: vi.fn(async () => 1),
    });
    const publisher: EventPublisher = {
      publish: vi.fn(async () => {
        throw new Error("still failing");
      }),
    };

    const relay = new OrderEventRelay(outbox, publisher, new NoOpEventInfrastructureMetrics());
    await relay.processBatch(10);

    expect(outbox.markPublishFailed).toHaveBeenCalledWith(
      "a",
      "still failing",
      null,
      true
    );
  });

  it("dead-letters a typed poison payload on the first attempt", async () => {
    const outbox = mockOutbox({
      fetchPendingBatch: vi.fn(async () => [
        makeRecord({
          id: "poison",
          eventId: "e-poison",
          eventType: "OrderCreated",
          payload: { type: "OrderCancelled" },
        }),
      ]),
      countPending: vi.fn(async () => 1),
    });
    const publisher: EventPublisher = {
      publish: vi.fn(async () => undefined),
    };
    const relay = new OrderEventRelay(
      outbox,
      publisher,
      new NoOpEventInfrastructureMetrics()
    );
    await relay.processBatch(10);
    expect(publisher.publish).not.toHaveBeenCalled();
    expect(outbox.markPublishFailed).toHaveBeenCalledWith(
      "poison",
      expect.stringMatching(/^POISON:/),
      null,
      true
    );
  });

  it("publishes a newer valid event in the same batch as a poison payload", async () => {
    const published: string[] = [];
    const outbox = mockOutbox({
      fetchPendingBatch: vi.fn(async () => [
        makeRecord({
          id: "poison",
          eventId: "e-poison",
          eventType: "OrderCreated",
          payload: { type: "OrderCancelled" },
          sequenceNumber: 1,
        }),
        makeRecord({
          id: "fresh",
          eventId: "e-fresh",
          sequenceNumber: 2,
        }),
      ]),
      countPending: vi.fn(async () => 2),
    });
    const relay = new OrderEventRelay(
      outbox,
      {
        publish: vi.fn(async (env) => {
          published.push(env.eventId);
        }),
      },
      new NoOpEventInfrastructureMetrics()
    );
    const result = await relay.processBatch(10);
    expect(result).toEqual({ processed: 2, published: 1, failed: 1, skipped: 0 });
    expect(published).toEqual(["e-fresh"]);
  });

  it("isolates publish failure so a later pending event still publishes", async () => {
    const published: string[] = [];
    const outbox = mockOutbox({
      fetchPendingBatch: vi.fn(async () => [
        makeRecord({ id: "a", eventId: "e1", sequenceNumber: 1 }),
        makeRecord({ id: "b", eventId: "e2", sequenceNumber: 2 }),
      ]),
      countPending: vi.fn(async () => 2),
    });
    const publisher: EventPublisher = {
      publish: vi.fn(async (env) => {
        if (env.eventId === "e1") throw new Error("first invoice failed");
        published.push(env.eventId);
      }),
    };

    const relay = new OrderEventRelay(outbox, publisher, new NoOpEventInfrastructureMetrics());
    const result = await relay.processBatch(10);

    expect(result).toEqual({ processed: 2, published: 1, failed: 1, skipped: 0 });
    expect(published).toEqual(["e2"]);
    expect(outbox.markPublishFailed).toHaveBeenCalledWith(
      "a",
      "first invoice failed",
      expect.any(String),
      false
    );
  });
});

describe("computeRetryDelayMs", () => {
  it("applies exponential backoff from base delay", () => {
    expect(computeRetryDelayMs(1)).toBe(5_000);
    expect(computeRetryDelayMs(2)).toBe(10_000);
    expect(computeRetryDelayMs(3)).toBe(20_000);
  });
});
