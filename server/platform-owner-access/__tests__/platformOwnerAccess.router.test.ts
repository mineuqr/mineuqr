/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1 — API authorization.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV } from "../../_core/env";
import type { TrpcContext } from "../../_core/context";
import {
  clearPlatformOwnerAccessStoreForTests,
  setPlatformOwnerAccessMemoryOnlyForTests,
} from "../store";

const OWNER_OPEN_ID = "router-owner-openid";
const previous = ENV.ownerOpenId;

vi.mock("../livePlanComposition", () => ({
  getCurrentLivePlanCompositionByCode: vi.fn(async (code: string) =>
    code === "professional"
      ? {
          planId: "plan-professional",
          catalogPlanCode: "professional",
          commercialName: "Professional",
          featureKeys: ["qrMenu"],
          limits: [],
        }
      : null
  ),
  listCurrentLivePlansForSimulation: vi.fn(async () => [
    { code: "basic", name: "Basic" },
    { code: "professional", name: "Professional" },
    { code: "enterprise", name: "Enterprise" },
  ]),
}));

vi.mock("../../subscription-runtime/cache", () => ({
  invalidateEntitlementCache: vi.fn(),
}));

vi.mock("../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

import { ownerAccessRouter } from "../router";

function ctx(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    correlationId: "corr-owner-access",
    req: { headers: {} },
    res: {},
  } as TrpcContext;
}

const ownerUser = {
  id: 1,
  openId: OWNER_OPEN_ID,
  role: "admin",
  name: "Owner",
} as NonNullable<TrpcContext["user"]>;

describe("ownerAccess router authorization", () => {
  beforeEach(() => {
    ENV.ownerOpenId = OWNER_OPEN_ID;
    setPlatformOwnerAccessMemoryOnlyForTests(true);
  });

  afterEach(() => {
    ENV.ownerOpenId = previous;
    clearPlatformOwnerAccessStoreForTests();
    setPlatformOwnerAccessMemoryOnlyForTests(false);
  });

  it("rejects unauthenticated callers", async () => {
    const caller = ownerAccessRouter.createCaller(ctx(null));
    await expect(caller.getMode()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.returnToFullPlatform()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects non-owner admin, customer, and staff", async () => {
    const admin = ownerAccessRouter.createCaller(
      ctx({ id: 99, openId: "admin-99", role: "admin" } as never)
    );
    const customer = ownerAccessRouter.createCaller(
      ctx({ id: 5, openId: "customer-5", role: "user" } as never)
    );
    const staff = ownerAccessRouter.createCaller(
      ctx({ id: 6, openId: "waiter-6", role: "user" } as never)
    );
    await expect(admin.setSimulation({ planCode: "professional" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(customer.setMode({ mode: "FULL_PLATFORM" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(staff.returnToFullPlatform()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows the platform owner to set and return from simulation", async () => {
    const caller = ownerAccessRouter.createCaller(ctx(ownerUser));
    const simulated = await caller.setSimulation({ planCode: "professional" });
    expect(simulated.mode).toBe("SIMULATED_PLAN");
    expect(simulated.simulatedPlanCode).toBe("professional");

    const restored = await caller.returnToFullPlatform();
    expect(restored.mode).toBe("FULL_PLATFORM");
    expect(restored.simulatedPlanCode).toBeNull();
  });
});
