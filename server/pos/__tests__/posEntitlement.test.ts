/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1 — Live Plan quantity + provisioning.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POS_TERMINALS_LIMIT_KEY } from "@shared/commercial-catalog/contracts";
import { validateLivePlanLimitValues } from "@shared/commercial-catalog/contracts";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import {
  PosEntitlementDeniedError,
  PosEntitlementService,
} from "../services/PosEntitlementService";
import { PosTerminalService } from "../services/PosTerminalService";
import { readLimitValue } from "../../subscription-runtime/entitlementResolver";

vi.mock("../../db", () => ({
  getRestaurantById: vi.fn(),
}));
vi.mock("../../subscription-runtime", () => ({
  checkLimit: vi.fn(),
}));

import { getRestaurantById } from "../../db";
import { checkLimit } from "../../subscription-runtime";

function mockLimit(cap: number | null) {
  vi.mocked(checkLimit).mockImplementation(async ({ proposedTotal, limitKey }) => {
    expect(limitKey).toBe(POS_TERMINALS_LIMIT_KEY);
    if (cap === null) {
      return {
        allowed: true,
        reasonCode: "unlimited",
        limitKey,
        cap: null,
        proposedTotal,
        policy: "unlimited",
        source: "test",
      };
    }
    const allowed = proposedTotal <= cap;
    return {
      allowed,
      reasonCode: allowed ? "within_limit" : "limit_exceeded",
      limitKey,
      cap,
      proposedTotal,
      policy: "hard",
      source: "test",
    };
  });
}

describe("POS entitlement and provisioning", () => {
  beforeEach(() => {
    vi.mocked(getRestaurantById).mockResolvedValue({
      id: 1,
      userId: 10,
    } as never);
  });

  it("fail-closes missing POS quantity to zero terminals", async () => {
    mockLimit(0);
    const store = new InMemoryPosTerminalStore();
    const entitlements = new PosEntitlementService(store);
    const resolved = await entitlements.resolve(1);
    expect(resolved.included).toBe(0);
    expect(resolved.provisioningAllowed).toBe(false);
    expect(resolved.source).toBe("missing_fail_closed");
    await expect(entitlements.assertProvisioningAllowed(1)).rejects.toBeInstanceOf(
      PosEntitlementDeniedError
    );
  });

  it("allows N provisioned terminals and denies N+1", async () => {
    mockLimit(1);
    const store = new InMemoryPosTerminalStore();
    const terminals = new PosTerminalService(store, new PosEntitlementService(store));
    const first = await terminals.register({ restaurantId: 1, actorId: 10 });
    expect(first.code).toBe("POS-001");
    await expect(
      terminals.register({ restaurantId: 1, actorId: 10 })
    ).rejects.toBeInstanceOf(PosEntitlementDeniedError);
    const resolved = await new PosEntitlementService(store).resolve(1);
    expect(resolved.included).toBe(1);
    expect(resolved.provisioned).toBe(1);
    expect(resolved.remaining).toBe(0);
  });

  it("does not let a client-supplied quantity bypass checkLimit", async () => {
    mockLimit(0);
    const store = new InMemoryPosTerminalStore();
    const terminals = new PosTerminalService(store, new PosEntitlementService(store));
    await expect(
      terminals.register({ restaurantId: 1, actorId: 10, code: "POS-HACK" })
    ).rejects.toBeInstanceOf(PosEntitlementDeniedError);
    expect(checkLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        limitKey: POS_TERMINALS_LIMIT_KEY,
        proposedTotal: 1,
      })
    );
  });

  it("treats missing posTerminals as 0 and ADMIN as unlimited unless explicit", () => {
    const user = {
      accountType: "USER",
      plan: "BASIC",
      status: "active",
      limits: { restaurants: 1, categories: 5, items: 50 },
      features: {},
      commercial: { isAdmin: false },
    } as never;
    expect(readLimitValue(user, "posTerminals")).toBe(0);
    expect(readLimitValue(user, "devices")).toBeUndefined();

    const admin = {
      ...user,
      plan: "ADMIN",
      commercial: { isAdmin: true },
    } as never;
    expect(readLimitValue(admin, "posTerminals")).toBeNull();

    const explicitAdmin = {
      ...admin,
      limits: { restaurants: 1, categories: 5, items: 50, posTerminals: 2 },
    } as never;
    expect(readLimitValue(explicitAdmin, "posTerminals")).toBe(2);
  });

  it("accepts optional posTerminals without making it a required Live Plan key", () => {
    const without = validateLivePlanLimitValues([
      { limitKey: "restaurants", value: 1 },
      { limitKey: "categories", value: 5 },
      { limitKey: "items", value: 50 },
    ]);
    expect(without.ok).toBe(true);
    expect(without.normalized.map((r) => r.limitKey)).toEqual([
      "restaurants",
      "categories",
      "items",
    ]);
    const withPos = validateLivePlanLimitValues([
      { limitKey: "restaurants", value: 1 },
      { limitKey: "categories", value: 5 },
      { limitKey: "items", value: 50 },
      { limitKey: "posTerminals", value: 1 },
    ]);
    expect(withPos.ok).toBe(true);
    expect(withPos.normalized.map((r) => r.limitKey)).toContain("posTerminals");
  });
});
