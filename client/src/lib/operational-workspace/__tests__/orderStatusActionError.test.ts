import { describe, expect, it } from "vitest";
import { TRPCClientError } from "@trpc/client";
import {
  formatOrderStatusActionError,
  isOrderRequiresSettlementError,
} from "../orderStatusActionError";

describe("formatOrderStatusActionError", () => {
  it("maps ORDER_REQUIRES_SETTLEMENT to cashier-facing copy", () => {
    const error = new TRPCClientError("Cannot complete order before settlement.");
    expect(isOrderRequiresSettlementError(error)).toBe(true);
    expect(formatOrderStatusActionError(error, "ar")).toBe(
      "لا يمكن إتمام التقديم قبل تسوية الطلب"
    );
    expect(formatOrderStatusActionError(error, "en")).toBe(
      "Cannot mark served until the order is settled."
    );
  });

  it("keeps a safe server business message", () => {
    const error = new TRPCClientError("Invalid status transition");
    expect(formatOrderStatusActionError(error, "en")).toBe(
      "Invalid status transition"
    );
  });

  it("does not expose stack traces", () => {
    const error = new Error("boom\n    at foo (file.ts:1:1)");
    expect(formatOrderStatusActionError(error, "en")).toBe(
      "Could not update order status."
    );
  });
});
