import { describe, expect, it } from "vitest";
import { mapActionCenterRows } from "./actionCenter";

describe("actionCenter integration SETTLEMENT-ARCHITECTURE-1A", () => {
  const now = new Date("2026-06-18T15:00:00.000Z");

  it("aggregates long-running sessions only", () => {
    const result = mapActionCenterRows(
      [
        {
          sessionId: 10,
          tableId: 1,
          tableNumber: 1,
          sessionStatus: "open",
          openedAt: "2026-06-18 10:00:00",
          nameAr: "طاولة 1",
          nameEn: "Table 1",
        },
        {
          sessionId: 11,
          tableId: 2,
          tableNumber: 2,
          sessionStatus: "open",
          openedAt: "2026-06-18 14:50:00",
          nameAr: null,
          nameEn: null,
        },
      ],
      now,
      60
    );

    expect(result.longRunningSessions).toHaveLength(1);
    expect(result.longRunningSessions[0]?.sessionId).toBe("10");
  });

  it("returns empty when all sessions are recent", () => {
    const result = mapActionCenterRows(
      [
        {
          sessionId: 10,
          tableId: 1,
          tableNumber: 1,
          sessionStatus: "open",
          openedAt: "2026-06-18 14:55:00",
          nameAr: null,
          nameEn: null,
        },
      ],
      now,
      60
    );

    expect(result.longRunningSessions).toEqual([]);
  });
});
