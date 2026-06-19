import { describe, expect, it } from "vitest";
import {
  computeWorkspaceDurationMs,
  formatSessionDuration,
  formatSessionTotalAmount,
  sessionSummaryLabel,
} from "./diningSessionWorkspaceCopy";

describe("diningSessionWorkspaceCopy (UX-1B)", () => {
  it("formats Arabic duration in minutes", () => {
    expect(formatSessionDuration(46 * 60_000, "ar")).toBe("46 دقيقة");
  });

  it("formats Arabic duration with hours and minutes", () => {
    expect(formatSessionDuration((60 + 12) * 60_000, "ar")).toBe("ساعة واحدة 12 دقيقة");
  });

  it("formats English duration", () => {
    expect(formatSessionDuration(46 * 60_000, "en")).toBe("46 min");
    expect(formatSessionDuration((2 * 60 + 5) * 60_000, "en")).toBe("2h 5m");
  });

  it("computes open session duration from openedAt", () => {
    const now = new Date("2026-06-18T22:00:00.000Z");
    const ms = computeWorkspaceDurationMs("2026-06-18 21:00:00", null, "open", now);
    expect(ms).toBe(60 * 60 * 1000);
  });

  it("formats session total with currency", () => {
    expect(formatSessionTotalAmount("285.00", "ر.س", "ar")).toBe("285.00 ر.س");
  });

  it("provides Arabic summary labels", () => {
    expect(sessionSummaryLabel("duration", "ar")).toBe("المدة");
    expect(sessionSummaryLabel("sessionTotal", "ar")).toBe("إجمالي الجلسة");
    expect(sessionSummaryLabel("ordersInSession", "ar")).toBe("الطلبات في الجلسة");
  });
});
