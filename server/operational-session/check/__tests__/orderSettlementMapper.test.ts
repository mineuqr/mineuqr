import { describe, expect, it } from "vitest";
import type { SelectCheckOrderSettlement } from "../../../../drizzle/schema";
import {
  mapRowToOrderSettlement,
  toOrderSettlementInsertValues,
  toOrderSettlementUpdateValues,
} from "../orderSettlementMapper";
import type { OrderSettlement } from "@shared/operational-session";

const domain: OrderSettlement = {
  restaurantId: 1,
  checkId: 10,
  orderId: 55,
  status: "pending",
  orderTotalSnapshot: "100.00",
  allocatedAmount: "100.00",
  settledAmount: "0.00",
  outstandingAmount: "100.00",
  createdAt: "2026-07-22 10:00:00",
  updatedAt: "2026-07-22 10:00:00",
};

const row: SelectCheckOrderSettlement = {
  id: 7,
  restaurantId: 1,
  checkId: 10,
  orderId: 55,
  status: "partially_settled",
  orderTotalSnapshot: "100.00",
  allocatedAmount: "100.00",
  settledAmount: "40.00",
  outstandingAmount: "60.00",
  createdAt: "2026-07-22 10:00:00",
  updatedAt: "2026-07-22 11:00:00",
};

describe("ORDER-SETTLEMENT-PERSISTENCE-1 mapper", () => {
  it("maps row → Domain deterministically", () => {
    expect(mapRowToOrderSettlement(row)).toEqual({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
      status: "partially_settled",
      orderTotalSnapshot: "100.00",
      allocatedAmount: "100.00",
      settledAmount: "40.00",
      outstandingAmount: "60.00",
      createdAt: "2026-07-22 10:00:00",
      updatedAt: "2026-07-22 11:00:00",
    });
  });

  it("coerces decimal fields to strings", () => {
    const numericRow = {
      ...row,
      orderTotalSnapshot: 12.5 as unknown as string,
      settledAmount: 2 as unknown as string,
      outstandingAmount: 10.5 as unknown as string,
      allocatedAmount: 12.5 as unknown as string,
    };
    const mapped = mapRowToOrderSettlement(numericRow);
    expect(mapped.orderTotalSnapshot).toBe("12.5");
    expect(mapped.settledAmount).toBe("2");
  });

  it("maps Domain → insert values without surrogate id", () => {
    expect(toOrderSettlementInsertValues(domain)).toEqual({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
      status: "pending",
      orderTotalSnapshot: "100.00",
      allocatedAmount: "100.00",
      settledAmount: "0.00",
      outstandingAmount: "100.00",
      createdAt: "2026-07-22 10:00:00",
      updatedAt: "2026-07-22 10:00:00",
    });
  });

  it("maps Domain → update values excluding identity", () => {
    const settled: OrderSettlement = {
      ...domain,
      status: "settled",
      settledAmount: "100.00",
      outstandingAmount: "0.00",
      updatedAt: "2026-07-22 12:00:00",
    };
    expect(toOrderSettlementUpdateValues(settled)).toEqual({
      status: "settled",
      orderTotalSnapshot: "100.00",
      allocatedAmount: "100.00",
      settledAmount: "100.00",
      outstandingAmount: "0.00",
      updatedAt: "2026-07-22 12:00:00",
    });
  });

  it("round-trips Domain → insert → row-shaped → Domain", () => {
    const insert = toOrderSettlementInsertValues(domain);
    const reconstituted = mapRowToOrderSettlement({
      id: 1,
      ...insert,
    });
    expect(reconstituted).toEqual(domain);
  });

  it("rejects invalid status on read", () => {
    expect(() =>
      mapRowToOrderSettlement({
        ...row,
        status: "open" as SelectCheckOrderSettlement["status"],
      })
    ).toThrow(/Invalid OrderSettlementStatus/);
  });
});
