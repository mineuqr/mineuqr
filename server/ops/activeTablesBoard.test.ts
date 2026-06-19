import { describe, expect, it } from "vitest";
import { mapTableSessionRowToBoardRow } from "./activeTablesBoard";

describe("activeTablesBoard OPS-DASHBOARD-2C.1", () => {
  const now = new Date("2026-06-18T22:00:00.000Z");

  it("maps available table without session", () => {
    const result = mapTableSessionRowToBoardRow(
      {
        tableId: 1,
        tableNumber: 5,
        nameAr: "طاولة 5",
        nameEn: "Table 5",
        sessionId: null,
        sessionStatus: null,
        openedAt: null,
        totalOrders: null,
        billRequestedAt: null,
      },
      new Map(),
      now
    );

    expect(result).toEqual({
      tableId: 1,
      tableName: "Table 5",
      sessionId: null,
      status: "available",
      guestCount: 0,
      durationMinutes: 0,
      totalOrders: 0,
      pendingOrders: 0,
      billRequested: false,
    });
  });

  it("maps occupied session with maintained aggregates and pending orders", () => {
    const result = mapTableSessionRowToBoardRow(
      {
        tableId: 2,
        tableNumber: 3,
        nameAr: null,
        nameEn: null,
        sessionId: 42,
        sessionStatus: "open",
        openedAt: "2026-06-18 21:00:00",
        totalOrders: 3,
        billRequestedAt: null,
      },
      new Map([[42, 2]]),
      now
    );

    expect(result).toMatchObject({
      tableId: 2,
      tableName: "Table 3",
      sessionId: "42",
      status: "occupied",
      totalOrders: 3,
      pendingOrders: 2,
      billRequested: false,
    });
    expect(result.durationMinutes).toBe(60);
  });

  it("maps bill_requested session", () => {
    const result = mapTableSessionRowToBoardRow(
      {
        tableId: 3,
        tableNumber: 7,
        nameAr: "VIP",
        nameEn: null,
        sessionId: 99,
        sessionStatus: "bill_requested",
        openedAt: "2026-06-18 21:30:00",
        totalOrders: 2,
        billRequestedAt: "2026-06-18 21:55:00",
      },
      new Map([[99, 0]]),
      now
    );

    expect(result.status).toBe("bill_requested");
    expect(result.billRequested).toBe(true);
    expect(result.sessionId).toBe("99");
  });

  it("maps payment_pending session with billRequested true", () => {
    const result = mapTableSessionRowToBoardRow(
      {
        tableId: 4,
        tableNumber: 1,
        nameAr: null,
        nameEn: "Booth 1",
        sessionId: 12,
        sessionStatus: "payment_pending",
        openedAt: "2026-06-18 20:00:00",
        totalOrders: 1,
        billRequestedAt: "2026-06-18 21:00:00",
      },
      new Map(),
      now
    );

    expect(result.status).toBe("payment_pending");
    expect(result.billRequested).toBe(true);
  });
});
