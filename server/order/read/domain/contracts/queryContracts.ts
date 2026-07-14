/**
 * Shared read query contracts (READ-ARCHITECTURE-1 RA-03).
 * Phase 1: type definitions only — no tRPC exposure.
 */
import type { CategoryProjectionReadMeta } from "./categoryProjectionContracts";
import type { ProjectionId } from "./projectionIds";

export const ORDER_READ_QUERY_CATALOG_VERSION = 1 as const;

export const DEFAULT_ACTIVE_ORDER_PAGE_LIMIT = 50 as const;
export const MAX_ACTIVE_ORDER_PAGE_LIMIT = 100 as const;
export const DEFAULT_HISTORY_PAGE_LIMIT = 100 as const;

export type OrderReadQueryId =
  | "Q-01-list-active"
  | "Q-02-list-history"
  | "Q-03-get-detail"
  | "Q-04-get-timeline"
  | "Q-05-get-operational-kpis"
  | "Q-06-get-analytics-summary"
  | "Q-07-get-analytics-rollup"
  | "Q-08-get-public-status";

export type QueryProjectionBinding = {
  queryId: OrderReadQueryId;
  primaryProjectionId: ProjectionId;
};

export const ORDER_READ_QUERY_BINDINGS: readonly QueryProjectionBinding[] = [
  { queryId: "Q-01-list-active", primaryProjectionId: "P-02-active-orders" },
  { queryId: "Q-02-list-history", primaryProjectionId: "P-01-owner-orders" },
  { queryId: "Q-03-get-detail", primaryProjectionId: "P-03-order-details" },
  { queryId: "Q-04-get-timeline", primaryProjectionId: "P-04-order-timeline" },
  { queryId: "Q-05-get-operational-kpis", primaryProjectionId: "P-06-operational-kpi" },
  { queryId: "Q-06-get-analytics-summary", primaryProjectionId: "P-10-analytics" },
  { queryId: "Q-07-get-analytics-rollup", primaryProjectionId: "P-10-analytics" },
  { queryId: "Q-08-get-public-status", primaryProjectionId: "P-11-public-order-status" },
] as const;

export type PageInfo = {
  hasMore: boolean;
  nextCursor: string | null;
  limit: number;
};

export type ReadResultMeta = CategoryProjectionReadMeta & {
  generatedAt: string;
  projectionSchemaVersion: number;
  queryCatalogVersion: typeof ORDER_READ_QUERY_CATALOG_VERSION;
};

export type TenantScopedQuery = {
  restaurantId: number;
};

export type PaginatedQuery = {
  limit?: number;
  cursor?: string | null;
};

export type ActiveOrderListQuery = TenantScopedQuery &
  PaginatedQuery & {
    status?: "pending" | "preparing" | "ready" | "all-active";
  };

export type OrderHistoryListQuery = TenantScopedQuery &
  PaginatedQuery & {
    status?: string;
    from?: string;
    to?: string;
  };

export type OrderDetailQuery = {
  orderId: number;
  restaurantId: number;
};

export type OrderTimelineQuery = {
  orderId: number;
  restaurantId: number;
  limit?: number;
};

export type OperationalKpiQuery = TenantScopedQuery;

export type OrderAnalyticsSummaryQuery = TenantScopedQuery & {
  year?: number;
  month?: number;
};

export type OrderAnalyticsRollupQuery = TenantScopedQuery & {
  granularity: "day" | "month";
  year: number;
  month?: number;
};

export type PublicOrderStatusQuery = {
  trackingToken: string;
  slug: string;
};

import type { OrderCategoryProjection } from "./categoryProjectionContracts";
import type { OrderOfferProjection } from "./offerProjectionContracts";
import {
  ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
  ORDER_LINE_PROJECTION_TYPE_OFFER,
  type OrderLineProjectionType,
} from "./lineProjectionContracts";

export type MenuItemOrderLineItemDto = {
  projectionType: typeof ORDER_LINE_PROJECTION_TYPE_MENU_ITEM;
  lineItemId: number;
  menuItemId: number;
  nameAr: string;
  nameEn: string | null;
  quantity: number;
  price: string;
  /** Item Notes — belong exclusively to this line (ORDERING-NOTES-ARCHITECTURE-1). */
  itemNotes: string | null;
  category: OrderCategoryProjection;
};

export type OfferOrderLineItemDto = {
  projectionType: typeof ORDER_LINE_PROJECTION_TYPE_OFFER;
  lineItemId: number;
  menuItemId: 0;
  nameAr: string;
  nameEn: string | null;
  quantity: number;
  price: string;
  /** Item Notes — belong exclusively to this line (ORDERING-NOTES-ARCHITECTURE-1). */
  itemNotes: string | null;
  offer: OrderOfferProjection;
};

export type ActiveOrderLineItemDto = MenuItemOrderLineItemDto | OfferOrderLineItemDto;

export function isMenuItemOrderLine(
  item: ActiveOrderLineItemDto
): item is MenuItemOrderLineItemDto {
  return item.projectionType === ORDER_LINE_PROJECTION_TYPE_MENU_ITEM;
}

export function isOfferOrderLine(item: ActiveOrderLineItemDto): item is OfferOrderLineItemDto {
  return item.projectionType === ORDER_LINE_PROJECTION_TYPE_OFFER;
}

export function orderLineProjectionType(item: ActiveOrderLineItemDto): OrderLineProjectionType {
  return item.projectionType;
}

export type ActiveOrderItemDto = {
  orderId: number;
  orderNumber: string;
  businessDay: string | null;
  dailyDisplayNumber: number | null;
  displayOrderNumber: string;
  displayReference: string;
  status: string;
  lifecycle: string;
  tableNumber: number;
  sessionId: number | null;
  /** OPERATIONAL-FULFILMENT-PROJECTION-1 — projected fulfilment (ops consume these). */
  serviceMode: string;
  fulfilmentAnchorType: string;
  fulfilmentLabel: string;
  customerName: string | null;
  customerPhone: string | null;
  /**
   * Order Notes — belong to the complete order.
   * Field name `notes` retained for backward compatibility with existing clients.
   */
  notes: string | null;
  totalAmount: string;
  createdAt: string;
  readyAt: string | null;
  lineItems: ActiveOrderLineItemDto[];
};

export type ActiveOrderListResult = ReadResultMeta & {
  items: ActiveOrderItemDto[];
  pageInfo: PageInfo;
};

export type OwnerOrderDetailDto = ReadResultMeta & {
  order: ActiveOrderItemDto;
};

export type OrderTimelineEventDto = {
  eventId: string;
  fromStatus: string | null;
  toStatus: string;
  occurredAt: string;
};

export type OrderTimelineResult = ReadResultMeta & {
  orderId: number;
  events: OrderTimelineEventDto[];
};

export type StatusBreakdownRow = {
  status: string;
  count: number;
};

export type OperationalKpiDto = ReadResultMeta & {
  activeOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  statusBreakdown: StatusBreakdownRow[];
};

export type OrderAnalyticsSummaryDto = ReadResultMeta & {
  today: {
    totalOrders: number;
    completedOrders: number;
    completedSales: string;
  };
  month: {
    totalOrders: number;
    completedOrders: number;
    totalSales: string;
  };
};

export type AnalyticsRollupPeriodDto = {
  periodKey: string;
  orderCount: number;
  completedSales: string;
};

export type OrderAnalyticsRollupDto = ReadResultMeta & {
  granularity: "day" | "month";
  periods: AnalyticsRollupPeriodDto[];
};

export function clampActiveOrderLimit(limit: number | undefined): number {
  const value = limit ?? DEFAULT_ACTIVE_ORDER_PAGE_LIMIT;
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_ACTIVE_ORDER_PAGE_LIMIT;
  }
  return Math.min(Math.floor(value), MAX_ACTIVE_ORDER_PAGE_LIMIT);
}

export function buildReadResultMeta(
  projectionSchemaVersion: number,
  now: Date = new Date(),
  categoryMeta?: Partial<CategoryProjectionReadMeta>
): ReadResultMeta {
  return {
    generatedAt: now.toISOString(),
    projectionSchemaVersion,
    queryCatalogVersion: ORDER_READ_QUERY_CATALOG_VERSION,
    categoryProjectionVersion: categoryMeta?.categoryProjectionVersion ?? 0,
    projectionBuildDurationMs: categoryMeta?.projectionBuildDurationMs ?? 0,
    projectionIntegrity: categoryMeta?.projectionIntegrity ?? "valid",
  };
}
