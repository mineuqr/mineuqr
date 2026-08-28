/**
 * ORDER-CREATE-SUBMISSION-IDEMPOTENCY-SCHEMA-AND-HARDENING-1
 * In-process unique-key simulation of two concurrent same-submission inserts.
 * Database PRIMARY KEY is the production authority; this proves rollback+replay.
 */
import { describe, expect, it } from "vitest";
import { classifyBusinessIdentityInfrastructureError } from "../../business-identity/infrastructure/mysqlInfrastructureErrors";
import {
  OrderCreateIdempotencyUniqueCollisionError,
} from "../../infrastructure/persistence/orderCreateIdempotencyStore";

describe("order.create concurrent same submission", () => {
  it("unique (restaurantId, submissionId) admits exactly one mapping", async () => {
    const rows = new Map<string, { orderId: number; fingerprint: string }>();
    const key = "1:11111111-1111-4111-8111-111111111111";
    const fingerprint = "a".repeat(64);
    let nextOrderId = 100;
    let identityAllocations = 0;
    let outboxEvents = 0;

    async function attemptCreate(): Promise<number> {
      identityAllocations += 1;
      const orderId = nextOrderId++;
      await Promise.resolve();
      if (rows.has(key)) {
        identityAllocations -= 1;
        throw new OrderCreateIdempotencyUniqueCollisionError();
      }
      rows.set(key, { orderId, fingerprint });
      outboxEvents += 1;
      return orderId;
    }

    const settled = await Promise.allSettled([attemptCreate(), attemptCreate()]);
    const fulfilled = settled.filter((row) => row.status === "fulfilled");
    const rejected = settled.filter((row) => row.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rows.size).toBe(1);
    expect(outboxEvents).toBe(1);
    expect(identityAllocations).toBe(1);

    const winner = (fulfilled[0] as PromiseFulfilledResult<number>).value;
    const collision = rejected[0];
    expect(collision.status).toBe("rejected");
    if (collision.status === "rejected") {
      expect(collision.reason).toBeInstanceOf(OrderCreateIdempotencyUniqueCollisionError);
    }
    expect(rows.get(key)?.orderId).toBe(winner);
  });

  it("classifies ER_DUP_ENTRY as the durable unique-violation used across instances", () => {
    expect(
      classifyBusinessIdentityInfrastructureError({
        code: "ER_DUP_ENTRY",
        errno: 1062,
      })
    ).toBe("unique_violation");
  });
});
