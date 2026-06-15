import { describe, expect, it } from "vitest";
import {
  getEnrollmentBenefitHeadline,
  getEnrollmentCtaLabel,
  shouldShowEnrollmentBenefitPrompt,
  shouldShowIosInstallSteps,
} from "./readyNotificationEnrollmentCopy";

describe("readyNotificationEnrollmentCopy CUSTOMER-UX-1D", () => {
  it("shows benefit prompt before activation attempt", () => {
    expect(shouldShowEnrollmentBenefitPrompt("PERMISSION_REQUIRED", false)).toBe(true);
    expect(shouldShowEnrollmentBenefitPrompt("NOT_SUPPORTED", false)).toBe(true);
    expect(shouldShowEnrollmentBenefitPrompt("PERMISSION_REQUIRED", true)).toBe(false);
  });

  it("shows iOS steps only after activation attempt on NOT_SUPPORTED", () => {
    expect(shouldShowIosInstallSteps("NOT_SUPPORTED", false, true)).toBe(false);
    expect(shouldShowIosInstallSteps("NOT_SUPPORTED", true, true)).toBe(true);
    expect(shouldShowIosInstallSteps("PERMISSION_REQUIRED", true, true)).toBe(false);
  });

  it("uses customer benefit headline", () => {
    expect(getEnrollmentBenefitHeadline("en")).toContain("order is ready");
  });

  it("uses Enable Notifications CTA", () => {
    expect(getEnrollmentCtaLabel("en", false)).toBe("Enable Notifications");
    expect(getEnrollmentCtaLabel("en", true)).toBe("Try again");
  });
});
