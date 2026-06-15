import { describe, expect, it } from "vitest";
import {
  getEnrollmentCtaLabel,
  getEnrollmentSuccessTitle,
} from "./readyNotificationEnrollmentCopy";

describe("readyNotificationEnrollmentCopy", () => {
  it("uses simple activation CTA", () => {
    expect(getEnrollmentCtaLabel("ar")).toBe("تفعيل الإشعارات");
    expect(getEnrollmentCtaLabel("en")).toBe("Enable Notifications");
  });

  it("uses simple success title", () => {
    expect(getEnrollmentSuccessTitle("ar")).toBe("تم تفعيل الإشعارات");
    expect(getEnrollmentSuccessTitle("en")).toBe("Notifications enabled");
  });
});
