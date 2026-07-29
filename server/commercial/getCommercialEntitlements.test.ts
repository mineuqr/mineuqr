import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  getUserById: vi.fn(),
  getSubscriptionsByUser: vi.fn(),
}));

vi.mock("../services/commercial-catalog", () => ({
  getSubscriptionCommercialBinding: vi.fn(async () => null),
  resolveCommercialFactsFromSnapshot: vi.fn(async () => ({
    source: "missing",
    snapshot: null,
    featureKeys: [],
    limits: [],
  })),
}));

import { getUserById, getSubscriptionsByUser } from "../db";
import { getCommercialEntitlements } from "./getCommercialEntitlements";
import {
  COMMERCIAL_TEST_NOW,
  commercialTestSubRow,
  installCommercialTestClock,
  isoPlusDaysFromCommercialTestNow,
} from "./__tests__/commercialTestFixtures";

const FIXED_NOW = COMMERCIAL_TEST_NOW;

function isoPlusDays(days: number): string {
  return isoPlusDaysFromCommercialTestNow(days);
}

function subRow(overrides: Parameters<typeof commercialTestSubRow>[0]) {
  return commercialTestSubRow(overrides);
}

describe("getCommercialEntitlements (server integration)", () => {
  installCommercialTestClock();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("flows runtime records through adapter to resolver for active professional", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
      role: "user",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 1, userId: 5, restaurantId: 0, planId: 30002 }),
    ]);

    const result = await getCommercialEntitlements(5, FIXED_NOW);

    expect(result.context.ownerId).toBe(5);
    expect(result.context.role).toBe("user");
    expect(result.context.subscription?.catalogPlan).toBe("PROFESSIONAL");
    expect(result.entitlements.plan).toBe("PROFESSIONAL");
    expect(result.entitlements.accountType).toBe("PAYING");
  });

  it("uses account-level row only (restaurantId = 0)", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 6,
      role: "user",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({
        id: 1,
        userId: 6,
        restaurantId: 99,
        planId: 30003,
        status: "active",
      }),
      subRow({
        id: 2,
        userId: 6,
        restaurantId: 0,
        planId: 30001,
        status: "active",
      }),
    ]);

    const result = await getCommercialEntitlements(6, FIXED_NOW);

    expect(result.context.subscription?.catalogPlan).toBe("BASIC");
    expect(result.entitlements.plan).toBe("BASIC");
  });

  it("returns NONE when only restaurant-scoped rows exist", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 7,
      role: "user",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 1, userId: 7, restaurantId: 50, planId: 30002 }),
    ]);

    const result = await getCommercialEntitlements(7, FIXED_NOW);

    expect(result.context.subscription).toBeNull();
    expect(result.entitlements.plan).toBe("NONE");
  });

  it("returns NONE for INTERNAL admin without subscription (ADMIN-AUTH-1C)", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      role: "admin",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getCommercialEntitlements(1, FIXED_NOW);

    expect(result.context.subscription).toBeNull();
    expect(result.entitlements.plan).toBe("NONE");
    expect(result.entitlements.commercial.isPaid).toBe(false);
  });

  it("resolves admin from subscription row when present", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      role: "admin",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 1, userId: 1, restaurantId: 0, planId: 30001 }),
    ]);

    const result = await getCommercialEntitlements(1, FIXED_NOW);

    expect(result.entitlements.plan).toBe("BASIC");
    expect(getSubscriptionsByUser).toHaveBeenCalledWith(1);
  });

  it("resolves trial from account-level row", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 8,
      role: "user",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({
        id: 1,
        userId: 8,
        restaurantId: 0,
        planId: 30002,
        status: "trial",
        trialEndsAt: isoPlusDays(10),
        currentPeriodEnd: isoPlusDays(10),
      }),
    ]);

    const result = await getCommercialEntitlements(8, FIXED_NOW);

    expect(result.entitlements.plan).toBe("TRIAL");
    expect(result.entitlements.features.reports).toBe(true);
  });
});
