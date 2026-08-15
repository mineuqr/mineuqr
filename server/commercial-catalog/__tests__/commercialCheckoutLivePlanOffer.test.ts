/**
 * COMMERCIAL-SUBSCRIPTION-PLANS-CONSOLIDATION-1
 * Checkout offer must come from Live Plan, not subscription_plans.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/commercial-catalog/seedAdoptionCatalog", () => ({
  ensureCommercialCatalogAdoptionSeed: vi.fn(async () => undefined),
}));

import {
  commercialCatalogStore,
  planService,
  pricingService,
  invalidateCatalogReadyGate,
  resolveCheckoutOfferFromLivePlan,
} from "../../services/commercial-catalog";

describe("resolveCheckoutOfferFromLivePlan", () => {
  beforeEach(() => {
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    const monthly = pricingService.createBillingCycle({
      code: "monthly",
      name: "Monthly",
      intervalCount: 1,
      intervalUnit: "month",
    });
    const yearly = pricingService.createBillingCycle({
      code: "yearly",
      name: "Yearly",
      intervalCount: 1,
      intervalUnit: "year",
    });
    const plan = planService.create({
      code: "professional",
      name: "Professional",
    });
    pricingService.create({
      planId: plan.id,
      billingCycleId: monthly.id,
      currency: "USD",
      amount: "26.40",
    });
    pricingService.create({
      planId: plan.id,
      billingCycleId: yearly.id,
      currency: "USD",
      amount: "264.00",
    });
  });

  it("returns Live Plan offer price for the canonical UUID", async () => {
    const professional = planService.getByCode("professional");
    const offer = await resolveCheckoutOfferFromLivePlan(professional!.id, "monthly");
    expect(offer).toMatchObject({
      planId: professional!.id,
      planCode: "professional",
      commercialName: "Professional",
      amount: "26.40",
      currency: "USD",
      billingCycleCode: "monthly",
    });
  });

  it("returns yearly Live Plan offer price", async () => {
    const professional = planService.getByCode("professional");
    const offer = await resolveCheckoutOfferFromLivePlan(professional!.id, "yearly");
    expect(offer?.amount).toBe("264.00");
  });

  it("fails closed for integer leftover identity", async () => {
    await expect(
      resolveCheckoutOfferFromLivePlan("30002" as string, "monthly")
    ).resolves.toBeNull();
  });

  it("fails closed for unknown UUID", async () => {
    await expect(
      resolveCheckoutOfferFromLivePlan(
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "monthly"
      )
    ).resolves.toBeNull();
  });
});
