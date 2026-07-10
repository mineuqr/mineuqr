import {
  ORDER_READ_QUERY_CATALOG_VERSION,
  buildReadResultMeta,
  isMenuItemOrderLine,
  type ActiveOrderLineItemDto,
  type ReadResultMeta,
} from "../../../order/read/domain/contracts/queryContracts";
import { maxCategoryProjectionVersion } from "../../../order/read/domain/contracts/categoryProjectionContracts";
import { ORDER_READ_PROJECTION_SCHEMA_VERSION } from "../../../order/read/domain/contracts/projectionIds";

export const KITCHEN_READ_QUERY_CATALOG_VERSION = 1 as const;
export const KITCHEN_QUEUE_DEFAULT_LIMIT = 200 as const;
export const KITCHEN_QUEUE_MAX_LIMIT = 200 as const;
export const KITCHEN_ORDERING_POLICY_FIFO = "fifo-by-created-at" as const;

export type KitchenPipelineStatus = "pending" | "preparing" | "ready";
export type KitchenQueueStatusFilter = KitchenPipelineStatus | "all";

export type KitchenQueueQuery = {
  restaurantId: number;
  status?: KitchenQueueStatusFilter;
  limit?: number;
};

export type KitchenTicketLineItemDto = ActiveOrderLineItemDto;

export type KitchenUrgencyTier = "normal" | "elevated" | "critical";

export type KitchenTicketDto = {
  orderId: number;
  orderNumber: string;
  businessDay: string | null;
  dailyDisplayNumber: number | null;
  displayOrderNumber: string;
  displayReference: string;
  tableNumber: number;
  sessionId: number | null;
  customerName: string | null;
  orderNotes: string | null;
  status: KitchenPipelineStatus;
  totalAmount: string;
  createdAt: string;
  readyAt: string | null;
  statusEnteredAt: string;
  elapsedSeconds: number;
  columnElapsedSeconds: number;
  urgencyTier: KitchenUrgencyTier;
  lineCount: number;
  linesSummary: string;
  lineItems: KitchenTicketLineItemDto[];
  lastEventId: string | null;
};

export type KitchenQueueColumns = {
  pending: KitchenTicketDto[];
  preparing: KitchenTicketDto[];
  ready: KitchenTicketDto[];
};

export type KitchenQueueMeta = {
  totalVisible: number;
  counts: {
    pending: number;
    preparing: number;
    ready: number;
  };
};

export type KitchenQueueResult = ReadResultMeta & {
  orderingPolicyId: typeof KITCHEN_ORDERING_POLICY_FIFO;
  tickets: KitchenTicketDto[];
  columns: KitchenQueueColumns;
  meta: KitchenQueueMeta;
};

export function clampKitchenQueueLimit(limit: number | undefined): number {
  const value = limit ?? KITCHEN_QUEUE_DEFAULT_LIMIT;
  if (!Number.isFinite(value) || value <= 0) {
    return KITCHEN_QUEUE_DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(value), KITCHEN_QUEUE_MAX_LIMIT);
}

export function buildKitchenReadMeta(
  now: Date = new Date(),
  options?: { buildDurationMs?: number; lineItems?: readonly ActiveOrderLineItemDto[] }
): ReadResultMeta & {
  orderingPolicyId: typeof KITCHEN_ORDERING_POLICY_FIFO;
} {
  const categories =
    options?.lineItems?.filter(isMenuItemOrderLine).map((item) => item.category) ?? [];
  return {
    ...buildReadResultMeta(ORDER_READ_PROJECTION_SCHEMA_VERSION, now, {
      categoryProjectionVersion: maxCategoryProjectionVersion(categories),
      projectionBuildDurationMs: options?.buildDurationMs ?? 0,
      projectionIntegrity: "valid",
    }),
    queryCatalogVersion: ORDER_READ_QUERY_CATALOG_VERSION,
    orderingPolicyId: KITCHEN_ORDERING_POLICY_FIFO,
  };
}
