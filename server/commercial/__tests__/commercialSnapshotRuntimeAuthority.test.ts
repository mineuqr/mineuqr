/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — runtime authority guards.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  commercialRuntimeAuthorityObservability,
} from "../../services/commercial-catalog/runtimeAuthorityObservability";
import {
  COMMERCIAL_TEST_NOW,
  commercialTestSubRow,
  installCommercialTestClock,
  isoPlusDaysFromCommercialTestNow,
} from "./commercialTestFixtures";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

vi.mock("../../db", () => ({
  getUserById: vi.fn(),
  getSubscriptionsByUser: vi.fn(),
}));

vi.mock("../../services/commercial-catalog", () => ({
  getSubscriptionCommercialBinding: vi.fn(),
  resolveLivePlanCapabilities: vi.fn(),
  ensureCatalogReady: vi.fn(async () => {}),
}));

import { getUserById, getSubscriptionsByUser } from "../../db";
import {
  getSubscriptionCommercialBinding,
  resolveLivePlanCapabilities,
} from "../../services/commercial-catalog";
import { getCommercialEntitlements } from "../getCommercialEntitlements";

const FIXED_NOW = COMMERCIAL_TEST_NOW;

describe("Live plan runtime authority architecture guards", () => {
  it("entitlement hub uses live plan / legacy bridge", () => {
    const src = read("server/commercial/getCommercialEntitlements.ts");
    expect(src).not.toMatch(/\.\.\.base/);
    expect(src).toContain("Legacy Bridge ONLY");
    expect(src).toContain("Live Plan");
  });

  it("wires live plan bind on payment + admin activation paths", () => {
    expect(read("server/paypal-webhook.ts")).toContain(
      "ensureLivePlanBoundForSubscription"
    );
    expect(read("server/tap-webhook.ts")).toContain(
      "ensureLivePlanBoundForSubscription"
    );
    expect(read("server/subscriptionAudit.ts")).toContain(
      "ensureLivePlanBoundForSubscription"
    );
  });

  it("keeps mixedResolutionCount at 0", () => {
    expect(
      commercialRuntimeAuthorityObservability.snapshot().mixedResolutionCount
    ).toBe(0);
  });
});

describe("getCommercialEntitlements live plan resolution", () => {
  installCommercialTestClock();

  beforeEach(() => {
    vi.clearAllMocks();
    commercialRuntimeAuthorityObservability.resetForTests();
  });

  it("bound subscription resolves current live plan capabilities", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 42,
      role: "user",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      commercialTestSubRow({
        id: 99,
        userId: 42,
        restaurantId: 0,
        planId: 30001,
        status: "active",
        currentPeriodEnd: isoPlusDaysFromCommercialTestNow(30),
      }),
    ]);
    (getSubscriptionCommercialBinding as ReturnType<typeof vi.fn>).mockResolvedValue({
      subscriptionId: 99,
      planId: "plan-pro",
      chargedAmount: "26.40",
      chargedCurrency: "USD",
      billingCycleId: "bc",
      billingCycleCode: "monthly",
      legacyPlanId: 30002,
      createdAt: FIXED_NOW.toISOString(),
    });
    (resolveLivePlanCapabilities as ReturnType<typeof vi.fn>).mockResolvedValue({
      source: "live_plan",
      planId: "plan-pro",
      catalogPlanCode: "professional",
      featureKeys: ["ordering", "reports", "qrMenu", "search"],
      limits: [
        { limitKey: "restaurants", value: 5, unit: "count" },
        { limitKey: "items", value: 500, unit: "count" },
        { limitKey: "categories", value: 50, unit: "count" },
      ],
      chargedTerms: {
        planId: "plan-pro",
        catalogPlanCode: "professional",
        commercialName: "Professional",
        chargedAmount: "26.40",
        chargedCurrency: "USD",
        billingCycleId: "bc",
        billingCycleCode: "monthly",
        intervalCount: 1,
        intervalUnit: "month",
        periodStart: null,
        periodEnd: null,
      },
    });

    const result = await getCommercialEntitlements(42, FIXED_NOW);

    expect(result.entitlements.plan).toBe("PROFESSIONAL");
    expect(result.entitlements.limits.restaurants).toBe(5);
    expect(
      (result as { meta?: { commercialResolutionSource?: string } }).meta
        ?.commercialResolutionSource
    ).toBe("live_plan");
    expect(
      commercialRuntimeAuthorityObservability.snapshot().mixedResolutionCount
    ).toBe(0);
  });

  it("bound + missing live plan fails closed", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 43,
      role: "user",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      commercialTestSubRow({
        id: 100,
        userId: 43,
        restaurantId: 0,
        planId: 30002,
        status: "active",
      }),
    ]);
    (getSubscriptionCommercialBinding as ReturnType<typeof vi.fn>).mockResolvedValue({
      subscriptionId: 100,
      planId: "missing-plan",
      chargedAmount: null,
      chargedCurrency: null,
      billingCycleId: null,
      billingCycleCode: null,
      legacyPlanId: 30002,
      createdAt: FIXED_NOW.toISOString(),
    });
    (resolveLivePlanCapabilities as ReturnType<typeof vi.fn>).mockResolvedValue({
      source: "missing",
      planId: "missing-plan",
      catalogPlanCode: null,
      featureKeys: [],
      limits: [],
      chargedTerms: null,
    });

    const result = await getCommercialEntitlements(43, FIXED_NOW);

    expect(result.entitlements.plan).toBe("NONE");
    expect(
      (result as { meta?: { commercialResolutionSource?: string } }).meta
        ?.commercialResolutionSource
    ).toBe("live_plan_fail_closed");
  });
});
