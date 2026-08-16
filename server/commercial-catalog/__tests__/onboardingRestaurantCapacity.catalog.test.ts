/**
 * COMMERCIAL-ONBOARDING-OCCUPANCY-INVARIANT-1
 * Catalog-backed invariant: operator can set the trial plan restaurants cap
 * to 0; onboarding must then fail closed.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  bootstrapPersistentCommercialCatalog,
  commercialCatalogStore,
  InMemoryDurableCatalogBackend,
  invalidateCatalogReadyGate,
  planService,
  setDurableLivePlanBackendForTests,
} from "../../services/commercial-catalog";
import { invalidatePublicCatalogCache } from "../publishing";
import {
  assertOnboardingFirstRestaurantPermitted,
  resolveOnboardingRestaurantCapacity,
} from "../../subscription-runtime/onboardingRestaurantCapacity";
import { CommercialLimitExceededError } from "../../subscription-runtime/commercialLimitOccupancy";

describe("onboarding restaurant capacity against live catalog", () => {
  beforeEach(() => {
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    invalidatePublicCatalogCache();
    setDurableLivePlanBackendForTests(new InMemoryDurableCatalogBackend());
  });

  it("permits first restaurant on the bootstrap Professional restaurants cap", async () => {
    await bootstrapPersistentCommercialCatalog();
    await expect(assertOnboardingFirstRestaurantPermitted()).resolves.toMatchObject({
      allowed: true,
      reasonCode: "within_limit",
      cap: 5,
      proposedTotal: 1,
    });
  });

  it("fails closed after the trial plan restaurants cap is set to 0", async () => {
    await bootstrapPersistentCommercialCatalog();
    const plan = planService.getByCode("professional")!;
    await planService.saveLive(
      plan.id,
      {},
      {},
      {
        limits: [
          { limitKey: "restaurants", value: 0 },
          { limitKey: "categories", value: 25 },
          { limitKey: "items", value: 500 },
        ],
      }
    );
    await expect(assertOnboardingFirstRestaurantPermitted()).rejects.toBeInstanceOf(
      CommercialLimitExceededError
    );
    await expect(resolveOnboardingRestaurantCapacity()).resolves.toMatchObject({
      allowed: false,
      reasonCode: "limit_exceeded",
      cap: 0,
    });
  });

  it("still permits first restaurant when the trial cap changes to another value >= 1", async () => {
    await bootstrapPersistentCommercialCatalog();
    const plan = planService.getByCode("professional")!;
    await planService.saveLive(
      plan.id,
      {},
      {},
      {
        limits: [
          { limitKey: "restaurants", value: 2 },
          { limitKey: "categories", value: 25 },
          { limitKey: "items", value: 500 },
        ],
      }
    );
    await expect(assertOnboardingFirstRestaurantPermitted()).resolves.toMatchObject({
      allowed: true,
      cap: 2,
      reasonCode: "within_limit",
    });
  });

  it("does not use Basic restaurants occupancy when resolving the trial plan", async () => {
    await bootstrapPersistentCommercialCatalog();
    const basic = planService.getByCode("basic")!;
    await planService.saveLive(
      basic.id,
      {},
      {},
      {
        limits: [
          { limitKey: "restaurants", value: 0 },
          { limitKey: "categories", value: 10 },
          { limitKey: "items", value: 100 },
        ],
      }
    );
    await expect(assertOnboardingFirstRestaurantPermitted()).resolves.toMatchObject({
      allowed: true,
      cap: 5,
    });
  });
});
