import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseRegisterBody, RegisterDuplicateEmailError } from "./auth-local/registerOwner";

vi.mock("./db", () => ({
  getDb: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

vi.mock("./create-trial-subscription", () => ({
  buildTrialSubscriptionForUser: vi.fn(async (userId: number, restaurantId: number) => ({
    userId,
    restaurantId,
    planId: 30002,
    status: "trial",
    billingCycle: "monthly",
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date().toISOString(),
    trialEndsAt: new Date().toISOString(),
  })),
}));

describe("parseRegisterBody", () => {
  it("accepts valid registration payload", () => {
    const parsed = parseRegisterBody({
      restaurantName: "مطعم الاختبار",
      email: "Owner@Example.com",
      password: "password1",
      name: "أحمد",
      phone: "0500000000",
    });
    expect(parsed.restaurantName).toBe("مطعم الاختبار");
    expect(parsed.email).toBe("owner@example.com");
    expect(parsed.password).toBe("password1");
    expect(parsed.name).toBe("أحمد");
    expect(parsed.phone).toBe("0500000000");
  });

  it("rejects password shorter than 8 characters", () => {
    expect(() =>
      parseRegisterBody({
        restaurantName: "Test",
        email: "a@b.co",
        password: "short",
      })
    ).toThrow();
  });

  it("rejects missing restaurant name", () => {
    expect(() =>
      parseRegisterBody({
        restaurantName: "",
        email: "a@b.co",
        password: "password1",
      })
    ).toThrow();
  });
});

describe("RegisterDuplicateEmailError", () => {
  it("has Arabic message", () => {
    const err = new RegisterDuplicateEmailError();
    expect(err.messageAr).toContain("مستخدم");
  });
});
