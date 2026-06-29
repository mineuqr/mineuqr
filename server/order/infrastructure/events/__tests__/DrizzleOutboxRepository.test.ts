import { describe, expect, it, vi } from "vitest";
import { DrizzleOutboxRepository } from "../outbox/DrizzleOutboxRepository";
import { domainEventsToOutboxInputs } from "../outbox/domainEventsToOutbox";
import type { OrderCreatedEvent } from "../../../domain/events/OrderDomainEvents";

describe("DrizzleOutboxRepository.appendInTransaction", () => {
  it("assigns monotonic sequence numbers per aggregate in one batch", async () => {
    const inserted: Array<{ sequenceNumber: number; eventType: string }> = [];

    const tx = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(async () => [{ maxSeq: 2 }]),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(async (rows: Array<{ sequenceNumber: number; eventType: string }>) => {
          inserted.push(...rows);
        }),
      })),
    };

    const event: OrderCreatedEvent = {
      type: "OrderCreated",
      schemaVersion: 1,
      orderId: 99,
      restaurantId: 1,
      tableId: 1,
      tableNumber: 1,
      orderNumber: "ORD-1",
      trackingToken: "tok",
      totalAmount: "10.00",
      lineCount: 1,
      sessionId: null,
      createdAt: "2026-06-27 10:00:00",
    };

    const inputs = domainEventsToOutboxInputs([event]);
    const repo = new DrizzleOutboxRepository();
    await repo.appendInTransaction(tx as never, inputs);

    expect(inserted.map((r) => r.sequenceNumber)).toEqual([3]);
    expect(inserted[0]!.eventType).toBe("OrderCreated");
  });
});
