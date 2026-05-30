import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn<[], Promise<boolean>>(),
}));

vi.mock("./email", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("./_core/env", () => ({
  ENV: {
    emailFrom: "owner@mineuqr.com",
    emailUser: "",
    emailPassword: "",
    resendApiKey: "re_test_key",
  },
}));

import {
  notifyOwnerNewUser,
  notifyOwnerNewSubscription,
  notifyOwnerNewRestaurant,
  notifyOwnerSubscriptionCancelled,
} from "./owner-email-notifications";

describe("Owner Email Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendEmail.mockResolvedValue(true);
  });

  describe("notifyOwnerNewUser", () => {
    it("should send email notification for new user registration", async () => {
      const result = await notifyOwnerNewUser({
        name: "أحمد محمد",
        email: "ahmed@test.com",
        loginMethod: "google",
      });

      expect(result).toBe(true);
      expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

      const emailCall = mocks.sendEmail.mock.calls[0][0];
      expect(emailCall.subject).toContain("مستخدم جديد");
      expect(emailCall.to).toBe("owner@mineuqr.com");
      expect(emailCall.html).toContain("أحمد محمد");
      expect(emailCall.html).toContain("ahmed@test.com");
      expect(emailCall.html).toContain("google");
    });

    it("should handle null user data gracefully", async () => {
      const result = await notifyOwnerNewUser({
        name: null,
        email: null,
        loginMethod: null,
      });

      expect(result).toBe(true);
      expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

      const emailCall = mocks.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain("غير محدد");
    });
  });

  describe("notifyOwnerNewSubscription", () => {
    it("should send email notification for new subscription", async () => {
      const result = await notifyOwnerNewSubscription({
        userName: "سارة أحمد",
        userEmail: "sara@test.com",
        planName: "الخطة الاحترافية",
        billingCycle: "monthly",
        amount: "35 USD",
      });

      expect(result).toBe(true);
      expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

      const emailCall = mocks.sendEmail.mock.calls[0][0];
      expect(emailCall.subject).toContain("اشتراك جديد");
      expect(emailCall.html).toContain("سارة أحمد");
      expect(emailCall.html).toContain("الخطة الاحترافية");
      expect(emailCall.html).toContain("35 USD");
    });

    it("should show yearly billing cycle in Arabic", async () => {
      const result = await notifyOwnerNewSubscription({
        userName: "خالد",
        userEmail: "khalid@test.com",
        planName: "الخطة الأساسية",
        billingCycle: "yearly",
        amount: "175 USD",
      });

      expect(result).toBe(true);
      const emailCall = mocks.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain("سنوي");
    });
  });

  describe("notifyOwnerNewRestaurant", () => {
    it("should send email notification for new restaurant", async () => {
      const result = await notifyOwnerNewRestaurant({
        restaurantNameAr: "مطعم الريان",
        restaurantNameEn: "Al Rayan Restaurant",
        ownerName: "محمد علي",
        ownerEmail: "mohammed@test.com",
      });

      expect(result).toBe(true);
      expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

      const emailCall = mocks.sendEmail.mock.calls[0][0];
      expect(emailCall.subject).toContain("مطعم جديد");
      expect(emailCall.html).toContain("مطعم الريان");
      expect(emailCall.html).toContain("Al Rayan Restaurant");
      expect(emailCall.html).toContain("محمد علي");
    });

    it("should handle missing English name", async () => {
      const result = await notifyOwnerNewRestaurant({
        restaurantNameAr: "مطعم النور",
        ownerName: null,
        ownerEmail: null,
      });

      expect(result).toBe(true);
      const emailCall = mocks.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain("مطعم النور");
      expect(emailCall.html).toContain("غير محدد");
    });
  });

  describe("notifyOwnerSubscriptionCancelled", () => {
    it("should send email notification for subscription cancellation", async () => {
      const result = await notifyOwnerSubscriptionCancelled({
        userName: "فاطمة حسن",
        userEmail: "fatima@test.com",
        planName: "الخطة المؤسسية",
        subscriptionId: 42,
      });

      expect(result).toBe(true);
      expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

      const emailCall = mocks.sendEmail.mock.calls[0][0];
      expect(emailCall.subject).toContain("إلغاء اشتراك");
      expect(emailCall.html).toContain("فاطمة حسن");
      expect(emailCall.html).toContain("الخطة المؤسسية");
      expect(emailCall.html).toContain("#42");
    });
  });

  describe("Email sending failure", () => {
    it("should return false when sendEmail fails", async () => {
      mocks.sendEmail.mockResolvedValueOnce(false);

      const result = await notifyOwnerNewUser({
        name: "test",
        email: "test@test.com",
        loginMethod: null,
      });

      expect(result).toBe(false);
    });
  });
});
