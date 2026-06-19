import { describe, expect, it } from "vitest";
import { LONG_RUNNING_SESSION_THRESHOLD_MINUTES } from "./operationalConstants";
import {
  computeWaitMinutes,
  mapActionCenterRows,
  type ActionCenterSessionRow,
} from "./actionCenter";

const NOW = new Date("2026-06-18T22:00:00.000Z");

function row(
  overrides: Partial<ActionCenterSessionRow> & Pick<ActionCenterSessionRow, "sessionId" | "sessionStatus">
): ActionCenterSessionRow {
  return {
    tableId: 1,
    tableNumber: 5,
    openedAt: "2026-06-18 21:00:00",
    billRequestedAt: null,
    paymentPendingAt: null,
    nameAr: null,
    nameEn: "Table 5",
    ...overrides,
  };
}

describe("actionCenter OPS-DASHBOARD-2D.1", () => {
  describe("computeWaitMinutes", () => {
    it("computes minutes from timestamp to now", () => {
      expect(computeWaitMinutes("2026-06-18 21:00:00", NOW)).toBe(60);
    });

    it("returns 0 for null timestamp", () => {
      expect(computeWaitMinutes(null, NOW)).toBe(0);
    });
  });

  describe("mapActionCenterRows", () => {
    it("maps bill_requested sessions", () => {
      const result = mapActionCenterRows(
        [
          row({
            sessionId: 10,
            sessionStatus: "bill_requested",
            billRequestedAt: "2026-06-18 21:30:00",
          }),
        ],
        NOW
      );

      expect(result.billRequests).toHaveLength(1);
      expect(result.billRequests[0]).toEqual({
        sessionId: "10",
        tableId: 1,
        tableName: "Table 5",
        requestedAt: "2026-06-18 21:30:00",
        waitMinutes: 30,
      });
      expect(result.paymentPending).toHaveLength(0);
    });

    it("maps payment_pending sessions", () => {
      const result = mapActionCenterRows(
        [
          row({
            sessionId: 11,
            sessionStatus: "payment_pending",
            paymentPendingAt: "2026-06-18 21:45:00",
          }),
        ],
        NOW
      );

      expect(result.paymentPending).toHaveLength(1);
      expect(result.paymentPending[0]).toMatchObject({
        sessionId: "11",
        pendingSince: "2026-06-18 21:45:00",
        waitMinutes: 15,
      });
    });

    it("includes long running active sessions at threshold", () => {
      const result = mapActionCenterRows(
        [
          row({
            sessionId: 12,
            sessionStatus: "open",
            openedAt: "2026-06-18 19:00:00",
          }),
        ],
        NOW,
        LONG_RUNNING_SESSION_THRESHOLD_MINUTES
      );

      expect(result.longRunningSessions).toHaveLength(1);
      expect(result.longRunningSessions[0]).toMatchObject({
        sessionId: "12",
        durationMinutes: 180,
      });
    });

    it("excludes sessions below long running threshold", () => {
      const result = mapActionCenterRows(
        [row({ sessionId: 13, sessionStatus: "open", openedAt: "2026-06-18 21:00:00" })],
        NOW,
        LONG_RUNNING_SESSION_THRESHOLD_MINUTES
      );

      expect(result.longRunningSessions).toHaveLength(0);
    });

    it("sorts bill requests by waitMinutes descending", () => {
      const result = mapActionCenterRows(
        [
          row({
            sessionId: 1,
            sessionStatus: "bill_requested",
            billRequestedAt: "2026-06-18 21:50:00",
          }),
          row({
            sessionId: 2,
            sessionStatus: "bill_requested",
            billRequestedAt: "2026-06-18 21:00:00",
            nameEn: "Table 2",
            tableId: 2,
          }),
        ],
        NOW
      );

      expect(result.billRequests.map((r) => r.sessionId)).toEqual(["2", "1"]);
    });
  });
});
