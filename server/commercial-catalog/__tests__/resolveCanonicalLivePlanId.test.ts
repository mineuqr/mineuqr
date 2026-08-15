/**
 * COMMERCIAL-OD-2-SUBSCRIPTION-LIVE-PLAN-IDENTITY-1
 * Writers resolve checkout/admin integers to commercial_plans.id before persist.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/commercial-catalog/seedAdoptionCatalog", () => ({
  ensureCommercialCatalogAdoptionSeed: vi.fn(async () => undefined),
}));

import {
  commercialCatalogStore,
  invalidateCatalogReadyGate,
  planService,
  resolveCanonicalLivePlanId,
} from "../../services/commercial-catalog";

describe("resolveCanonicalLivePlanId", () => {
  let professionalId = "";

  beforeEach(() => {
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    professionalId = planService.create({
      code: "professional",
      name: "Professional",
    }).id;
  });

  it("returns the Live Plan UUID for a bridged integer handle", async () => {
    await expect(resolveCanonicalLivePlanId(30002)).resolves.toBe(professionalId);
  });

  it("returns the same UUID when given the Live Plan id", async () => {
    await expect(resolveCanonicalLivePlanId(professionalId)).resolves.toBe(
      professionalId
    );
  });

  it("fails closed for an unmapped integer", async () => {
    await expect(resolveCanonicalLivePlanId(99999)).rejects.toThrow(
      /unmapped_legacy_plan/
    );
  });

  it("fails closed for a non-UUID non-integer string", async () => {
    await expect(resolveCanonicalLivePlanId("not-a-plan")).rejects.toThrow(
      /invalid_plan_ref/
    );
  });
});
