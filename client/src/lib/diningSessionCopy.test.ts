import { describe, expect, it } from "vitest";
import {
  getDiningSessionBannerLines,
  getDiningSessionBannerTitle,
} from "./diningSessionCopy";

describe("diningSessionCopy TABLE-MANAGEMENT-1 D4", () => {
  it("provides OPEN banner copy", () => {
    expect(getDiningSessionBannerTitle("open", "en")).toBe("Active session");
    expect(getDiningSessionBannerLines("open", "en")[0]).toContain("active");
  });

  it("provides BILL_REQUESTED banner copy", () => {
    expect(getDiningSessionBannerTitle("bill_requested", "en")).toBe("Bill requested");
    expect(getDiningSessionBannerLines("bill_requested", "en")[0]).toContain("bill");
  });

  it("provides PAYMENT_PENDING banner copy", () => {
    expect(getDiningSessionBannerTitle("payment_pending", "en")).toBe("Payment pending");
    expect(getDiningSessionBannerLines("payment_pending", "en")[0]).toContain("Payment");
  });

  it("provides CLOSED banner copy", () => {
    expect(getDiningSessionBannerTitle("closed", "en")).toBe("Session ended");
    expect(getDiningSessionBannerLines("closed", "en")[0]).toContain("ended");
  });

  it("provides Arabic banner copy", () => {
    expect(getDiningSessionBannerTitle("open", "ar")).toBe("جلسة نشطة");
    expect(getDiningSessionBannerLines("bill_requested", "ar")[0]).toContain("الفاتورة");
  });
});
