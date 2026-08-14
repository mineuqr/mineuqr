/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — bootstrap governance.
 * Bootstrap seeds live plans only when uninitialized. Never publishes versions.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  commercialCatalogStore,
  bootstrapPersistentCommercialCatalog,
  InMemoryDurableCatalogBackend,
  setDurableLivePlanBackendForTests,
  invalidateCatalogReadyGate,
  planService,
} from "../../services/commercial-catalog";
import { persistFullLiveCatalog } from "../../services/commercial-catalog/livePlanPersistence";

describe("Live plan bootstrap governance", () => {
  let durable: InMemoryDurableCatalogBackend;

  beforeEach(() => {
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    durable = new InMemoryDurableCatalogBackend();
    setDurableLivePlanBackendForTests(durable);
  });

  it("does not bootstrap when live plans already exist", async () => {
    await bootstrapPersistentCommercialCatalog();
    const persistSpy = vi.spyOn(durable, "persistFullCatalog");
    persistSpy.mockClear();
    const result = await bootstrapPersistentCommercialCatalog();
    expect(result.bootstrapped).toBe(false);
    expect(result.reason).toBe("already_initialized");
    expect(persistSpy).not.toHaveBeenCalled();
  });

  it("seeds live plans on empty catalog", async () => {
    const result = await bootstrapPersistentCommercialCatalog();
    expect(result.bootstrapped).toBe(true);
    expect(planService.list()).toHaveLength(3);
  });

  it("hydrates from durable memory without mutating live definitions", async () => {
    await bootstrapPersistentCommercialCatalog();
    const ids = planService.list().map((p) => p.id).sort();
    commercialCatalogStore.clear();
    await durable.hydrateInto(commercialCatalogStore);
    expect(planService.list().map((p) => p.id).sort()).toEqual(ids);
    await persistFullLiveCatalog(commercialCatalogStore);
  });
});
