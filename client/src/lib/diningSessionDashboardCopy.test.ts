import { describe, expect, it } from "vitest";
import {
  buildVisibleSessionOrderCounts,
  formatDashboardSessionLabel,
  formatDashboardSessionOrderCount,
  hasDashboardSession,
} from "./diningSessionDashboardCopy";

describe("diningSessionDashboardCopy (UX-1A)", () => {
  it("formats session label", () => {
    expect(formatDashboardSessionLabel(1, "ar")).toBe("جلسة #1");
    expect(formatDashboardSessionLabel(42, "en")).toBe("Session #42");
  });

  it("formats multi-order session count", () => {
    expect(formatDashboardSessionOrderCount(2, "ar")).toBe("طلبان");
    expect(formatDashboardSessionOrderCount(3, "ar")).toBe("3 طلبات");
    expect(formatDashboardSessionOrderCount(3, "en")).toBe("3 orders");
  });

  it("counts visible orders per session", () => {
    const counts = buildVisibleSessionOrderCounts([
      { sessionId: 1 },
      { sessionId: 1 },
      { sessionId: 2 },
      { sessionId: null },
      {},
    ]);
    expect(counts.get(1)).toBe(2);
    expect(counts.get(2)).toBe(1);
  });

  it("hasDashboardSession rejects invalid ids", () => {
    expect(hasDashboardSession(1)).toBe(true);
    expect(hasDashboardSession(null)).toBe(false);
    expect(hasDashboardSession(undefined)).toBe(false);
    expect(hasDashboardSession(0)).toBe(false);
  });
});
