import { describe, expect, it } from "vitest";
import { RuntimeCategoryFilterManager } from "../category-filter/runtimeCategoryFilterManager";
import { applyKitchenCategoryFilter } from "../kitchen/applyKitchenCategoryFilter";
import {
  collectOrderCategoryIds,
  normalizeKitchenReadModel,
} from "../kitchen/kitchenRuntimeReadModel";
import type { KitchenQueueResult } from "@/lib/kitchen/types";
import { kitchenDisplayRole } from "../roles/roleDefinitions";
import { mockCategoryProjection } from "./fixtures/categoryProjectionFixtures";

function mockQueue(): KitchenQueueResult {
  return {
    generatedAt: new Date().toISOString(),
    projectionSchemaVersion: 2,
    queryCatalogVersion: 1,
    orderingPolicyId: "fifo-by-created-at",
    categoryProjectionVersion: 1_700_000_000_000,
    projectionBuildDurationMs: 5,
    projectionIntegrity: "valid",
    tickets: [],
    columns: {
      pending: [
        {
          orderId: 1,
          orderNumber: "1001",
          tableNumber: 5,
          sessionId: null,
          customerName: null,
          orderNotes: null,
          status: "pending",
          totalAmount: "10",
          createdAt: "2026-07-06T10:00:00.000Z",
          readyAt: null,
          statusEnteredAt: "2026-07-06T10:00:00.000Z",
          elapsedSeconds: 60,
          columnElapsedSeconds: 60,
          urgencyTier: "normal",
          lineCount: 1,
          linesSummary: "1× Burger",
          lineItems: [
            {
              lineItemId: 1,
              menuItemId: 10,
              nameAr: "برجر",
              nameEn: "Burger",
              quantity: 1,
              price: "10",
              category: mockCategoryProjection({ categoryId: 1 }),
            },
          ],
          lastEventId: null,
        },
        {
          orderId: 2,
          orderNumber: "1002",
          tableNumber: 6,
          sessionId: null,
          customerName: null,
          orderNotes: null,
          status: "pending",
          totalAmount: "20",
          createdAt: "2026-07-06T10:05:00.000Z",
          readyAt: null,
          statusEnteredAt: "2026-07-06T10:05:00.000Z",
          elapsedSeconds: 30,
          columnElapsedSeconds: 30,
          urgencyTier: "normal",
          lineCount: 1,
          linesSummary: "1× Pizza",
          lineItems: [
            {
              lineItemId: 2,
              menuItemId: 20,
              nameAr: "بيتزا",
              nameEn: "Pizza",
              quantity: 1,
              price: "20",
              category: mockCategoryProjection({ categoryId: 2 }),
            },
          ],
          lastEventId: null,
        },
      ],
      preparing: [],
      ready: [],
    },
    meta: { totalVisible: 2, counts: { pending: 2, preparing: 0, ready: 0 } },
  };
}

describe("kitchen category filter pipeline", () => {
  const capabilities = kitchenDisplayRole.metadata.capabilities;

  it("collects canonical category ids from line items only", () => {
    const ticket = mockQueue().columns.pending[0];
    expect(collectOrderCategoryIds(ticket.lineItems)).toEqual([1]);
  });

  it("filters orders before presentation — O(n) single pass", () => {
    const readModel = normalizeKitchenReadModel(mockQueue());
    const manager = new RuntimeCategoryFilterManager();
    manager.syncFromConfiguration(
      {
        version: "v1",
        role: "kitchen_display",
        updatedAt: "v1",
        configurationState: "applied",
        validationErrors: [],
        usedFallback: false,
        active: { language: "en", direction: "ltr" },
        tracked: {
          density: "large",
          densityActivated: true,
          categoryIds: [1],
          categoriesActivated: true,
        },
      },
      capabilities
    );

    const filtered = applyKitchenCategoryFilter(readModel, manager.getPredicate());
    expect(filtered.columns.pending).toHaveLength(1);
    expect(filtered.columns.pending[0].orderId).toBe(1);
    expect(filtered.meta.counts.pending).toBe(1);
  });

  it("shows all orders when filter disabled", () => {
    const readModel = normalizeKitchenReadModel(mockQueue());
    const manager = new RuntimeCategoryFilterManager();
    manager.syncFromConfiguration(
      {
        version: "v1",
        role: "kitchen_display",
        updatedAt: "v1",
        configurationState: "applied",
        validationErrors: [],
        usedFallback: false,
        active: { language: "en", direction: "ltr" },
        tracked: {
          density: "large",
          densityActivated: true,
          categoryIds: [],
          categoriesActivated: true,
        },
      },
      capabilities
    );

    const filtered = applyKitchenCategoryFilter(readModel, manager.getPredicate());
    expect(filtered.columns.pending).toHaveLength(2);
  });

  it("order visible when at least one line item matches selected category", () => {
    const queue = mockQueue();
    queue.columns.pending[0].lineItems.push({
      lineItemId: 3,
      menuItemId: 30,
      nameAr: "سلطة",
      nameEn: "Salad",
      quantity: 1,
      price: "5",
      category: mockCategoryProjection({ categoryId: 99 }),
    });

    const readModel = normalizeKitchenReadModel(queue);
    const manager = new RuntimeCategoryFilterManager();
    manager.syncFromConfiguration(
      {
        version: "v1",
        role: "kitchen_display",
        updatedAt: "v1",
        configurationState: "applied",
        validationErrors: [],
        usedFallback: false,
        active: { language: "en", direction: "ltr" },
        tracked: {
          density: "large",
          densityActivated: true,
          categoryIds: [99],
          categoriesActivated: true,
        },
      },
      capabilities
    );

    const filtered = applyKitchenCategoryFilter(readModel, manager.getPredicate());
    expect(filtered.columns.pending.some((t) => t.orderId === 1)).toBe(true);
  });
});
