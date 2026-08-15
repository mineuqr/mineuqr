/**
 * COMMERCIAL-ADMIN-CHARGED-TERMS-COMPLETION-1
 * Fail-closed Admin Charged Terms: monthly/yearly, price source, persist, immutability, MRR.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { monthlyEquivalentFromChargedTerms } from "../metrics/chargedTermsMrr";

const PLAN_ID = "22222222-2222-4222-8222-222222222222";

vi.mock("../../db", () => ({
  getDb: vi.fn(),
}));

vi.mock("../../services/commercial-catalog", () => ({
  ensureCatalogReady: vi.fn(async () => {}),
  isLivePlanUuid: (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    ),
  resolveLivePlanById: vi.fn(),
  planService: { get: vi.fn() },
  pricingService: {
    listBillingCycles: vi.fn(),
    currentPriceForPlan: vi.fn(),
  },
  getSubscriptionCommercialBinding: vi.fn(),
}));

vi.mock("../../audit/auditEmitter", () => ({
  emitAuditEvent: vi.fn(),
}));

import { getDb } from "../../db";
import {
  getSubscriptionCommercialBinding,
  planService,
  pricingService,
  resolveLivePlanById,
} from "../../services/commercial-catalog";
import {
  AdminChargedTermsCompletionError,
  persistAdminCreateChargedTerms,
  resolveChargedTermsForAdminCreate,
} from "../adminChargedTermsCompletion";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

const monthlyCycle = {
  id: "cycle-monthly",
  code: "monthly",
  intervalCount: 1,
  intervalUnit: "month" as const,
};
const yearlyCycle = {
  id: "cycle-yearly",
  code: "yearly",
  intervalCount: 1,
  intervalUnit: "year" as const,
};

function offer(overrides: Record<string, unknown> = {}) {
  return {
    planId: PLAN_ID,
    catalogPlanCode: "enterprise",
    commercialName: "Enterprise",
    chargedAmount: "99.00",
    chargedCurrency: "USD",
    billingCycleId: "cycle-monthly",
    billingCycleCode: "monthly" as const,
    intervalCount: 1,
    intervalUnit: "month" as const,
    ...overrides,
  };
}

describe("Admin Charged Terms completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (resolveLivePlanById as ReturnType<typeof vi.fn>).mockResolvedValue(PLAN_ID);
    (planService.get as ReturnType<typeof vi.fn>).mockReturnValue({
      id: PLAN_ID,
      code: "enterprise",
      name: "Enterprise",
      isHidden: false,
    });
    (pricingService.listBillingCycles as ReturnType<typeof vi.fn>).mockReturnValue([
      monthlyCycle,
      yearlyCycle,
    ]);
    (pricingService.currentPriceForPlan as ReturnType<typeof vi.fn>).mockReturnValue({
      amount: "99.00",
      currency: "USD",
    });
  });

  it("1. monthly commercial offer uses current Live Plan price for monthly cycle", async () => {
    const resolved = await resolveChargedTermsForAdminCreate({
      planId: PLAN_ID,
      billingCycleCode: "monthly",
    });
    expect(pricingService.currentPriceForPlan).toHaveBeenCalledWith(PLAN_ID, "monthly");
    expect(resolved).toMatchObject({
      planId: PLAN_ID,
      chargedAmount: "99.00",
      chargedCurrency: "USD",
      billingCycleCode: "monthly",
    });
  });

  it("1b. persist writes Binding Charged Terms for the Admin create", async () => {
    (getSubscriptionCommercialBinding as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        planId: PLAN_ID,
        chargedAmount: "99.00",
        chargedCurrency: "USD",
        billingCycleCode: "monthly",
      });
    const values = vi.fn(async () => undefined);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      insert: () => ({ values }),
    });
    const result = await persistAdminCreateChargedTerms({
      subscriptionId: 840001,
      offer: offer(),
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 840001,
        planId: PLAN_ID,
        chargedAmount: "99.00",
        chargedCurrency: "USD",
        billingCycleCode: "monthly",
        legacyPlanId: null,
      })
    );
    expect(result.chargedTerms.billingCycleCode).toBe("monthly");
  });

  it("2b. persist writes yearly billingCycleCode unchanged", async () => {
    (getSubscriptionCommercialBinding as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        planId: PLAN_ID,
        chargedAmount: "999.00",
        chargedCurrency: "USD",
        billingCycleCode: "yearly",
      });
    const values = vi.fn(async () => undefined);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      insert: () => ({ values }),
    });
    const result = await persistAdminCreateChargedTerms({
      subscriptionId: 840002,
      offer: offer({
        chargedAmount: "999.00",
        billingCycleId: "cycle-yearly",
        billingCycleCode: "yearly",
        intervalUnit: "year",
      }),
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 840002,
        chargedAmount: "999.00",
        billingCycleCode: "yearly",
      })
    );
    expect(result.chargedTerms.billingCycleCode).toBe("yearly");
  });

  it("2. yearly commercial offer preserves yearly cycle and yearly amount", async () => {
    (pricingService.currentPriceForPlan as ReturnType<typeof vi.fn>).mockReturnValue({
      amount: "999.00",
      currency: "USD",
    });
    const resolved = await resolveChargedTermsForAdminCreate({
      planId: PLAN_ID,
      billingCycleCode: "yearly",
    });
    expect(pricingService.currentPriceForPlan).toHaveBeenCalledWith(PLAN_ID, "yearly");
    expect(resolved.billingCycleCode).toBe("yearly");
    expect(resolved.chargedAmount).toBe("999.00");
    expect(
      monthlyEquivalentFromChargedTerms(
        resolved.chargedAmount,
        resolved.chargedCurrency,
        resolved.billingCycleCode,
        null
      )
    ).toEqual({ value: 83.25, classification: "INCLUDED" });
  });

  it("3. invalid billing cycle fail-closes", async () => {
    await expect(
      resolveChargedTermsForAdminCreate({
        planId: PLAN_ID,
        billingCycleCode: "weekly",
      })
    ).rejects.toMatchObject({ code: "invalid_billing_cycle" });
    await expect(
      resolveChargedTermsForAdminCreate({
        planId: PLAN_ID,
        billingCycleCode: "",
      })
    ).rejects.toMatchObject({ code: "invalid_billing_cycle" });
  });

  it("4. missing amount fail-closes", async () => {
    (pricingService.currentPriceForPlan as ReturnType<typeof vi.fn>).mockReturnValue({
      amount: "",
      currency: "USD",
    });
    await expect(
      resolveChargedTermsForAdminCreate({
        planId: PLAN_ID,
        billingCycleCode: "monthly",
      })
    ).rejects.toMatchObject({ code: "missing_amount" });
  });

  it("5. missing currency fail-closes", async () => {
    (pricingService.currentPriceForPlan as ReturnType<typeof vi.fn>).mockReturnValue({
      amount: "99.00",
      currency: "",
    });
    await expect(
      resolveChargedTermsForAdminCreate({
        planId: PLAN_ID,
        billingCycleCode: "monthly",
      })
    ).rejects.toMatchObject({ code: "missing_currency" });
  });

  it("6. missing Live Plan fail-closes", async () => {
    await expect(
      resolveChargedTermsForAdminCreate({
        planId: "not-a-uuid",
        billingCycleCode: "monthly",
      })
    ).rejects.toMatchObject({ code: "missing_live_plan" });
    (resolveLivePlanById as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("unknown")
    );
    await expect(
      resolveChargedTermsForAdminCreate({
        planId: PLAN_ID,
        billingCycleCode: "monthly",
      })
    ).rejects.toMatchObject({ code: "missing_live_plan" });
  });

  it("7–8. binding persist failure and incomplete write fail-close", async () => {
    (getSubscriptionCommercialBinding as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(
      persistAdminCreateChargedTerms({
        subscriptionId: 1,
        offer: offer(),
      })
    ).rejects.toBeInstanceOf(AdminChargedTermsCompletionError);

    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      insert: () => ({
        values: vi.fn(async () => {
          throw new Error("insert failed");
        }),
      }),
    });
    await expect(
      persistAdminCreateChargedTerms({
        subscriptionId: 1,
        offer: offer(),
      })
    ).rejects.toMatchObject({ code: "binding_persist_failed" });
  });

  it("8b. incomplete Charged Terms write deletes this subscription binding then fail-closes", async () => {
    (getSubscriptionCommercialBinding as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        planId: PLAN_ID,
        chargedAmount: null,
        chargedCurrency: "USD",
        billingCycleCode: "monthly",
      });
    const values = vi.fn(async () => undefined);
    const where = vi.fn(async () => undefined);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      insert: () => ({ values }),
      delete: () => ({ where }),
    });
    await expect(
      persistAdminCreateChargedTerms({
        subscriptionId: 840001,
        offer: offer(),
      })
    ).rejects.toMatchObject({ code: "charged_terms_incomplete" });
    expect(where).toHaveBeenCalled();
  });

  it("9. retry with identical terms is idempotent", async () => {
    (getSubscriptionCommercialBinding as ReturnType<typeof vi.fn>).mockResolvedValue({
      planId: PLAN_ID,
      chargedAmount: "99.00",
      chargedCurrency: "USD",
      billingCycleCode: "monthly",
    });
    const insert = vi.fn();
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      insert: () => ({ values: insert }),
    });
    const result = await persistAdminCreateChargedTerms({
      subscriptionId: 42,
      offer: offer(),
    });
    expect(result.chargedTerms.chargedAmount).toBe("99.00");
    expect(insert).not.toHaveBeenCalled();
  });

  it("10. price source is currentPriceForPlan for the selected cycle", async () => {
    await resolveChargedTermsForAdminCreate({
      planId: PLAN_ID,
      billingCycleCode: "monthly",
    });
    expect(pricingService.currentPriceForPlan).toHaveBeenCalledWith(PLAN_ID, "monthly");
    expect(pricingService.currentPriceForPlan).not.toHaveBeenCalledWith(
      PLAN_ID,
      "yearly"
    );
  });

  it("11. Admin completion source does not read subscription_plans", () => {
    const src = read("server/commercial/adminChargedTermsCompletion.ts");
    expect(src).not.toContain("getSubscriptionPlanById");
    expect(src).not.toContain("priceMonthly");
    expect(src).not.toContain("priceYearly");
    expect(src).not.toMatch(/mysqlTable\(["']subscription_plans/);
    expect(src).toContain("currentPriceForPlan");
  });

  it("12. MRR follows Charged Terms only", () => {
    expect(
      monthlyEquivalentFromChargedTerms("99.00", "USD", "monthly", null)
    ).toEqual({ value: 99, classification: "INCLUDED" });
    expect(
      monthlyEquivalentFromChargedTerms(null, "USD", "monthly", null)
    ).toEqual({ value: 0, classification: "INCOMPLETE_CHARGED_TERMS" });
    const mrr = read("server/commercial/metrics/chargedTermsMrr.ts");
    expect(mrr).not.toContain("currentPriceForPlan");
    expect(mrr).not.toContain("priceMonthly");
  });

  it("13. entitlement hub does not require Binding", () => {
    const hub = read("server/commercial/getCommercialEntitlements.ts");
    expect(hub).not.toContain("chargedAmount");
    expect(hub).not.toContain("persistAdminCreateChargedTerms");
  });

  it("14. existing Charged Terms are immutable on persist", async () => {
    (getSubscriptionCommercialBinding as ReturnType<typeof vi.fn>).mockResolvedValue({
      planId: PLAN_ID,
      chargedAmount: "19.00",
      chargedCurrency: "USD",
      billingCycleCode: "monthly",
    });
    await expect(
      persistAdminCreateChargedTerms({
        subscriptionId: 42,
        offer: offer({ chargedAmount: "99.00" }),
      })
    ).rejects.toMatchObject({ code: "historical_terms_immutable" });
  });

  it("15. Admin update does not call financial persist", () => {
    const update = read("server/subscriptionAudit.ts");
    const updateFn = update.slice(
      update.indexOf("export async function applyAdminUserSubscriptionUpdate")
    );
    expect(updateFn).not.toContain("persistAdminCreateChargedTerms");
    expect(updateFn).not.toContain("ensureLivePlanBoundForSubscription");
    expect(updateFn).not.toContain("onDuplicateKeyUpdate");
    expect(updateFn).not.toContain("deleteUserSubscriptionById");
  });

  it("compensate delete is scoped to the just-created result.id", () => {
    const audit = read("server/subscriptionAudit.ts");
    const createFn = audit.slice(
      audit.indexOf("export async function applyAdminUserSubscriptionCreate"),
      audit.indexOf("function buildAdminSubscriptionUpdateData")
    );
    expect(createFn).toContain("deleteUserSubscriptionById(result.id)");
    expect(createFn).not.toContain("deleteUserSubscriptionById(existing");
  });
});
