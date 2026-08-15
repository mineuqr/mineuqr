/**
 * COMMERCIAL-CHARGED-TERMS-SNAPSHOT-VERSIONING-1
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("../../db", () => ({
  getDb: vi.fn(),
}));

vi.mock("../../services/commercial-catalog/CatalogStore", () => ({
  newCommercialId: () => "snap-id-1",
  nowIso: () => "2026-08-15T16:00:00.000Z",
}));

import { getDb } from "../../db";
import {
  chargedTermsSnapshotMatchesOffer,
  insertImmutableChargedTermsSnapshot,
  loadCurrentChargedTermsForSubscriptions,
} from "../chargedTermsSnapshots";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

const PLAN_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PLAN_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function offer(overrides: Record<string, string> = {}) {
  return {
    planId: PLAN_A,
    chargedAmount: "99.00",
    chargedCurrency: "USD",
    billingCycleId: "cycle-monthly",
    billingCycleCode: "monthly",
    ...overrides,
  };
}

describe("Charged Terms snapshot versioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1–2. identical retry is idempotent and does not insert a second row", async () => {
    const existing = {
      id: "snap-id-0",
      subscriptionId: 10,
      planId: PLAN_A,
      chargedAmount: "99.00",
      chargedCurrency: "USD",
      billingCycleId: "cycle-monthly",
      billingCycleCode: "monthly",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      version: 1,
      source: "admin_create",
      actorId: null,
    };
    const insert = vi.fn();
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: async () => [existing],
            }),
          }),
        }),
      }),
      insert: () => ({ values: insert }),
    });
    const row = await insertImmutableChargedTermsSnapshot({
      subscriptionId: 10,
      offer: offer(),
      source: "admin_create",
    });
    expect(row.version).toBe(1);
    expect(insert).not.toHaveBeenCalled();
  });

  it("3–5. plan change insert uses next version and does not update prior row", async () => {
    const existing = {
      id: "snap-id-0",
      subscriptionId: 10,
      planId: PLAN_A,
      chargedAmount: "99.00",
      chargedCurrency: "USD",
      billingCycleId: "cycle-monthly",
      billingCycleCode: "monthly",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      version: 1,
      source: "admin_create",
      actorId: null,
    };
    const values = vi.fn(async () => undefined);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: async () => [existing],
            }),
          }),
        }),
      }),
      insert: () => ({ values }),
      update: () => {
        throw new Error("must not update snapshots");
      },
    });
    await insertImmutableChargedTermsSnapshot({
      subscriptionId: 10,
      offer: offer({ planId: PLAN_B, chargedAmount: "149.00" }),
      source: "admin_update",
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 10,
        planId: PLAN_B,
        chargedAmount: "149.00",
        billingCycleCode: "monthly",
        version: 2,
        source: "admin_update",
      })
    );
  });

  it("4,7–8. cycle change inserts a new snapshot using the selected-cycle amount", async () => {
    const existing = {
      id: "snap-id-0",
      subscriptionId: 10,
      planId: PLAN_A,
      chargedAmount: "99.00",
      chargedCurrency: "USD",
      billingCycleId: "cycle-monthly",
      billingCycleCode: "monthly",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      version: 1,
      source: "admin_create",
      actorId: null,
    };
    const values = vi.fn(async () => undefined);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: async () => [existing],
            }),
          }),
        }),
      }),
      insert: () => ({ values }),
      update: () => {
        throw new Error("must not update snapshots");
      },
    });
    await insertImmutableChargedTermsSnapshot({
      subscriptionId: 10,
      offer: offer({
        billingCycleId: "cycle-yearly",
        billingCycleCode: "yearly",
        chargedAmount: "999.00",
      }),
      source: "admin_update",
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: PLAN_A,
        chargedAmount: "999.00",
        billingCycleCode: "yearly",
        version: 2,
      })
    );
    expect(
      chargedTermsSnapshotMatchesOffer(
        {
          planId: PLAN_A,
          chargedAmount: "99.00",
          chargedCurrency: "USD",
          billingCycleCode: "monthly",
        },
        offer({ billingCycleCode: "yearly", chargedAmount: "999.00" })
      )
    ).toBe(false);
    expect(
      chargedTermsSnapshotMatchesOffer(
        {
          planId: PLAN_A,
          chargedAmount: "999.00",
          chargedCurrency: "USD",
          billingCycleCode: "yearly",
        },
        offer({ billingCycleCode: "monthly", chargedAmount: "99.00" })
      )
    ).toBe(false);
  });

  it("16–17. current loader keeps one row per subscription", async () => {
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: async () => [
              {
                id: "v2",
                subscriptionId: 10,
                planId: PLAN_B,
                chargedAmount: "149.00",
                chargedCurrency: "USD",
                billingCycleId: "c",
                billingCycleCode: "monthly",
                effectiveFrom: "2026-08-01T00:00:00.000Z",
                version: 2,
                source: "admin_update",
                actorId: null,
              },
              {
                id: "v1",
                subscriptionId: 10,
                planId: PLAN_A,
                chargedAmount: "99.00",
                chargedCurrency: "USD",
                billingCycleId: "c",
                billingCycleCode: "monthly",
                effectiveFrom: "2026-01-01T00:00:00.000Z",
                version: 1,
                source: "admin_create",
                actorId: null,
              },
            ],
          }),
        }),
      }),
    });
    const rows = await loadCurrentChargedTermsForSubscriptions([10]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.chargedAmount).toBe("149.00");
    expect(rows[0]?.version).toBe(2);
  });

  it("20–21. snapshot module does not read subscription_plans or legacyPlanId for price", () => {
    const src = read("server/commercial/chargedTermsSnapshots.ts");
    expect(src).not.toContain("priceMonthly");
    expect(src).not.toContain("getSubscriptionPlanById");
    expect(src).not.toContain("legacyPlanId");
    expect(src).not.toContain("subscription_plans");
    expect(src).not.toContain("currentPriceForPlan");
    expect(src.toLowerCase()).toContain("insert-only");
    expect(src).toContain("db.transaction");
    expect(src).not.toMatch(
      /\.update\(\s*commercialSubscriptionChargedTerms/
    );
  });

  it("webhook bind no longer overwrites Charged Terms on duplicate key", () => {
    const bind = read("server/services/commercial-catalog/adoptionService.ts");
    const fn = bind.slice(
      bind.indexOf("export async function bindSubscriptionToLivePlan")
    );
    const dupStart = fn.indexOf("onDuplicateKeyUpdate");
    const dup = fn.slice(dupStart, fn.indexOf("});", dupStart) + 3);
    expect(dup).toContain("planId: binding.planId");
    expect(dup).toContain("updatedAt:");
    expect(dup).not.toContain("chargedAmount");
    expect(dup).not.toContain("chargedCurrency");
    expect(dup).not.toContain("billingCycleCode");
    expect(fn).toContain('source: "webhook_bind"');
  });

  it("17. webhook bind does not create Snapshot #2 when terms already exist", async () => {
    const existing = {
      id: "snap-id-0",
      subscriptionId: 10,
      planId: PLAN_A,
      chargedAmount: "10.00",
      chargedCurrency: "USD",
      billingCycleId: "cycle-monthly",
      billingCycleCode: "monthly",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      version: 1,
      source: "admin_create",
      actorId: null,
    };
    const insert = vi.fn();
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: async () => [existing],
            }),
          }),
        }),
      }),
      insert: () => ({ values: insert }),
    });
    const row = await insertImmutableChargedTermsSnapshot({
      subscriptionId: 10,
      offer: offer({ chargedAmount: "9.00" }),
      source: "webhook_bind",
    });
    expect(row.chargedAmount).toBe("10.00");
    expect(row.version).toBe(1);
    expect(insert).not.toHaveBeenCalled();
  });

  it("18. invoice binding reader overlays current snapshot charged fields", () => {
    const src = read("server/services/commercial-catalog/adoptionService.ts");
    const fn = src.slice(
      src.indexOf("export async function getSubscriptionCommercialBinding")
    );
    expect(fn).toContain("loadCurrentChargedTermsSnapshot");
    expect(fn).toContain(
      "chargedAmount: snapshot?.chargedAmount ?? (row.chargedAmount != null ? String(row.chargedAmount) : null)"
    );
  });
});
