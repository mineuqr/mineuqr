import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computeMrrFromChargedTerms } from "../metrics/chargedTermsMrr";

const store: Record<string, unknown>[] = [];
let periodEnd = "2026-01-01T00:00:00.000Z";

function sortedStore() {
  return [...store].sort((a, b) => Number(b.version) - Number(a.version));
}

function makeDb() {
  const select = () => {
    const builder: {
      from: () => typeof builder;
      where: () => typeof builder;
      orderBy: () => typeof builder;
      limit: (n: number) => Promise<unknown[]>;
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise<unknown>;
    } = {
      from: () => builder,
      where: () => builder,
      orderBy: () => builder,
      limit: async (n: number) => {
        const rows = sortedStore();
        if (rows.length && !("version" in rows[0])) {
          return [{ currentPeriodEnd: periodEnd }].slice(0, n);
        }
        return rows.slice(0, n);
      },
      then: (resolve, reject) => Promise.resolve(sortedStore()).then(resolve, reject),
    };
    return builder;
  };
  return {
    transaction: async (fn: (tx: ReturnType<typeof makeDb>) => Promise<unknown>) => fn(makeDb()),
    select,
    insert: () => ({
      values: async (row: Record<string, unknown>) => {
        store.push({ ...row });
      },
    }),
    update: () => ({
      set: (patch: Record<string, unknown>) => ({
        where: async () => {
          if (patch.currentPeriodEnd) {
            periodEnd = String(patch.currentPeriodEnd);
            return;
          }
          const current = store.find((row) => row.status === "active");
          if (current) Object.assign(current, patch);
        },
      }),
    }),
  };
}

vi.mock("../../db", () => ({
  getDb: vi.fn(async () => makeDb()),
}));

vi.mock("../../audit/auditEmitter", () => ({
  emitAuditEvent: vi.fn(),
}));

vi.mock("../../services/commercial-catalog/CatalogStore", () => ({
  newCommercialId: () => `con-${store.length + 1}`,
  nowIso: () => new Date().toISOString(),
}));

import { emitAuditEvent } from "../../audit/auditEmitter";
import {
  cancelCommercialConcession,
  CommercialConcessionError,
  grantCommercialConcession,
  loadCurrentCommercialConcession,
  persistAdminFreeFirstConcession,
  reviseCommercialConcession,
} from "../concessions";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

const PLAN = "0ade795a-02fa-4d3e-b9b5-262515bade09";

describe("commercial concessions", () => {
  beforeEach(() => {
    store.length = 0;
    periodEnd = "2026-01-01T00:00:00.000Z";
    vi.clearAllMocks();
  });

  it("grants an immediate free-first concession without a snapshot writer", async () => {
    const row = await persistAdminFreeFirstConcession({
      subscriptionId: 10,
      planId: PLAN,
      billingCycleCode: "monthly",
      unit: "month",
      duration: 2,
      reason: "promo",
      actorId: 1,
    });
    expect(row.status).toBe("active");
    expect(row.version).toBe(1);
    expect(row.unit).toBe("month");
    expect(row.duration).toBe(2);
    expect(new Date(row.startsAt).getTime()).toBeLessThanOrEqual(Date.now());
    expect(emitAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "commercial_concession_granted",
        targetId: 10,
      })
    );
  });

  it("rejects zero, negative, and invalid units", async () => {
    await expect(
      grantCommercialConcession({
        subscriptionId: 10,
        planId: PLAN,
        billingCycleCode: "monthly",
        unit: "day",
        duration: 0,
        reason: "x",
      })
    ).rejects.toMatchObject({ code: "zero_duration" });
    await expect(
      grantCommercialConcession({
        subscriptionId: 10,
        planId: PLAN,
        billingCycleCode: "monthly",
        unit: "day",
        duration: -3,
        reason: "x",
      })
    ).rejects.toMatchObject({ code: "negative_duration" });
    await expect(
      grantCommercialConcession({
        subscriptionId: 10,
        planId: PLAN,
        billingCycleCode: "monthly",
        unit: "week",
        duration: 2,
        reason: "x",
      })
    ).rejects.toBeInstanceOf(CommercialConcessionError);
  });

  it("is idempotent for a repeated identical grant", async () => {
    const first = await grantCommercialConcession({
      subscriptionId: 10,
      planId: PLAN,
      billingCycleCode: "monthly",
      unit: "day",
      duration: 7,
      reason: "a",
    });
    const second = await grantCommercialConcession({
      subscriptionId: 10,
      planId: PLAN,
      billingCycleCode: "monthly",
      unit: "day",
      duration: 7,
      reason: "a",
    });
    expect(second.id).toBe(first.id);
    expect(store.filter((row) => row.status === "active")).toHaveLength(1);
  });

  it("rejects a second overlapping grant", async () => {
    await grantCommercialConcession({
      subscriptionId: 10,
      planId: PLAN,
      billingCycleCode: "monthly",
      unit: "day",
      duration: 7,
      reason: "a",
    });
    await expect(
      grantCommercialConcession({
        subscriptionId: 10,
        planId: PLAN,
        billingCycleCode: "monthly",
        unit: "day",
        duration: 14,
        reason: "b",
      })
    ).rejects.toMatchObject({ code: "overlap" });
  });

  it("revises by inserting a new version and superseding the previous", async () => {
    const first = await grantCommercialConcession({
      subscriptionId: 10,
      planId: PLAN,
      billingCycleCode: "monthly",
      unit: "day",
      duration: 30,
      reason: "start",
    });
    const revised = await reviseCommercialConcession({
      subscriptionId: 10,
      unit: "day",
      duration: 60,
      reason: "extend",
    });
    expect(revised.version).toBe(2);
    expect(revised.duration).toBe(60);
    expect(store.find((row) => row.id === first.id)?.status).toBe("superseded");
    expect(store.find((row) => row.id === first.id)?.duration).toBe(30);
    const current = await loadCurrentCommercialConcession(10);
    expect(current?.id).toBe(revised.id);
  });

  it("shortens with a new version and keeps history immutable", async () => {
    await grantCommercialConcession({
      subscriptionId: 10,
      planId: PLAN,
      billingCycleCode: "monthly",
      unit: "day",
      duration: 60,
      reason: "start",
    });
    const shortened = await reviseCommercialConcession({
      subscriptionId: 10,
      unit: "day",
      duration: 30,
      reason: "shorten",
    });
    expect(shortened.duration).toBe(30);
    expect(store.filter((row) => row.duration === 60)[0]?.status).toBe("superseded");
  });

  it("cancels without deleting historical facts", async () => {
    const granted = await grantCommercialConcession({
      subscriptionId: 10,
      planId: PLAN,
      billingCycleCode: "monthly",
      unit: "month",
      duration: 2,
      reason: "start",
    });
    const cancelled = await cancelCommercialConcession({
      subscriptionId: 10,
      reason: "stop",
    });
    expect(cancelled?.status).toBe("cancelled");
    expect(cancelled?.id).toBe(granted.id);
    expect(store).toHaveLength(1);
    expect(await loadCurrentCommercialConcession(10)).toBeNull();
  });

  it("treats a concession as inactive after endsAt", async () => {
    store.push({
      id: "old",
      subscriptionId: 10,
      planId: PLAN,
      billingCycleCode: "monthly",
      unit: "day",
      duration: 1,
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2026-01-02T00:00:00.000Z",
      status: "active",
      version: 1,
      source: "admin_grant",
      actorId: 1,
      reason: "past",
      supersededBy: null,
      cancelledAt: null,
    });
    expect(
      await loadCurrentCommercialConcession(10, new Date("2026-01-02T00:00:00.000Z"))
    ).toBeNull();
  });

  it("suppresses MRR while a concession is current even if a snapshot exists", () => {
    const states = [
      {
        subscriptionId: 10,
        billingCycle: "monthly" as const,
        commercialStatus: { countsInMrr: true },
      },
    ];
    const terms = new Map([
      [
        10,
        {
          subscriptionId: 10,
          chargedAmount: "29.00",
          chargedCurrency: "USD",
          billingCycleCode: "monthly",
        },
      ],
    ]);
    expect(computeMrrFromChargedTerms(states, terms)).toBe(29);
    expect(computeMrrFromChargedTerms(states, terms, new Set([10]))).toBe(0);
    expect(Math.round(0 * 12 * 100) / 100).toBe(0);
  });

  it("resumes snapshot MRR when concession is not suppressed", () => {
    const mrr = computeMrrFromChargedTerms(
      [
        {
          subscriptionId: 10,
          billingCycle: "monthly",
          commercialStatus: { countsInMrr: true },
        },
      ],
      new Map([
        [
          10,
          {
            subscriptionId: 10,
            chargedAmount: "29.00",
            chargedCurrency: "USD",
            billingCycleCode: "monthly",
          },
        ],
      ]),
      new Set()
    );
    expect(mrr).toBe(29);
    expect(Math.round(mrr * 12 * 100) / 100).toBe(348);
  });

  it("architecture guards: no $0 snapshots, no trial conversion, no legacy price", () => {
    const concessions = read("server/commercial/concessions.ts");
    const create = read("server/subscriptionAudit.ts");
    const snapshots = read("server/commercial/chargedTermsSnapshots.ts");
    const mrr = read("server/commercial/metrics/chargedTermsMrr.ts");
    const sql = read("drizzle/0090_commercial_subscription_concessions.sql");
    const bind = read("server/services/commercial-catalog/adoptionService.ts");

    expect(concessions).not.toContain("chargedAmount");
    expect(concessions).not.toContain("getSubscriptionPlanById");
    expect(concessions).not.toContain("legacyPlanId");
    expect(concessions).not.toContain("currentPriceForPlan");
    expect(concessions).not.toContain('status: "trial"');

    expect(create).toContain("persistAdminFreeFirstConcession");
    expect(create).toContain("persistAdminCreateChargedTerms");
    expect(create).toContain("trial_conflict");

    expect(snapshots).not.toContain('chargedAmount: "0"');
    expect(mrr).toContain("loadSubscriptionIdsWithCurrentConcession");
    expect(mrr).not.toContain("commercialSubscriptionBindings");
    expect(mrr).not.toContain("currentPriceForPlan");

    expect(sql).toContain("CREATE TABLE `commercial_subscription_concessions`");
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(bind).toContain("loadCurrentCommercialConcession");
    expect(bind).toContain("!activeConcession");
  });

  it("paid create path still calls Charged Terms persist when freePeriod is absent", () => {
    const create = read("server/subscriptionAudit.ts");
    const persistFree = create.indexOf("persistAdminFreeFirstConcession");
    const persistPaid = create.lastIndexOf("persistAdminCreateChargedTerms");
    expect(persistFree).toBeGreaterThan(-1);
    expect(persistPaid).toBeGreaterThan(persistFree);
    expect(create).toContain("} else {");
  });

  it("expired concession with no snapshot contributes 0 MRR and ARR", () => {
    const mrr = computeMrrFromChargedTerms(
      [
        {
          subscriptionId: 10,
          billingCycle: "monthly",
          commercialStatus: { countsInMrr: true },
        },
      ],
      new Map(),
      new Set()
    );
    expect(mrr).toBe(0);
    expect(Math.round(mrr * 12 * 100) / 100).toBe(0);
  });

  it("plan or cycle change during a current concession updates identity only", () => {
    const update = read("server/subscriptionAudit.ts");
    const start = update.indexOf("if (commercialPlanChanged || commercialCycleChanged)");
    const block = update.slice(start);
    const concessionBranch = block.slice(
      block.indexOf("if (currentConcession)"),
      block.indexOf("let offer")
    );
    expect(concessionBranch).toContain("updateEnrollmentPlanIdOnly");
    expect(concessionBranch).toContain("updateSubscriptionById");
    expect(concessionBranch).not.toContain("applyAdminCommercialIdentityChange");
    expect(concessionBranch).not.toContain("persistAdminCreateChargedTerms");
  });

  it("first later paid commitment still resolves currentPriceForPlan, including yearly", () => {
    const completion = read("server/commercial/adminChargedTermsCompletion.ts");
    expect(completion).toContain("pricingService.currentPriceForPlan(planId, input.billingCycleCode)");
    expect(completion).not.toContain("monthly * 12");
    expect(completion).not.toContain("amount * 12");
    const update = read("server/subscriptionAudit.ts");
    expect(update).toContain("resolveChargedTermsForAdminCreate");
  });

  it("concurrent current concessions are prevented by unique version and overlap", () => {
    const sql = read("drizzle/0090_commercial_subscription_concessions.sql");
    const domain = read("server/commercial/concessions.ts");
    expect(sql).toContain("UNIQUE(`subscriptionId`,`version`)");
    expect(domain).toContain("db.transaction");
    expect(domain).toContain('throw new CommercialConcessionError("overlap")');
    expect(domain).not.toContain("convertToPaid");
    expect(domain).not.toContain("persistAdminCreateChargedTerms");
  });

  it("grant revise and cancel are Admin-gated and do not use requireFeature", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain('assertAdminAccess(ctx, "admin.grantCommercialConcession")');
    expect(routers).toContain('assertAdminAccess(ctx, "admin.reviseCommercialConcession")');
    expect(routers).toContain('assertAdminAccess(ctx, "admin.cancelCommercialConcession")');
    const grantSlice = routers.slice(
      routers.indexOf("grantCommercialConcession: protectedProcedure"),
      routers.indexOf("reviseCommercialConcession: protectedProcedure")
    );
    expect(grantSlice).not.toContain("requireFeature");
  });
});
