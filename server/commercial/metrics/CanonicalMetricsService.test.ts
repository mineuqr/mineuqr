import { describe, expect, it, vi, beforeEach } from "vitest";
import type { UserSubscriptionRow } from "../../subscriptionResolver";
import { CanonicalMetricsService } from "./CanonicalMetricsService";
import type { OwnerCommercialState } from "../commercialReadSlices";

vi.mock("../../db", () => ({
  getSubscriptionPlans: vi.fn(),
  getSubscriptionPlanById: vi.fn(),
  getAllUsers: vi.fn(),
}));

vi.mock("../CommercialReadService", () => ({
  commercialReadService: {
    getAllOwnerCommercialStates: vi.fn(),
  },
}));

import { getSubscriptionPlans } from "../../db";
import { commercialReadService } from "../CommercialReadService";

const PLAN_ROWS = [
  { id: 30001, priceMonthly: "29.00", priceYearly: "290.00" },
  { id: 30002, priceMonthly: "79.00", priceYearly: "790.00" },
];

function authority(overrides: Partial<OwnerCommercialState>): OwnerCommercialState {
  return {
    ownerId: 1,
    role: "user",
    subscriptionId: 1,
    subscriptionStatus: "active",
    planId: 30002,
    planCode: "PROFESSIONAL",
    planName: "Professional",
    trialStatus: { isTrial: false, trialEndsAt: null, daysRemaining: null },
    maxRestaurants: 5,
    features: {} as OwnerCommercialState["features"],
    entitlements: {} as OwnerCommercialState["entitlements"],
    commercialStatus: {
      accountType: "PAYING",
      isPaid: true,
      isEntitled: true,
      countsInMrr: true,
      countsInRevenue: true,
      invoiceEligible: true,
    },
    currentPeriodEnd: new Date("2026-07-01").toISOString(),
    billingCycle: "monthly",
    authoritySource: "S1_CANONICAL",
    resolvedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("CanonicalMetricsService", () => {
  const service = new CanonicalMetricsService();

  beforeEach(() => {
    vi.clearAllMocks();
    (getSubscriptionPlans as ReturnType<typeof vi.fn>).mockResolvedValue(PLAN_ROWS);
  });

  it("computes MRR as one unit per paying owner", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({ ownerId: 5 }),
    ]);

    const { mrr, metricsSource } = await service.getMRR();
    expect(mrr).toBe(79);
    expect(metricsSource).toBe("CANONICAL_OWNER");
  });

  it("excludes owners without countsInMrr", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({
        ownerId: 1,
        planCode: "ADMIN",
        commercialStatus: {
          accountType: "ADMIN",
          isPaid: false,
          isEntitled: true,
          countsInMrr: false,
          countsInRevenue: false,
          invoiceEligible: false,
        },
      }),
    ]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(0);
  });

  it("groups plan distribution by owner", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({ ownerId: 1, planCode: "PROFESSIONAL" }),
      authority({ ownerId: 2, planCode: "NONE", subscriptionStatus: null, planId: null, commercialStatus: { accountType: "NONE", isPaid: false, isEntitled: false, countsInMrr: false, countsInRevenue: false, invoiceEligible: false } }),
    ]);

    const { distribution } = await service.getPlanDistribution();
    const pro = distribution.find((d) => d.planCode === "PROFESSIONAL");
    const none = distribution.find((d) => d.planCode === "NONE");
    expect(pro?.ownerCount).toBe(1);
    expect(none?.ownerCount).toBe(1);
  });
});
