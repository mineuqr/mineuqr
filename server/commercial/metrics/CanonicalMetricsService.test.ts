import { describe, expect, it, vi, beforeEach } from "vitest";
import { CanonicalMetricsService } from "./CanonicalMetricsService";
import type { ChargedTermsMrrRow } from "./chargedTermsMrr";
import type { OwnerCommercialState } from "../commercialReadSlices";

vi.mock("../CommercialReadService", () => ({
  commercialReadService: {
    getAllOwnerCommercialStates: vi.fn(),
  },
}));

import { commercialReadService } from "../CommercialReadService";

const CATALOG_PRICE_MONTHLY = "45.00";
const LEGACY_SUBSCRIPTION_PLANS_PRICE = "79.00";

function payingFlags(): OwnerCommercialState["commercialStatus"] {
  return {
    accountType: "PAYING",
    isPaid: true,
    isEntitled: true,
    countsInMrr: true,
    countsInRevenue: true,
    invoiceEligible: true,
  };
}

function excludedFlags(
  accountType: OwnerCommercialState["commercialStatus"]["accountType"]
): OwnerCommercialState["commercialStatus"] {
  return {
    accountType,
    isPaid: false,
    isEntitled: accountType === "ADMIN" || accountType === "TRIAL",
    countsInMrr: false,
    countsInRevenue: false,
    invoiceEligible: false,
  };
}

function authority(overrides: Partial<OwnerCommercialState> = {}): OwnerCommercialState {
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
    commercialStatus: payingFlags(),
    currentPeriodEnd: new Date("2026-07-01").toISOString(),
    billingCycle: "monthly",
    authoritySource: "S1_CANONICAL",
    resolvedAt: new Date().toISOString(),
    ...overrides,
  };
}

function terms(
  subscriptionId: number,
  overrides: Partial<ChargedTermsMrrRow> = {}
): ChargedTermsMrrRow {
  return {
    subscriptionId,
    chargedAmount: "35.00",
    chargedCurrency: "USD",
    billingCycleCode: "monthly",
    ...overrides,
  };
}

describe("CanonicalMetricsService — Charged Terms MRR", () => {
  const loadChargedTerms = vi.fn(async (_ids: number[]): Promise<ChargedTermsMrrRow[]> => []);
  const service = new CanonicalMetricsService(commercialReadService, loadChargedTerms);

  beforeEach(() => {
    vi.clearAllMocks();
    loadChargedTerms.mockResolvedValue([]);
  });

  it("1. ACTIVE monthly subscription uses Charged Terms monthly amount", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({ ownerId: 5, subscriptionId: 10 }),
    ]);
    loadChargedTerms.mockResolvedValue([terms(10, { chargedAmount: "35.00" })]);

    const { mrr, metricsSource } = await service.getMRR();
    expect(mrr).toBe(35);
    expect(metricsSource).toBe("CANONICAL_OWNER");
  });

  it("2. ACTIVE annual subscription uses Charged Terms / 12", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({ ownerId: 5, subscriptionId: 10, billingCycle: "yearly" }),
    ]);
    loadChargedTerms.mockResolvedValue([
      terms(10, { chargedAmount: "120.00", billingCycleCode: "yearly" }),
    ]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(10);
  });

  it("3. Trial excluded even when Charged Terms exist", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({
        ownerId: 5,
        subscriptionId: 10,
        planCode: "TRIAL",
        subscriptionStatus: "trial",
        commercialStatus: excludedFlags("TRIAL"),
      }),
    ]);
    loadChargedTerms.mockResolvedValue([terms(10)]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(0);
    expect(loadChargedTerms).toHaveBeenCalledWith([]);
  });

  it("4. Frozen excluded (hub: entitlements off → countsInMrr false)", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({
        ownerId: 5,
        subscriptionId: 10,
        planCode: "NONE",
        subscriptionStatus: "expired",
        commercialStatus: excludedFlags("NONE"),
      }),
    ]);
    loadChargedTerms.mockResolvedValue([terms(10)]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(0);
  });

  it("5. NONE excluded", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({
        ownerId: 5,
        subscriptionId: null,
        planId: null,
        planCode: "NONE",
        subscriptionStatus: null,
        commercialStatus: excludedFlags("NONE"),
      }),
    ]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(0);
  });

  it("6. PLATFORM_OWNER / ADMIN excluded", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({
        ownerId: 1,
        role: "admin",
        planCode: "ADMIN",
        commercialStatus: excludedFlags("ADMIN"),
      }),
    ]);
    loadChargedTerms.mockResolvedValue([terms(1)]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(0);
  });

  it("7. FULL_PLATFORM excluded", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({
        ownerId: 1,
        role: "admin",
        planCode: "ADMIN",
        commercialStatus: excludedFlags("ADMIN"),
      }),
    ]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(0);
  });

  it("8. SIMULATED_PLAN excluded", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({
        ownerId: 1,
        role: "admin",
        planCode: "PROFESSIONAL",
        commercialStatus: excludedFlags("ADMIN"),
      }),
    ]);
    loadChargedTerms.mockResolvedValue([terms(1, { chargedAmount: CATALOG_PRICE_MONTHLY })]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(0);
  });

  it("9–10. Complimentary / zero-value Charged Terms contribute 0", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({ ownerId: 5, subscriptionId: 10 }),
    ]);
    loadChargedTerms.mockResolvedValue([terms(10, { chargedAmount: "0.00" })]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(0);
  });

  it("11. Cancelled excluded", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({
        ownerId: 5,
        subscriptionId: 10,
        planCode: "NONE",
        subscriptionStatus: "canceled",
        commercialStatus: excludedFlags("NONE"),
      }),
    ]);
    loadChargedTerms.mockResolvedValue([terms(10)]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(0);
  });

  it("12. Expired excluded", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({
        ownerId: 5,
        subscriptionId: 10,
        planCode: "NONE",
        subscriptionStatus: "expired",
        commercialStatus: excludedFlags("NONE"),
      }),
    ]);
    loadChargedTerms.mockResolvedValue([terms(10)]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(0);
  });

  it("13. Multiple qualifying subscriptions sum Charged Terms", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({ ownerId: 5, subscriptionId: 10 }),
      authority({ ownerId: 6, subscriptionId: 11, planId: 30001, planCode: "BASIC" }),
    ]);
    loadChargedTerms.mockResolvedValue([
      terms(10, { chargedAmount: "35.00" }),
      terms(11, { chargedAmount: "19.00" }),
    ]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(54);
  });

  it("14 / 20. Monthly + annual subscriptions normalize independently", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({ ownerId: 5, subscriptionId: 10, billingCycle: "monthly" }),
      authority({ ownerId: 6, subscriptionId: 11, billingCycle: "yearly" }),
    ]);
    loadChargedTerms.mockResolvedValue([
      terms(10, { chargedAmount: "35.00", billingCycleCode: "monthly" }),
      terms(11, { chargedAmount: "120.00", billingCycleCode: "yearly" }),
    ]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(45);
  });

  it("15. Catalog price above Charged Terms does not move MRR", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({ ownerId: 5, subscriptionId: 10 }),
    ]);
    loadChargedTerms.mockResolvedValue([terms(10, { chargedAmount: "35.00" })]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(35);
    expect(mrr).not.toBe(Number.parseFloat(CATALOG_PRICE_MONTHLY));
  });

  it("16. Catalog price below Charged Terms does not move MRR", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({ ownerId: 5, subscriptionId: 10 }),
    ]);
    loadChargedTerms.mockResolvedValue([terms(10, { chargedAmount: "35.00" })]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(35);
    expect(mrr).not.toBe(30);
  });

  it("17. Annual Charged Terms $120 → MRR $10", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({ ownerId: 5, subscriptionId: 10, billingCycle: "yearly" }),
    ]);
    loadChargedTerms.mockResolvedValue([
      terms(10, { chargedAmount: "120.00", billingCycleCode: "yearly" }),
    ]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(10);
  });

  it("18. Missing Charged Terms contribute 0 — no catalog or subscription_plans fallback", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({ ownerId: 5, subscriptionId: 10 }),
    ]);
    loadChargedTerms.mockResolvedValue([]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(0);
    expect(loadChargedTerms).toHaveBeenCalledWith([10]);
  });

  it("19. Legacy subscription_plans.price is ignored", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({ ownerId: 5, subscriptionId: 10, planId: 30002 }),
    ]);
    loadChargedTerms.mockResolvedValue([terms(10, { chargedAmount: "35.00" })]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(35);
    expect(mrr).not.toBe(Number.parseFloat(LEGACY_SUBSCRIPTION_PLANS_PRICE));
  });

  it("does not load Charged Terms for ineligible owners", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({
        ownerId: 1,
        planCode: "ADMIN",
        commercialStatus: excludedFlags("ADMIN"),
      }),
    ]);

    const { mrr } = await service.getMRR();
    expect(mrr).toBe(0);
    expect(loadChargedTerms).toHaveBeenCalledWith([]);
  });

  it("groups plan distribution by owner", async () => {
    (commercialReadService.getAllOwnerCommercialStates as ReturnType<typeof vi.fn>).mockResolvedValue([
      authority({ ownerId: 1, planCode: "PROFESSIONAL" }),
      authority({
        ownerId: 2,
        planCode: "NONE",
        subscriptionStatus: null,
        planId: null,
        commercialStatus: excludedFlags("NONE"),
      }),
    ]);

    const { distribution } = await service.getPlanDistribution();
    const pro = distribution.find((d) => d.planCode === "PROFESSIONAL");
    const none = distribution.find((d) => d.planCode === "NONE");
    expect(pro?.ownerCount).toBe(1);
    expect(none?.ownerCount).toBe(1);
  });
});
