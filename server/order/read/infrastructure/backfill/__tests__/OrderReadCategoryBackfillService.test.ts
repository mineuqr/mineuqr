import { describe, expect, it, beforeEach, vi } from "vitest";
import { OrderCategoryProjectionBuilder } from "../../../projections/builders/OrderCategoryProjectionBuilder";
import type { CategoryResolutionPort } from "../../../projections/builders/CategoryResolutionPort";
import { OrderReadCategoryBackfillMetrics } from "../OrderReadCategoryBackfillMetrics";
import { OrderReadCategoryBackfillService } from "../OrderReadCategoryBackfillService";
import { OrderReadCategoryBackfillVerifier } from "../OrderReadCategoryBackfillVerifier";
import { InMemoryCategoryBackfillLineItemStore } from "../InMemoryCategoryBackfillLineItemStore";
import { sampleCategoryProjection } from "../../../__tests__/fixtures/categoryProjectionFixtures";

vi.mock("../../../../db", () => ({
  getDb: vi.fn(async () => null),
}));

function mockResolver(
  entries: Record<number, { categoryId: number; nameAr: string; nameEn?: string | null }>
): CategoryResolutionPort {
  return {
    async batchResolveMenuItemCategories(_restaurantId, menuItemIds) {
      const map = new Map();
      for (const menuItemId of menuItemIds) {
        const entry = entries[menuItemId];
        if (!entry) continue;
        map.set(menuItemId, {
          categoryId: entry.categoryId,
          nameAr: entry.nameAr,
          nameEn: entry.nameEn ?? null,
          sortOrder: 0,
          updatedAt: "2026-06-27 10:00:00",
        });
      }
      return map;
    },
  };
}

describe("OrderReadCategoryBackfillService", () => {
  let store: InMemoryCategoryBackfillLineItemStore;
  let metrics: OrderReadCategoryBackfillMetrics;

  beforeEach(() => {
    store = new InMemoryCategoryBackfillLineItemStore();
    metrics = new OrderReadCategoryBackfillMetrics();
    store.seed([
      {
        restaurantId: 7,
        orderId: 10,
        lineItemId: 1,
        menuItemId: 100,
        categoryProjection: {},
      },
      {
        restaurantId: 7,
        orderId: 10,
        lineItemId: 2,
        menuItemId: 101,
        categoryProjection: {},
      },
      {
        restaurantId: 7,
        orderId: 11,
        lineItemId: 3,
        menuItemId: 102,
        categoryProjection: sampleCategoryProjection({ categoryId: 5 }),
      },
    ]);
  });

  function service(): OrderReadCategoryBackfillService {
    const builder = new OrderCategoryProjectionBuilder(
      mockResolver({
        100: { categoryId: 1, nameAr: "مقبلات", nameEn: "Starters" },
        101: { categoryId: 2, nameAr: "أطباق", nameEn: "Mains" },
      }),
      { recordProjectionBuilt: vi.fn(), recordValidationFailure: vi.fn(), snapshot: vi.fn(), reset: vi.fn() } as never
    );
    return new OrderReadCategoryBackfillService(store, builder, metrics);
  }

  it("migrates legacy rows in batches and skips upgraded rows", async () => {
    const report = await service().run({ scope: "tenant", restaurantId: 7, batchSize: 1 });

    expect(report.status).toBe("completed");
    expect(report.rowsMigrated).toBe(2);
    expect(report.rowsSkipped).toBe(0);
    expect(report.rowsFailed).toBe(0);
    expect(report.integrityStatus).toBe("valid");
    expect(report.observability.batchCount).toBe(2);
  });

  it("is idempotent on re-run", async () => {
    const svc = service();
    await svc.run({ scope: "tenant", restaurantId: 7 });
    const second = await svc.run({ scope: "tenant", restaurantId: 7 });

    expect(second.rowsMigrated).toBe(0);
    expect(second.rowsSkipped).toBe(0);
    expect(second.integrityStatus).toBe("valid");
  });

  it("records failures without partial projection writes", async () => {
    store.seed([
      {
        restaurantId: 7,
        orderId: 20,
        lineItemId: 9,
        menuItemId: 999,
        categoryProjection: null,
      },
    ]);

    const report = await service().run({ scope: "tenant", restaurantId: 7 });
    expect(report.rowsFailed).toBe(1);
    expect(report.failures[0]?.error).toBe("category_resolution_failed");

    const row = (await store.listLegacyBatch({ batchSize: 10, restaurantId: 7 }))[0];
    expect(row?.lineItemId).toBe(9);
  });

  it("supports resume cursor after partial completion", async () => {
    const svc = service();
    store.seed([
      {
        restaurantId: 8,
        orderId: 1,
        lineItemId: 1,
        menuItemId: 100,
        categoryProjection: sampleCategoryProjection({ categoryId: 1 }),
      },
      {
        restaurantId: 8,
        orderId: 1,
        lineItemId: 2,
        menuItemId: 101,
        categoryProjection: {},
      },
    ]);

    const resumed = await svc.run({
      scope: "tenant",
      restaurantId: 8,
      batchSize: 500,
      resumeAfter: { restaurantId: 8, orderId: 1, lineItemId: 1 },
    });
    expect(resumed.rowsMigrated).toBe(1);
    expect(resumed.integrityStatus).toBe("valid");
  });
});

describe("OrderReadCategoryBackfillVerifier", () => {
  it("reports 100% integrity when no legacy rows remain", async () => {
    const store = new InMemoryCategoryBackfillLineItemStore();
    store.seed([
      {
        restaurantId: 1,
        orderId: 1,
        lineItemId: 1,
        menuItemId: 10,
        categoryProjection: sampleCategoryProjection(),
      },
    ]);

    const result = await new OrderReadCategoryBackfillVerifier(store).verify();
    expect(result.ok).toBe(true);
    expect(result.integrityPercentage).toBe(100);
  });
});
