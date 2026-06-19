import { describe, expect, it } from "vitest";
import { mapActionCenterRows } from "./actionCenter";

describe("actionCenter SETTLEMENT-ARCHITECTURE-1A", () => {
  const now = new Date("2026-06-18T15:00:00.000Z");

  it("maps long-running open sessions", () => {
    const result = mapActionCenterRows(
      [
        {
          sessionId: 1,
          tableId: 10,
          tableNumber: 5,
          sessionStatus: "open",
          openedAt: "2026-06-18 10:00:00",
          nameAr: null,
          nameEn: null,
        },
      ],
      now,
      60
    );

    expect(result.longRunningSessions).toHaveLength(1);
    expect(result.longRunningSessions[0]?.sessionId).toBe("1");
  });

  it("returns empty when no long-running sessions", () => {
    const result = mapActionCenterRows(
      [
        {
          sessionId: 1,
          tableId: 10,
          tableNumber: 5,
          sessionStatus: "open",
          openedAt: "2026-06-18 14:30:00",
          nameAr: null,
          nameEn: null,
        },
      ],
      now,
      120
    );

    expect(result.longRunningSessions).toEqual([]);
  });
});
