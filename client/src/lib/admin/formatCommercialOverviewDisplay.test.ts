import { describe, expect, it } from "vitest";
import { formatCommercialOverviewTimestamp } from "./formatCommercialOverviewDisplay";

describe("formatCommercialOverviewDisplay (EXEC-7C.3)", () => {
  it("formats ISO timestamps for display without derivation", () => {
    const iso = "2026-06-08T12:00:00.000Z";
    expect(formatCommercialOverviewTimestamp(iso, "en")).toBeTruthy();
    expect(formatCommercialOverviewTimestamp(iso, "ar")).toBeTruthy();
  });

  it("returns em dash for invalid ISO", () => {
    expect(formatCommercialOverviewTimestamp("not-a-date", "en")).toBe("—");
  });
});
