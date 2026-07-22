import { describe, expect, it } from "vitest";
import {
  InMemoryDurableBusinessClaimStore,
  BUSINESS_CLAIM_NS,
  notificationNewOrderKey,
  orderPrintBusinessIdempotencyKey,
  p06CanonicalTransitionsForStatus,
  p06OrderCreatedKey,
  p06StatusTransitionKey,
} from "../DurableBusinessClaimStore";

describe("DurableBusinessClaimStore", () => {
  it("tryClaim succeeds once under concurrent callers", async () => {
    const store = new InMemoryDurableBusinessClaimStore();
    const key = notificationNewOrderKey(1, 55);
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        store.tryClaim(BUSINESS_CLAIM_NS.notificationNewOrder, key)
      )
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("keeps business keys within varchar(36)", () => {
    expect(notificationNewOrderKey(720007, 5580001).length).toBeLessThanOrEqual(36);
    expect(p06OrderCreatedKey(720007, 5580001).length).toBeLessThanOrEqual(36);
    expect(
      p06StatusTransitionKey(720007, 5580001, "pending", "preparing").length
    ).toBeLessThanOrEqual(36);
    expect(orderPrintBusinessIdempotencyKey(5580001, "OrderCreated").length).toBeLessThanOrEqual(
      128
    );
  });

  it("seeds canonical transitions for snapshot status", () => {
    expect(p06CanonicalTransitionsForStatus("ready")).toEqual([
      ["pending", "preparing"],
      ["preparing", "ready"],
    ]);
    expect(p06CanonicalTransitionsForStatus("pending")).toEqual([]);
  });
});
