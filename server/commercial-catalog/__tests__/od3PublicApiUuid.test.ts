/**
 * COMMERCIAL-OD-3-PUBLIC-API-UUID-CUTOVER-1
 * UUID accept / integer reject / webhook dual-read / trial UUID.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/commercial-catalog/seedAdoptionCatalog", () => ({
  ensureCommercialCatalogAdoptionSeed: vi.fn(async () => undefined),
}));

import {
  commercialCatalogStore,
  invalidateCatalogReadyGate,
  livePlanUuidInput,
  parseWebhookPlanRef,
  planService,
  resolveCanonicalLivePlanId,
} from "../../services/commercial-catalog";
describe("OD-3 live plan UUID contract", () => {
  let professionalId = "";

  beforeEach(() => {
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    professionalId = planService.create({
      code: "professional",
      name: "Professional",
    }).id;
  });

  it("accepts a canonical Live Plan UUID", async () => {
    await expect(resolveCanonicalLivePlanId(professionalId)).resolves.toBe(
      professionalId
    );
    expect(livePlanUuidInput.safeParse(professionalId).success).toBe(true);
  });

  it("rejects a malformed UUID", () => {
    expect(livePlanUuidInput.safeParse("not-a-uuid").success).toBe(false);
    expect(livePlanUuidInput.safeParse("30002").success).toBe(false);
  });

  it("rejects public integer planId", () => {
    expect(livePlanUuidInput.safeParse(30002).success).toBe(false);
    expect(livePlanUuidInput.safeParse(30001).success).toBe(false);
  });

  it("fails closed for an unknown UUID", async () => {
    await expect(
      resolveCanonicalLivePlanId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    ).rejects.toThrow(/unknown_live_plan/);
  });

  it("webhook dual-read still resolves a leftover integer", async () => {
    const ref = parseWebhookPlanRef(30002);
    expect(ref).toBe(30002);
    await expect(resolveCanonicalLivePlanId(ref!)).resolves.toBe(professionalId);
  });

  it("webhook dual-read resolves a UUID metadata value", async () => {
    const ref = parseWebhookPlanRef(professionalId);
    expect(ref).toBe(professionalId);
    await expect(resolveCanonicalLivePlanId(ref!)).resolves.toBe(professionalId);
  });

});
