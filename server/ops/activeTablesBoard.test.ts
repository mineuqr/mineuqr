import { describe, expect, it } from "vitest";
import { mapTableSessionRowToBoardRow } from "./activeTablesBoard";

describe("activeTablesBoard SETTLEMENT-ARCHITECTURE-1A", () => {
  const now = new Date("2026-06-18T15:00:00.000Z");

  it("maps open session to occupied", () => {
    const result = mapTableSessionRowToBoardRow(
      {
        tableId: 1,
        tableNumber: 5,
        nameAr: null,
        nameEn: null,
        sessionId: 10,
        sessionStatus: "open",
        openedAt: "2026-06-18 12:00:00",
        totalOrders: 2,
      },
      new Map([[10, 1]]),
      now
    );

    expect(result.status).toBe("occupied");
    expect(result.sessionId).toBe("10");
    expect(result.pendingOrders).toBe(1);
  });

  it("maps no session to available", () => {
    const result = mapTableSessionRowToBoardRow(
      {
        tableId: 1,
        tableNumber: 5,
        nameAr: null,
        nameEn: null,
        sessionId: null,
        sessionStatus: null,
        openedAt: null,
        totalOrders: null,
      },
      new Map(),
      now
    );

    expect(result.status).toBe("available");
    expect(result.sessionId).toBeNull();
  });
});
