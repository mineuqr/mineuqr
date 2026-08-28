import { describe, expect, it, vi } from "vitest";
import {
  insertOrderCreateIdempotencyInTransaction,
  OrderCreateIdempotencyUniqueCollisionError,
} from "../orderCreateIdempotencyStore";

describe("order_create_idempotency store", () => {
  it("converts ER_DUP_ENTRY in the Order transaction into a unique collision", async () => {
    const values = vi.fn().mockRejectedValue({ code: "ER_DUP_ENTRY", errno: 1062 });
    const tx = {
      insert: vi.fn(() => ({ values })),
    };

    await expect(
      insertOrderCreateIdempotencyInTransaction(tx, {
        restaurantId: 1,
        submissionId: "11111111-1111-4111-8111-111111111111",
        fingerprint: "a".repeat(64),
        orderId: 55,
      })
    ).rejects.toBeInstanceOf(OrderCreateIdempotencyUniqueCollisionError);
  });
});
