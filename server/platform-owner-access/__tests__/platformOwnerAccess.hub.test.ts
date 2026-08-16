/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1 — hub precedence + isolation.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV } from "../../_core/env";
import {
  clearPlatformOwnerAccessStoreForTests,
  setPlatformOwnerAccessMemoryOnlyForTests,
} from "../store";
import { persistOwnerAccessMode } from "../service";

const OWNER_OPEN_ID = "hub-owner-openid";
const previous = ENV.ownerOpenId;

vi.mock("../../db", () => ({
  getUserById: vi.fn(),
  getSubscriptionsByUser: vi.fn(),
  getDb: vi.fn(async () => null),
}));

vi.mock("../../services/commercial-catalog", () => ({
  getSubscriptionCommercialBinding: vi.fn(async () => null),
  resolveLivePlanCapabilities: vi.fn(async () => ({
    source: "missing",
    planId: null,
    catalogPlanCode: null,
    featureKeys: [],
    limits: [],
    chargedTerms: null,
  })),
  isLivePlanUuid: (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    ),
  resolveLivePlanCapabilitiesByPlanId: vi.fn(async () => ({
    source: "missing",
    planId: null,
    catalogPlanCode: null,
    featureKeys: [],
    limits: [],
    chargedTerms: null,
  })),
  ensureCatalogReady: vi.fn(async () => undefined),
}));

vi.mock("../../commercial/buildCommercialContextFromDb", () => ({
  buildCommercialContextFromDb: vi.fn(async (ownerId: number, now: Date) => ({
    ownerId,
    role: "user",
    subscription: {
      catalogPlan: "PROFESSIONAL",
      subscriptionStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-12-01T00:00:00.000Z",
    },
    now,
  })),
}));

vi.mock("../livePlanComposition", () => ({
  getCurrentLivePlanCompositionByCode: vi.fn(async (code: string) => {
    if (code !== "professional" && code !== "basic" && code !== "enterprise") {
      return null;
    }
    return {
      planId: `plan-${code}`,
      catalogPlanCode: code,
      commercialName: code,
      featureKeys:
        code === "basic"
          ? ["qrMenu", "search"]
          : ["qrMenu", "search", "ordering", "reports"],
      limits: [
        { limitKey: "restaurants", value: code === "basic" ? 1 : 5 },
        { limitKey: "categories", value: 10 },
        { limitKey: "items", value: 100 },
      ],
    };
  }),
  listCurrentLivePlansForSimulation: vi.fn(async () => [
    { code: "basic", name: "Basic" },
    { code: "professional", name: "Professional" },
    { code: "enterprise", name: "Enterprise" },
  ]),
}));

vi.mock("../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

import { getSubscriptionsByUser, getUserById } from "../../db";
import { resolveOwnerEntitlements } from "../../subscription-runtime/subscriptionRuntimeService";
import { commercialTestSubRow } from "../../commercial/__tests__/commercialTestFixtures";

const NOW = new Date("2026-08-15T12:00:00.000Z");

describe("resolveOwnerEntitlements platform owner precedence", () => {
  beforeEach(() => {
    ENV.ownerOpenId = OWNER_OPEN_ID;
    setPlatformOwnerAccessMemoryOnlyForTests(true);
    vi.mocked(getUserById).mockReset();
    vi.mocked(getSubscriptionsByUser).mockReset();
  });

  afterEach(() => {
    ENV.ownerOpenId = previous;
    clearPlatformOwnerAccessStoreForTests();
    setPlatformOwnerAccessMemoryOnlyForTests(false);
  });

  it("gives FULL_PLATFORM despite expired subscription 600001", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      id: 1,
      openId: OWNER_OPEN_ID,
      role: "admin",
    } as never);
    vi.mocked(getSubscriptionsByUser).mockResolvedValue([
      commercialTestSubRow({
        id: 600001,
        userId: 1,
        restaurantId: 0,
        planId: 30002,
        status: "active",
        currentPeriodEnd: "2026-08-07T21:00:00.000Z",
      }),
    ] as never);

    const result = await resolveOwnerEntitlements(1, { now: NOW, bypassCache: true });
    expect(result.meta?.commercialResolutionSource).toBe(
      "platform_owner_full_platform"
    );
    expect(result.entitlements.plan).toBe("ADMIN");
    expect(result.meta?.commercialAccountState).toBe("ACTIVE");
    expect(result.meta?.commercialAccountStateReason).toBe("platform_owner_exempt");
    expect(getSubscriptionsByUser).not.toHaveBeenCalled();
  });

  it("switches Professional → Basic immediately", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      id: 1,
      openId: OWNER_OPEN_ID,
      role: "admin",
    } as never);

    await persistOwnerAccessMode({
      ownerOpenId: OWNER_OPEN_ID,
      ownerUserId: 1,
      mode: "SIMULATED_PLAN",
      simulatedPlanCode: "professional",
      previous: {
        ok: true,
        persisted: false,
        mode: "FULL_PLATFORM",
        simulatedPlanCode: null,
      },
    });
    const pro = await resolveOwnerEntitlements(1, { now: NOW, bypassCache: true });
    expect(pro.entitlements.plan).toBe("PROFESSIONAL");

    await persistOwnerAccessMode({
      ownerOpenId: OWNER_OPEN_ID,
      ownerUserId: 1,
      mode: "SIMULATED_PLAN",
      simulatedPlanCode: "basic",
      previous: {
        ok: true,
        persisted: true,
        mode: "SIMULATED_PLAN",
        simulatedPlanCode: "professional",
      },
    });
    const basic = await resolveOwnerEntitlements(1, { now: NOW, bypassCache: true });
    expect(basic.entitlements.plan).toBe("BASIC");
    expect(basic.entitlements.features.ordering).toBe(false);
    expect(basic.meta?.commercialAccountState).toBe("ACTIVE");
    expect(basic.meta?.commercialAccountStateReason).toBe("platform_owner_exempt");
  });

  it("does not change customer Professional resolution", async () => {
    vi.mocked(getUserById).mockImplementation(async (id: number) => {
      if (id === 1) {
        return { id: 1, openId: OWNER_OPEN_ID, role: "admin" } as never;
      }
      return { id: 9, openId: "customer-9", role: "user" } as never;
    });
    vi.mocked(getSubscriptionsByUser).mockResolvedValue([
      commercialTestSubRow({
        id: 88,
        userId: 9,
        restaurantId: 0,
        planId: 30002,
        status: "active",
        currentPeriodEnd: "2026-12-01T00:00:00.000Z",
      }),
    ] as never);

    await persistOwnerAccessMode({
      ownerOpenId: OWNER_OPEN_ID,
      ownerUserId: 1,
      mode: "SIMULATED_PLAN",
      simulatedPlanCode: "basic",
      previous: {
        ok: true,
        persisted: false,
        mode: "FULL_PLATFORM",
        simulatedPlanCode: null,
      },
    });

    const owner = await resolveOwnerEntitlements(1, { now: NOW, bypassCache: true });
    expect(owner.meta?.commercialResolutionSource).toBe(
      "platform_owner_simulated_plan"
    );
    expect(owner.entitlements.plan).toBe("BASIC");

    const customer = await resolveOwnerEntitlements(9, { now: NOW, bypassCache: true });
    expect(customer.meta?.commercialResolutionSource).not.toMatch(/platform_owner/);
  });
});
