/**
 * KITCHEN-REALTIME-HARDENING-1 — regression coverage for realtime reliability contracts.
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  __resetKitchenQueueInvalidationCoordinatorForTests,
  scheduleKitchenQueueInvalidation,
} from "../kitchenQueueInvalidationCoordinator";
import { applyKitchenCategoryFilter } from "../applyKitchenCategoryFilter";
import { resolveOperationalScreenAction } from "../../interaction/deviceOrderExecutionCapabilities";
import type { KitchenRuntimeQueue } from "../kitchenRuntimeReadModel";
import { ORDER_LINE_PROJECTION_TYPE_MENU_ITEM } from "@/lib/kitchen/lineProjection";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

function ticket(
  orderId: number,
  status: "pending" | "preparing" | "ready",
  categoryIds: number[]
): KitchenRuntimeQueue["tickets"][number] {
  const lineItems = categoryIds.map((categoryId, index) => ({
    projectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
    lineItemId: orderId * 10 + index,
    menuItemId: categoryId,
    quantity: 1,
    nameAr: `صنف ${categoryId}`,
    nameEn: `Item ${categoryId}`,
    price: "10",
    itemNotes: null,
    modifiers: [],
    category: {
      categoryId,
      nameAr: `فئة ${categoryId}`,
      nameEn: `Category ${categoryId}`,
      categoryProjectionVersion: 1,
    },
  }));
  return {
    orderId,
    orderNumber: `ORD-${orderId}`,
    businessDay: null,
    dailyDisplayNumber: null,
    displayOrderNumber: String(orderId),
    displayReference: String(orderId),
    tableNumber: 1,
    sessionId: null,
    serviceMode: "table_service",
    fulfilmentAnchorType: "table",
    fulfilmentLabel: "1",
    customerName: null,
    orderNotes: null,
    status,
    totalAmount: "10.00",
    createdAt: "2026-09-06T10:00:00.000Z",
    readyAt: null,
    statusEnteredAt: "2026-09-06T10:00:00.000Z",
    elapsedSeconds: 0,
    columnElapsedSeconds: 0,
    urgencyTier: "normal",
    lineCount: lineItems.length || 1,
    linesSummary: "item",
    lastEventId: null,
    lineItems,
    orderCategoryIds: categoryIds,
  };
}

function queueFromTickets(
  tickets: KitchenRuntimeQueue["tickets"]
): KitchenRuntimeQueue {
  const columns = {
    pending: tickets.filter((t) => t.status === "pending"),
    preparing: tickets.filter((t) => t.status === "preparing"),
    ready: tickets.filter((t) => t.status === "ready"),
  };
  return {
    generatedAt: "2026-09-06T10:00:00.000Z",
    tickets,
    columns,
    meta: {
      totalVisible: tickets.length,
      counts: {
        pending: columns.pending.length,
        preparing: columns.preparing.length,
        ready: columns.ready.length,
      },
    },
    projection: {
      projectionSchemaVersion: 2,
      categoryProjectionVersion: 1,
      projectionBuildDurationMs: 1,
      projectionIntegrity: "valid",
    },
  };
}

describe("KITCHEN-REALTIME-HARDENING-1 contracts", () => {
  beforeEach(() => {
    __resetKitchenQueueInvalidationCoordinatorForTests();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetKitchenQueueInvalidationCoordinatorForTests();
  });

  it("burst hints coalesce to a single invalidation", () => {
    const invalidate = vi.fn();
    for (let i = 0; i < 12; i += 1) {
      scheduleKitchenQueueInvalidation({ restaurantId: 7, invalidate });
    }
    vi.advanceTimersByTime(100);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("catch-up debounce 0 still runs immediately and is not authoritative state", () => {
    const invalidate = vi.fn();
    scheduleKitchenQueueInvalidation({
      restaurantId: 7,
      invalidate,
      debounceMs: 0,
    });
    vi.advanceTimersByTime(0);
    expect(invalidate).toHaveBeenCalledTimes(1);
    const hook = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeRealtime.ts"
    );
    expect(hook).not.toContain("setQueryData");
  });

  it("filtered multi-screen contract keeps independent subsets", () => {
    const all = queueFromTickets([
      ticket(1, "preparing", [10]),
      ticket(2, "preparing", [20]),
      ticket(3, "preparing", [10, 20]),
      ticket(4, "preparing", [30]),
    ]);

    const screenA = applyKitchenCategoryFilter(all, (id) => id === 10, true);
    const screenB = applyKitchenCategoryFilter(all, (id) => id === 20, true);
    const screenC = applyKitchenCategoryFilter(all, () => true, false);

    expect(screenA.tickets.map((t) => t.orderId).sort()).toEqual([1, 3]);
    expect(screenB.tickets.map((t) => t.orderId).sort()).toEqual([2, 3]);
    expect(screenC.tickets.map((t) => t.orderId).sort()).toEqual([1, 2, 3, 4]);
    // Absence from Screen A is intentional filtering, not a sync failure.
    expect(screenA.tickets.some((t) => t.orderId === 2)).toBe(false);
  });

  it("Kitchen Ready is status-gated, not channel-gated", () => {
    expect(resolveOperationalScreenAction("kitchen_display", "preparing")?.id).toBe(
      "mark-ready"
    );
    expect(resolveOperationalScreenAction("kitchen_display", "pending")).toBeNull();
    expect(resolveOperationalScreenAction("kitchen_display", "ready")).toBeNull();
    const capabilities = read(
      "client/src/lib/operational-screen/interaction/deviceOrderExecutionCapabilities.ts"
    );
    expect(capabilities).not.toContain("orderingChannel");
    expect(capabilities).not.toContain("cashier_pos");
  });

  it("visibility polling listens for visibilitychange and refetches on return", () => {
    const stream = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts"
    );
    expect(stream).toContain("visibilitychange");
    expect(stream).toContain("useVisiblePollingEnabled");
    expect(stream).toContain("wasHiddenRef");
    expect(stream).toContain("queueQuery.refetch()");
    expect(stream).toContain("DATA_POLL_INTERVAL_MS");
    expect(stream).toContain("DATA_POLL_REALTIME_RECOVERY_MS");
  });

  it("heartbeat watchdog is wired in the platform client", () => {
    const client = read(
      "client/src/lib/realtime-platform/RealtimePlatformClient.ts"
    );
    expect(client).toContain("REALTIME_HEARTBEAT_TIMEOUT_MS");
    expect(client).toContain("handleHeartbeatTimeout");
    expect(client).toContain("noteRealtimeActivity");
    expect(client).toContain("platform.heartbeat");
    expect(client).not.toContain("setQueryData");
  });

  it("Kitchen panel surfaces filter-active UX without changing filter semantics", () => {
    const panel = read(
      "client/src/components/operational-screen/KitchenScreenPanel.tsx"
    );
    expect(panel).toContain("data-kitchen-filter-active");
    expect(panel).toContain("isFiltered");
    expect(panel).not.toContain("serve-order");
  });

  it("keeps 200-order defensive ceiling unchanged", () => {
    const contracts = read(
      "server/kitchen/read/contracts/kitchenQueryContracts.ts"
    );
    expect(contracts).toContain("KITCHEN_QUEUE_MAX_LIMIT = 200");
    const stream = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts"
    );
    expect(stream).toContain("limit: 200");
  });
});
