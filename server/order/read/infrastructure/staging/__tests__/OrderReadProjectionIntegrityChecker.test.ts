import { describe, expect, it } from "vitest";
import {
  compareOrderCounts,
  compareOrderRow,
  summarizeIntegrity,
} from "../OrderReadProjectionIntegrityChecker";

describe("OrderReadProjectionIntegrityChecker", () => {
  const write = {
    restaurantId: 7,
    orderId: 42,
    orderNumber: "ORD-0042",
    status: "pending",
    totalAmount: "25.50",
    tableNumber: 5,
    trackingToken: "tok-42",
  };

  it("reports count mismatch", () => {
    const mismatch = compareOrderCounts(7, 10, 8);
    expect(mismatch).toEqual({
      type: "count_mismatch",
      restaurantId: 7,
      writeCount: 10,
      projectionCount: 8,
    });
  });

  it("reports missing projection row", () => {
    const mismatches = compareOrderRow(write, null);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]?.type).toBe("missing_projection");
  });

  it("reports field mismatch on status", () => {
    const mismatches = compareOrderRow(write, { ...write, status: "served" });
    expect(mismatches.some((m) => m.type === "field_mismatch" && m.field === "status")).toBe(
      true
    );
  });

  it("normalizes decimal totalAmount", () => {
    const mismatches = compareOrderRow(
      { ...write, totalAmount: "25.5" },
      { ...write, totalAmount: "25.50" }
    );
    expect(mismatches.filter((m) => m.type === "field_mismatch")).toHaveLength(0);
  });

  it("reports tenant leak when restaurantId differs", () => {
    const mismatches = compareOrderRow(write, { ...write, restaurantId: 99 });
    expect(mismatches.some((m) => m.type === "tenant_leak")).toBe(true);
  });

  it("summarizes integrity results", () => {
    const summary = summarizeIntegrity([
      { type: "missing_projection", restaurantId: 1, orderId: 2 },
      { type: "field_mismatch", restaurantId: 1, orderId: 3, field: "status", writeValue: "a", projectionValue: "b" },
    ]);
    expect(summary.ok).toBe(false);
    expect(summary.missingProjection).toBe(1);
    expect(summary.fieldMismatch).toBe(1);
  });
});
