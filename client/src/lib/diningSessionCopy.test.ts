import { describe, expect, it } from "vitest";
import {
  getDiningSessionBannerLines,
  getDiningSessionBannerTitle,
} from "./diningSessionCopy";

describe("diningSessionCopy SETTLEMENT-ARCHITECTURE-1A", () => {
  it("provides OPEN banner copy", () => {
    expect(getDiningSessionBannerTitle("open", "en")).toBe("Active session");
    expect(getDiningSessionBannerLines("open", "en")[0]).toContain("active");
  });

  it("provides paid banner copy", () => {
    expect(getDiningSessionBannerTitle("paid", "en")).toBe("Settled");
    expect(getDiningSessionBannerLines("paid", "en")[0]).toContain("settled");
  });

  it("provides complimentary banner copy", () => {
    expect(getDiningSessionBannerTitle("complimentary", "en")).toBe("Complimentary");
    expect(getDiningSessionBannerLines("complimentary", "en")[0]).toContain("Complimentary");
  });

  it("provides CLOSED banner copy", () => {
    expect(getDiningSessionBannerTitle("closed", "en")).toBe("Session ended");
    expect(getDiningSessionBannerLines("closed", "en")[0]).toContain("ended");
  });

  it("provides Arabic banner copy", () => {
    expect(getDiningSessionBannerTitle("open", "ar")).toBe("جلسة نشطة");
    expect(getDiningSessionBannerLines("paid", "ar")[0]).toContain("تسوية");
  });
});
