import { describe, expect, it } from "vitest";
import { FifoByCreatedAtPolicy } from "../domain/ordering/FifoByCreatedAtPolicy";
import type { KitchenTicketDto } from "../contracts/kitchenQueryContracts";

function ticket(orderId: number, createdAt: string): KitchenTicketDto {
  return {
    orderId,
    orderNumber: `ORD-${orderId}`,
    businessDay: null,
    dailyDisplayNumber: null,
    displayOrderNumber: String(orderId),
    displayReference: String(orderId),
    tableNumber: 1,
    sessionId: null,
    serviceMode: "table_service",
    fulfilmentAnchorType: "table",
    fulfilmentLabel: "1",
    customerName: null,
    orderNotes: null,
    status: "pending",
    totalAmount: "10.00",
    createdAt,
    readyAt: null,
    statusEnteredAt: createdAt,
    elapsedSeconds: 0,
    columnElapsedSeconds: 0,
    urgencyTier: "normal",
    lineCount: 1,
    linesSummary: "1× Item",
    lineItems: [],
    lastEventId: null,
  };
}

describe("FifoByCreatedAtPolicy", () => {
  it("sorts tickets by createdAt ascending", () => {
    const policy = new FifoByCreatedAtPolicy();
    const sorted = policy.sort(
      [ticket(3, "2026-07-04T12:00:00"), ticket(1, "2026-07-04T10:00:00"), ticket(2, "2026-07-04T11:00:00")],
      { restaurantId: 1, now: new Date() }
    );
    expect(sorted.map((t) => t.orderId)).toEqual([1, 2, 3]);
    expect(policy.policyId).toBe("fifo-by-created-at");
  });
});
