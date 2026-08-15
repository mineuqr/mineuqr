/**
 * COMMERCIAL-ADMIN-REACTIVATION-IMPLEMENTATION-1
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TRPCError } from "@trpc/server";

const { emitAuditEvent } = vi.hoisted(() => ({
  emitAuditEvent: vi.fn(),
}));

vi.mock("../../audit/auditEmitter", () => ({
  emitAuditEvent,
}));

vi.mock("../../db/cascadeDeletes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../db/cascadeDeletes")>();
  return {
    ...actual,
    assertProtectedUserSubscriptionModifiable: vi.fn(async () => undefined),
  };
});

vi.mock("../ownerAccountSubscriptionAuthority", () => ({
  getOwnerAccountSubscriptionRow: vi.fn(),
}));

vi.mock("../adminChargedTermsCompletion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../adminChargedTermsCompletion")>();
  return {
    ...actual,
    resolveChargedTermsForAdminCreate: vi.fn(async (input: { planId: string; billingCycleCode: string }) => ({
      planId: input.planId,
      catalogPlanCode: "professional",
      commercialName: "Professional",
      chargedAmount: input.billingCycleCode === "yearly" ? "349.00" : "29.00",
      chargedCurrency: "USD",
      billingCycleId: input.billingCycleCode === "yearly" ? "cycle-yearly" : "cycle-monthly",
      billingCycleCode: input.billingCycleCode,
      intervalCount: 1,
      intervalUnit: input.billingCycleCode === "yearly" ? "year" : "month",
    })),
  };
});

vi.mock("../chargedTermsSnapshots", () => ({
  applyAdminPaidReactivation: vi.fn(),
  chargedTermsSnapshotMatchesOffer: vi.fn(
    (
      snapshot: { planId: string; chargedAmount: string; chargedCurrency: string; billingCycleCode: string },
      offer: { planId: string; chargedAmount: string; chargedCurrency: string; billingCycleCode: string }
    ) =>
      snapshot.planId === offer.planId &&
      snapshot.chargedAmount === offer.chargedAmount &&
      snapshot.chargedCurrency === offer.chargedCurrency &&
      snapshot.billingCycleCode === offer.billingCycleCode
  ),
  loadCurrentChargedTermsSnapshot: vi.fn(),
}));

vi.mock("../concessions", () => ({
  applyAdminFreeReactivation: vi.fn(),
  loadCurrentCommercialConcession: vi.fn(),
  rethrowConcessionAsTrpc: (error: unknown) => {
    throw error;
  },
}));

vi.mock("../../services/commercial-catalog", () => ({
  resolveLivePlanById: vi.fn(async (id: string) => id),
}));

import { getOwnerAccountSubscriptionRow } from "../ownerAccountSubscriptionAuthority";
import { resolveChargedTermsForAdminCreate } from "../adminChargedTermsCompletion";
import {
  applyAdminPaidReactivation,
  loadCurrentChargedTermsSnapshot,
} from "../chargedTermsSnapshots";
import {
  applyAdminFreeReactivation,
  loadCurrentCommercialConcession,
} from "../concessions";
import {
  applyAdminUserSubscriptionReactivate,
  assertUpdateDoesNotImplicitlyReactivate,
} from "../adminReactivation";
import { OPS_EVENT } from "../../_core/opsTaxonomy";

const PLAN = "0ade795a-02fa-4d3e-b9b5-262515bade09";
const SUB_ID = 870001;

const ctx = {
  user: { id: 99, role: "admin" },
  correlationId: "corr-reactivate-1",
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: SUB_ID,
    userId: 5,
    restaurantId: 0,
    planId: PLAN,
    status: "canceled",
    billingCycle: "monthly",
    currentPeriodStart: "2026-07-01T00:00:00.000Z",
    currentPeriodEnd: "2026-08-01T00:00:00.000Z",
    trialEndsAt: null,
    ...overrides,
  };
}

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("Admin Reactivation Model B", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getOwnerAccountSubscriptionRow as ReturnType<typeof vi.fn>).mockResolvedValue(row());
    (loadCurrentChargedTermsSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (loadCurrentCommercialConcession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (applyAdminPaidReactivation as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "snap-n1",
      subscriptionId: SUB_ID,
      planId: PLAN,
      chargedAmount: "29.00",
      chargedCurrency: "USD",
      billingCycleId: "cycle-monthly",
      billingCycleCode: "monthly",
      effectiveFrom: "2026-08-16T00:00:00.000Z",
      version: 1,
      source: "admin_reactivate",
      actorId: 99,
    });
    (applyAdminFreeReactivation as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "con-n1",
      startsAt: "2026-08-16T00:00:00.000Z",
      endsAt: "2026-09-16T00:00:00.000Z",
    });
  });

  it("paid canceled creates Snapshot N+1 from current Live Plan offer", async () => {
    const result = await applyAdminUserSubscriptionReactivate({
      ctx: ctx as never,
      userId: 5,
      planId: PLAN,
      billingCycle: "monthly",
      reason: "winback",
      mode: "paid",
    });
    expect(result.changed).toBe(true);
    expect(result.snapshotId).toBe("snap-n1");
    expect(applyAdminPaidReactivation).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: SUB_ID,
        offer: expect.objectContaining({
          chargedAmount: "29.00",
          billingCycleCode: "monthly",
        }),
        subscriptionUpdate: expect.objectContaining({ status: "active", planId: PLAN }),
      })
    );
    expect(applyAdminFreeReactivation).not.toHaveBeenCalled();
    expect(emitAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: OPS_EVENT.commercial_subscription_reactivated,
        metadata: expect.objectContaining({
          mode: "paid",
          newSnapshotId: "snap-n1",
          reason: "winback",
        }),
      })
    );
  });

  it("same historical price still inserts a new snapshot", async () => {
    (loadCurrentChargedTermsSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "snap-old",
      planId: PLAN,
      chargedAmount: "29.00",
      chargedCurrency: "USD",
      billingCycleCode: "monthly",
      version: 1,
    });
    await applyAdminUserSubscriptionReactivate({
      ctx: ctx as never,
      userId: 5,
      planId: PLAN,
      billingCycle: "monthly",
      reason: "same-price",
      mode: "paid",
    });
    expect(applyAdminPaidReactivation).toHaveBeenCalled();
  });

  it("changed catalog price uses current Live Plan offer", async () => {
    (loadCurrentChargedTermsSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "snap-old",
      planId: PLAN,
      chargedAmount: "29.00",
      chargedCurrency: "USD",
      billingCycleCode: "monthly",
      version: 1,
    });
    (resolveChargedTermsForAdminCreate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      planId: PLAN,
      catalogPlanCode: "professional",
      commercialName: "Professional",
      chargedAmount: "39.00",
      chargedCurrency: "USD",
      billingCycleId: "cycle-monthly",
      billingCycleCode: "monthly",
      intervalCount: 1,
      intervalUnit: "month",
    });
    await applyAdminUserSubscriptionReactivate({
      ctx: ctx as never,
      userId: 5,
      planId: PLAN,
      billingCycle: "monthly",
      reason: "price-up",
      mode: "paid",
    });
    expect(applyAdminPaidReactivation).toHaveBeenCalledWith(
      expect.objectContaining({
        offer: expect.objectContaining({ chargedAmount: "39.00" }),
      })
    );
  });

  it("yearly uses the yearly Live Plan offer", async () => {
    await applyAdminUserSubscriptionReactivate({
      ctx: ctx as never,
      userId: 5,
      planId: PLAN,
      billingCycle: "yearly",
      reason: "annual",
      mode: "paid",
    });
    expect(resolveChargedTermsForAdminCreate).toHaveBeenCalledWith({
      planId: PLAN,
      billingCycleCode: "yearly",
    });
    expect(applyAdminPaidReactivation).toHaveBeenCalledWith(
      expect.objectContaining({
        offer: expect.objectContaining({
          chargedAmount: "349.00",
          billingCycleCode: "yearly",
        }),
      })
    );
  });

  it("expired paid reactivates the same row", async () => {
    (getOwnerAccountSubscriptionRow as ReturnType<typeof vi.fn>).mockResolvedValue(
      row({ status: "expired" })
    );
    const result = await applyAdminUserSubscriptionReactivate({
      ctx: ctx as never,
      userId: 5,
      planId: PLAN,
      billingCycle: "monthly",
      reason: "expired-return",
      mode: "paid",
    });
    expect(result.subscriptionId).toBe(SUB_ID);
    expect(applyAdminPaidReactivation).toHaveBeenCalled();
  });

  it("rejects a past Admin period end", async () => {
    await expect(
      applyAdminUserSubscriptionReactivate({
        ctx: ctx as never,
        userId: 5,
        planId: PLAN,
        billingCycle: "monthly",
        reason: "past",
        mode: "paid",
        subscriptionEndDate: "2020-01-01T00:00:00.000Z",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "period_not_future" });
    expect(applyAdminPaidReactivation).not.toHaveBeenCalled();
  });

  it("missing offer fails closed", async () => {
    const { AdminChargedTermsCompletionError } = await import("../adminChargedTermsCompletion");
    (resolveChargedTermsForAdminCreate as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new AdminChargedTermsCompletionError("missing_amount")
    );
    await expect(
      applyAdminUserSubscriptionReactivate({
        ctx: ctx as never,
        userId: 5,
        planId: PLAN,
        billingCycle: "monthly",
        reason: "no-offer",
        mode: "paid",
      })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(applyAdminPaidReactivation).not.toHaveBeenCalled();
  });

  it("does not read Binding leftover as price", () => {
    const src = read("server/commercial/adminReactivation.ts");
    expect(src).toContain("resolveChargedTermsForAdminCreate");
    expect(src).not.toContain("chargedAmount: binding");
    expect(src).not.toContain("subscription_plans");
    expect(src).not.toContain("legacyPlanId");
    expect(src).not.toContain("requireFeature");
  });

  it("free canceled creates a concession and no snapshot", async () => {
    const result = await applyAdminUserSubscriptionReactivate({
      ctx: ctx as never,
      userId: 5,
      planId: PLAN,
      billingCycle: "monthly",
      reason: "courtesy",
      mode: "free",
      freePeriod: { unit: "month", duration: 1 },
    });
    expect(result.mode).toBe("free");
    expect(result.snapshotId).toBeNull();
    expect(result.concessionId).toBe("con-n1");
    expect(applyAdminPaidReactivation).not.toHaveBeenCalled();
    expect(applyAdminFreeReactivation).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: SUB_ID,
        unit: "month",
        duration: 1,
        reason: "courtesy",
      })
    );
    expect(emitAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: OPS_EVENT.commercial_subscription_reactivated,
        metadata: expect.objectContaining({ mode: "free", newSnapshotId: null }),
      })
    );
  });

  it("free concession persist failure does not claim success", async () => {
    (applyAdminFreeReactivation as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("persist_failed")
    );
    await expect(
      applyAdminUserSubscriptionReactivate({
        ctx: ctx as never,
        userId: 5,
        planId: PLAN,
        billingCycle: "monthly",
        reason: "fail",
        mode: "free",
        freePeriod: { unit: "day", duration: 7 },
      })
    ).rejects.toBeTruthy();
  });

  it("duplicate paid while already entitled is idempotent", async () => {
    (getOwnerAccountSubscriptionRow as ReturnType<typeof vi.fn>).mockResolvedValue(
      row({
        status: "active",
        currentPeriodEnd: "2027-01-01T00:00:00.000Z",
      })
    );
    (loadCurrentChargedTermsSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "snap-current",
      planId: PLAN,
      chargedAmount: "29.00",
      chargedCurrency: "USD",
      billingCycleCode: "monthly",
    });
    const result = await applyAdminUserSubscriptionReactivate({
      ctx: ctx as never,
      userId: 5,
      planId: PLAN,
      billingCycle: "monthly",
      reason: "dup",
      mode: "paid",
    });
    expect(result.changed).toBe(false);
    expect(result.snapshotId).toBe("snap-current");
    expect(applyAdminPaidReactivation).not.toHaveBeenCalled();
  });

  it("generic update rejects canceled to active and period-ended revival", () => {
    expect(() =>
      assertUpdateDoesNotImplicitlyReactivate(
        { status: "canceled", trialEndsAt: null, currentPeriodEnd: "2027-01-01T00:00:00.000Z" },
        { status: "active", trialEndsAt: null, currentPeriodEnd: "2027-01-01T00:00:00.000Z" }
      )
    ).toThrow(TRPCError);
    expect(() =>
      assertUpdateDoesNotImplicitlyReactivate(
        { status: "expired", trialEndsAt: null, currentPeriodEnd: "2026-01-01T00:00:00.000Z" },
        { status: "active", trialEndsAt: null, currentPeriodEnd: "2027-01-01T00:00:00.000Z" }
      )
    ).toThrow(TRPCError);
    expect(() =>
      assertUpdateDoesNotImplicitlyReactivate(
        { status: "active", trialEndsAt: null, currentPeriodEnd: "2020-01-01T00:00:00.000Z" },
        { status: "active", trialEndsAt: null, currentPeriodEnd: "2027-01-01T00:00:00.000Z" }
      )
    ).toThrow(TRPCError);
    expect(() =>
      assertUpdateDoesNotImplicitlyReactivate(
        { status: "active", trialEndsAt: null, currentPeriodEnd: "2027-01-01T00:00:00.000Z" },
        { status: "canceled", trialEndsAt: null, currentPeriodEnd: "2027-01-01T00:00:00.000Z" }
      )
    ).not.toThrow();
  });

  it("router is Admin-gated and create/update close Model C / implicit revive", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain('assertAdminAccess(ctx, "admin.reactivateUserSubscriptionByAdmin")');
    const slice = routers.slice(
      routers.indexOf("reactivateUserSubscriptionByAdmin: protectedProcedure"),
      routers.indexOf("sendCustomNotification: protectedProcedure")
    );
    expect(slice).not.toContain("requireFeature");
    const audit = read("server/subscriptionAudit.ts");
    expect(audit).toContain("assertUpdateDoesNotImplicitlyReactivate");
    expect(audit).toContain("getOwnerAccountSubscriptionRow(userId)");
    expect(audit).not.toContain("ownerHasEntitledAccountSubscription");
    const snaps = read("server/commercial/chargedTermsSnapshots.ts");
    expect(snaps).toContain('"admin_reactivate"');
    expect(snaps).toContain("applyAdminPaidReactivation");
    expect(snaps).toContain('source: "admin_reactivate"');
    const paidFn = snaps.slice(snaps.indexOf("export async function applyAdminPaidReactivation"));
    expect(paidFn).not.toContain("chargedTermsSnapshotMatchesOffer");
  });
});
