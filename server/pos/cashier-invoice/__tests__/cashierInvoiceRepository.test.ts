import { describe, expect, it, vi } from "vitest";
import { allocateCashierInvoiceForOrder } from "../cashierInvoiceRepository";

function lookupClient(rows: readonly {
  restaurantId: number;
  orderId: number;
  sequenceNumber: number;
}[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
    execute: vi.fn(),
    insert: vi.fn(),
  };
}

describe("allocateCashierInvoiceForOrder", () => {
  it("returns the existing invoice for the same order without consuming another number", async () => {
    const client = lookupClient([
      { restaurantId: 1, orderId: 44, sequenceNumber: 126 },
    ]);
    const first = await allocateCashierInvoiceForOrder(
      { restaurantId: 1, orderId: 44 },
      client as never
    );
    const second = await allocateCashierInvoiceForOrder(
      { restaurantId: 1, orderId: 44 },
      client as never
    );
    expect(first).toEqual({
      restaurantId: 1,
      orderId: 44,
      sequenceNumber: 126,
      invoiceNumber: "000126",
    });
    expect(second).toEqual(first);
    expect(client.execute).not.toHaveBeenCalled();
    expect(client.insert).not.toHaveBeenCalled();
  });
});
