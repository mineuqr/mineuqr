import { describe, expect, it } from "vitest";
import { RuntimeCategoryFilterManager } from "../category-filter/runtimeCategoryFilterManager";
import { applyKitchenCategoryFilter } from "../kitchen/applyKitchenCategoryFilter";
import { buildKitchenRuntimeStream } from "../kitchen/buildKitchenRuntimeStream";
import {
  collectOrderCategoryIds,
  normalizeKitchenReadModel,
} from "../kitchen/kitchenRuntimeReadModel";
import type { KitchenQueueResult } from "@/lib/kitchen/types";
import { kitchenDisplayRole } from "../roles/roleDefinitions";
import {
  ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
  ORDER_LINE_PROJECTION_TYPE_OFFER,
} from "@/lib/kitchen/lineProjection";
import { mockCategoryProjection } from "./fixtures/categoryProjectionFixtures";

function mockConfiguration(categoryIds: number[]) {
  return {
    version: "v1",
    role: "kitchen_display" as const,
    updatedAt: "v1",
    configurationState: "applied" as const,
    validationErrors: [],
    usedFallback: false,
    active: { language: "en" as const, direction: "ltr" as const },
    tracked: {
      density: "large" as const,
      densityActivated: true,
      categoryIds,
      categoriesActivated: true,
    },
  };
}

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
              projectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
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
              projectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
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
    manager.syncFromConfiguration(mockConfiguration([1]), capabilities);

    const filtered = applyKitchenCategoryFilter(readModel, manager.getPredicate(), true);
    expect(filtered.columns.pending).toHaveLength(1);
    expect(filtered.columns.pending[0].orderId).toBe(1);
    expect(filtered.meta.counts.pending).toBe(1);
  });

  it("shows all orders when filter disabled", () => {
    const readModel = normalizeKitchenReadModel(mockQueue());
    const manager = new RuntimeCategoryFilterManager();
    manager.syncFromConfiguration(mockConfiguration([]), capabilities);

    const filtered = applyKitchenCategoryFilter(readModel, manager.getPredicate(), false);
    expect(filtered.columns.pending).toHaveLength(2);
  });

  it("projects only matching line items when order spans multiple categories", () => {
    const queue = mockQueue();
    queue.columns.pending[0].lineItems.push({
      projectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
      lineItemId: 3,
      menuItemId: 30,
      nameAr: "سلطة",
      nameEn: "Salad",
      quantity: 1,
      price: "5",
      category: mockCategoryProjection({ categoryId: 99 }),
    });
    queue.columns.pending[0].lineCount = 2;
    queue.columns.pending[0].linesSummary = "1× Burger, 1× Salad";

    const readModel = normalizeKitchenReadModel(queue);
    const manager = new RuntimeCategoryFilterManager();
    manager.syncFromConfiguration(mockConfiguration([99]), capabilities);

    const filtered = applyKitchenCategoryFilter(readModel, manager.getPredicate(), true);
    const ticket = filtered.columns.pending.find((t) => t.orderId === 1);
    expect(ticket).toBeDefined();
    expect(ticket!.lineItems).toHaveLength(1);
    expect(ticket!.lineItems[0].nameEn).toBe("Salad");
    expect(ticket!.lineCount).toBe(1);
    expect(ticket!.linesSummary).toBe("1× Salad");
    expect(ticket!.orderCategoryIds).toEqual([99]);
    expect(ticket!.orderNumber).toBe("1001");
    expect(ticket!.status).toBe("pending");
  });

  it("hides orders with zero matching line items", () => {
    const readModel = normalizeKitchenReadModel(mockQueue());
    const manager = new RuntimeCategoryFilterManager();
    manager.syncFromConfiguration(mockConfiguration([99]), capabilities);

    const filtered = applyKitchenCategoryFilter(readModel, manager.getPredicate(), true);
    expect(filtered.columns.pending).toHaveLength(0);
    expect(filtered.meta.counts.pending).toBe(0);
  });

  it("excludes offer lines when category filter is active", () => {
    const queue = mockQueue();
    queue.columns.pending[0].lineItems.push({
      projectionType: ORDER_LINE_PROJECTION_TYPE_OFFER,
      lineItemId: 4,
      menuItemId: 0,
      nameAr: "عرض",
      nameEn: "Combo Offer",
      quantity: 1,
      price: "15",
      offer: {
        lineKind: "offer",
        offerId: 7,
        titleAr: "عرض",
        titleEn: "Combo Offer",
        source: "order_line_snapshot",
        version: 1,
        updatedAt: "2026-07-06T10:00:00.000Z",
      },
    });

    const readModel = normalizeKitchenReadModel(queue);
    const manager = new RuntimeCategoryFilterManager();
    manager.syncFromConfiguration(mockConfiguration([1]), capabilities);

    const filtered = applyKitchenCategoryFilter(readModel, manager.getPredicate(), true);
    const ticket = filtered.columns.pending.find((t) => t.orderId === 1);
    expect(ticket!.lineItems).toHaveLength(1);
    expect(ticket!.lineItems[0].nameEn).toBe("Burger");
  });

  it("buildKitchenRuntimeStream applies item projection when filter enabled", () => {
    const queue = mockQueue();
    queue.columns.pending[0].lineItems.push({
      projectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
      lineItemId: 3,
      menuItemId: 30,
      nameAr: "سلطة",
      nameEn: "Salad",
      quantity: 1,
      price: "5",
      category: mockCategoryProjection({ categoryId: 99 }),
    });

    const manager = new RuntimeCategoryFilterManager();
    manager.syncFromConfiguration(mockConfiguration([1]), capabilities);

    const stream = buildKitchenRuntimeStream({
      data: queue,
      isLoading: false,
      isError: false,
      error: null,
      language: "en",
      categoryFilterEnabled: true,
      categoryFilterPredicate: manager.getPredicate(),
    });

    const ticket = stream.queue!.columns.pending.find((t) => t.orderId === 1);
    expect(ticket!.lineItems).toHaveLength(1);
    expect(ticket!.lineItems[0].nameEn).toBe("Burger");
    expect(stream.isFiltered).toBe(true);
  });
});
