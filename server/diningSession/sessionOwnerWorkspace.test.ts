import { describe, expect, it } from "vitest";
import {
  computeOrdersTotalAmount,
  computeSessionDurationMs,
} from "./sessionOwnerWorkspace";

describe("sessionOwnerWorkspace (UX-1B)", () => {
  describe("computeOrdersTotalAmount", () => {
    it("sums non-cancelled order totals", () => {
      expect(
        computeOrdersTotalAmount([
          { status: "pending", totalAmount: "95.00" },
          { status: "ready", totalAmount: "120.00" },
          { status: "served", totalAmount: "70.00" },
        ])
      ).toBe("285.00");
    });

    it("excludes cancelled orders from session total", () => {
      expect(
        computeOrdersTotalAmount([
          { status: "pending", totalAmount: "50.00" },
          { status: "cancelled", totalAmount: "99.00" },
        ])
      ).toBe("50.00");
    });

    it("returns 0.00 when all orders cancelled", () => {
      expect(
        computeOrdersTotalAmount([{ status: "cancelled", totalAmount: "40.00" }])
      ).toBe("0.00");
    });
  });

  describe("computeSessionDurationMs", () => {
    const now = new Date("2026-06-18T22:00:00.000Z");

    it("uses now - openedAt for open sessions", () => {
      const openedAt = "2026-06-18 21:00:00";
      const ms = computeSessionDurationMs(openedAt, null, "open", now);
      expect(ms).toBe(60 * 60 * 1000);
    });

    it("uses closedAt - openedAt for closed sessions", () => {
      const openedAt = "2026-06-18 21:00:00";
      const closedAt = "2026-06-18 21:46:00";
      const ms = computeSessionDurationMs(openedAt, closedAt, "closed", now);
      expect(ms).toBe(46 * 60 * 1000);
    });

    it("never returns negative duration", () => {
      expect(
        computeSessionDurationMs("2026-06-19 21:00:00", null, "open", now)
      ).toBe(0);
    });
  });
});
