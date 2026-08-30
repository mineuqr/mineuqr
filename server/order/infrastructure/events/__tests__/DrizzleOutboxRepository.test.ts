import { describe, expect, it, vi } from "vitest";
import { getDb } from "../../../../db";
import { DrizzleOutboxRepository } from "../outbox/DrizzleOutboxRepository";
import { domainEventsToOutboxInputs } from "../outbox/domainEventsToOutbox";
import type { OrderCreatedEvent } from "../../../domain/events/OrderDomainEvents";

vi.mock("../../../../db", () => ({
  getDb: vi.fn(),
}));

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

describe("DrizzleOutboxRepository.requeueFailedBatch", () => {
  it("moves failed rows back to pending without resetting publishAttempts", async () => {
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));
    vi.mocked(getDb).mockResolvedValue({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(async () => [{ id: "failed-1", publishAttempts: 5 }]),
            })),
          })),
        })),
      })),
      update: vi.fn(() => ({ set })),
    } as never);

    const repo = new DrizzleOutboxRepository();
    const moved = await repo.requeueFailedBatch(25);

    expect(moved).toBe(1);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        nextRetryAt: expect.any(String),
      })
    );
    expect(set.mock.calls[0]![0]).not.toHaveProperty("publishAttempts");
  });
});
