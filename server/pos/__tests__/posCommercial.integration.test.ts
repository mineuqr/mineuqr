/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1 — commercial limit integration.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POS_TERMINALS_LIMIT_KEY } from "@shared/commercial-catalog/contracts";

vi.mock("../../subscription-runtime/subscriptionRuntimeService", () => ({
  resolveOwnerEntitlements: vi.fn(),
}));

import { resolveOwnerEntitlements } from "../../subscription-runtime/subscriptionRuntimeService";
import { checkLimit } from "../../subscription-runtime/enforcement";

const NOW = new Date("2026-08-16T00:00:00.000Z");

function entitlements(limits: {
  posTerminals?: number | null;
  isAdmin?: boolean;
  plan?: string;
}) {
  return {
    context: { ownerId: 1, role: "user", subscription: null, now: NOW },
    entitlements: {
      accountType: limits.isAdmin ? "ADMIN" : "PAYING",
      plan: limits.plan ?? "PROFESSIONAL",
      status: "active",
      limits: {
        restaurants: 1,
        categories: 10,
        items: 100,
        ...(limits.posTerminals !== undefined
          ? { posTerminals: limits.posTerminals }
          : {}),
      },
      features: {},
      commercial: {
        isTrial: false,
        isPaid: true,
        isEnterprise: false,
        isAdmin: limits.isAdmin === true,
        countsInMrr: false,
        countsInRevenue: false,
        invoiceEligible: false,
      },
    },
    meta: { commercialResolutionSource: "live_plan" },
  };
}

describe("POS commercial limit integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies a second terminal when Live Plan quantity is 1", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlements({ posTerminals: 1 }) as never
    );
    const first = await checkLimit({
      ownerId: 1,
      limitKey: POS_TERMINALS_LIMIT_KEY,
      proposedTotal: 1,
      now: NOW,
    });
    const second = await checkLimit({
      ownerId: 1,
      limitKey: POS_TERMINALS_LIMIT_KEY,
      proposedTotal: 2,
      now: NOW,
    });
    expect(first.allowed).toBe(true);
    expect(first.cap).toBe(1);
    expect(second.allowed).toBe(false);
    expect(second.reasonCode).toBe("limit_exceeded");
  });

  it("fail-closes missing posTerminals instead of using devices", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlements({}) as never
    );
    const missing = await checkLimit({
      ownerId: 1,
      limitKey: POS_TERMINALS_LIMIT_KEY,
      proposedTotal: 1,
      now: NOW,
    });
    expect(missing.allowed).toBe(false);
    expect(missing.cap).toBe(0);
    const devices = await checkLimit({
      ownerId: 1,
      limitKey: "devices" as never,
      proposedTotal: 1,
      now: NOW,
    });
    expect(devices.reasonCode).toBe("limit_key_unsupported");
  });

  it("keeps ADMIN unlimited unless posTerminals is explicit", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlements({ isAdmin: true, plan: "ADMIN" }) as never
    );
    const unlimited = await checkLimit({
      ownerId: 1,
      limitKey: POS_TERMINALS_LIMIT_KEY,
      proposedTotal: 99,
      now: NOW,
    });
    expect(unlimited.policy).toBe("unlimited");
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlements({ isAdmin: true, plan: "ADMIN", posTerminals: 1 }) as never
    );
    const capped = await checkLimit({
      ownerId: 1,
      limitKey: POS_TERMINALS_LIMIT_KEY,
      proposedTotal: 2,
      now: NOW,
    });
    expect(capped.allowed).toBe(false);
    expect(capped.cap).toBe(1);
  });
});
