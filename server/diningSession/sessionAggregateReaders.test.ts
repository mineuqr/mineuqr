import { beforeEach, describe, expect, it, vi } from "vitest";

const opsMocks = vi.hoisted(() => ({
  opsLog: vi.fn(),
}));

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsMocks.opsLog(...args),
}));

import { OPS_EVENT } from "../_core/opsTaxonomy";
import {
  getMaintainedAggregateFallbackReason,
  resolveSessionAggregates,
} from "./sessionAggregateReaders";

const orderRows = [
  { id: 1, orderNumber: "ORD-1", status: "served", totalAmount: "70.00", createdAt: "x" },
  { id: 2, orderNumber: "ORD-2", status: "cancelled", totalAmount: "99.00", createdAt: "y" },
  { id: 3, orderNumber: "ORD-3", status: "pending", totalAmount: "95.00", createdAt: "z" },
] as const;

describe("sessionAggregateReaders SESSION-AGGREGATES-1 Phase B", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMaintainedAggregateFallbackReason", () => {
    it("returns missing_total_amount when totalAmount is null", () => {
      expect(
        getMaintainedAggregateFallbackReason({ totalOrders: 2, totalAmount: null })
      ).toBe("missing_total_amount");
    });

    it("returns missing_total_orders when totalOrders is null", () => {
      expect(
        getMaintainedAggregateFallbackReason({
          totalOrders: null as unknown as number,
          totalAmount: "50.00",
        })
      ).toBe("missing_total_orders");
    });

    it("returns invalid_value for negative totalOrders", () => {
      expect(
        getMaintainedAggregateFallbackReason({ totalOrders: -1, totalAmount: "10.00" })
      ).toBe("invalid_value");
    });

    it("returns invalid_value for negative totalAmount", () => {
      expect(
        getMaintainedAggregateFallbackReason({ totalOrders: 1, totalAmount: "-5.00" })
      ).toBe("invalid_value");
    });

    it("returns null when maintained values are valid", () => {
      expect(
        getMaintainedAggregateFallbackReason({ totalOrders: 2, totalAmount: "165.00" })
      ).toBeNull();
    });
  });

  describe("resolveSessionAggregates", () => {
    it("uses maintained aggregates when present and valid", () => {
      const result = resolveSessionAggregates({
        session: { id: 1, totalOrders: 2, totalAmount: "165.00" },
        orderRows: [...orderRows],
        restaurantId: 10,
      });

      expect(result).toEqual({
        orderCount: 2,
        ordersTotalAmount: "165.00",
        aggregateSource: "maintained",
      });
      expect(opsMocks.opsLog).not.toHaveBeenCalled();
    });

    it("falls back to computed when totalAmount is missing (legacy session)", () => {
      const result = resolveSessionAggregates({
        session: { id: 1, totalOrders: 0, totalAmount: null },
        orderRows: [...orderRows],
        restaurantId: 10,
        procedure: "session.getOwnerWorkspace",
      });

      expect(result).toEqual({
        orderCount: 3,
        ordersTotalAmount: "165.00",
        aggregateSource: "computed",
      });
      expect(opsMocks.opsLog).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.session_aggregate_reader_fallback,
          metadata: { sessionId: 1, reason: "missing_total_amount" },
        })
      );
    });

    it("falls back to computed when totalOrders is invalid", () => {
      const result = resolveSessionAggregates({
        session: { id: 5, totalOrders: -2, totalAmount: "10.00" },
        orderRows: [...orderRows],
        restaurantId: 10,
      });

      expect(result.aggregateSource).toBe("computed");
      expect(result.orderCount).toBe(3);
      expect(opsMocks.opsLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { sessionId: 5, reason: "invalid_value" },
        })
      );
    });

    it("falls back to computed when totalAmount is invalid", () => {
      const result = resolveSessionAggregates({
        session: { id: 5, totalOrders: 2, totalAmount: "not-a-number" },
        orderRows: [...orderRows],
        restaurantId: 10,
      });

      expect(result.aggregateSource).toBe("computed");
      expect(opsMocks.opsLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { sessionId: 5, reason: "invalid_value" },
        })
      );
    });

    it("returns aggregateSource maintained or computed correctly", () => {
      const maintained = resolveSessionAggregates({
        session: { id: 1, totalOrders: 1, totalAmount: "20.00" },
        orderRows: [],
        restaurantId: 1,
      });
      const computed = resolveSessionAggregates({
        session: { id: 2, totalOrders: 0, totalAmount: null },
        orderRows: [],
        restaurantId: 1,
      });

      expect(maintained.aggregateSource).toBe("maintained");
      expect(computed.aggregateSource).toBe("computed");
    });
  });
});
