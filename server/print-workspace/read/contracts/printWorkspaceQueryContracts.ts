import {
  ORDER_READ_QUERY_CATALOG_VERSION,
  buildReadResultMeta,
  clampActiveOrderLimit,
  type ActiveOrderLineItemDto,
  type PageInfo,
  type ReadResultMeta,
} from "../../../order/read/domain/contracts/queryContracts";
import { ORDER_READ_PROJECTION_SCHEMA_VERSION } from "../../../order/read/domain/contracts/projectionIds";

export const PRINT_WORKSPACE_QUERY_CATALOG_VERSION = 1 as const;

export type PrintWorkspaceViewFilter = "awaiting" | "completed" | "all";

export type PrintWorkspaceListQuery = {
  restaurantId: number;
  view?: PrintWorkspaceViewFilter;
  status?: "pending" | "preparing" | "ready" | "served" | "cancelled";
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string | null;
};

export type PrintWorkspaceOrderDetailQuery = {
  restaurantId: number;
  orderId: number;
};

export type PrintWorkspaceOrderDto = {
  orderId: number;
  orderNumber: string;
  status: string;
  tableNumber: number;
  sessionId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  totalAmount: string;
  createdAt: string;
  readyAt: string | null;
  servedAt: string | null;
  isActive: boolean;
  lineItems: ActiveOrderLineItemDto[];
};

export type PrintWorkspaceTimelineEventDto = {
  eventId: string;
  fromStatus: string | null;
  toStatus: string;
  occurredAt: string;
};

export type PrintWorkspaceOrderListResult = ReadResultMeta & {
  items: PrintWorkspaceOrderDto[];
  pageInfo: PageInfo;
};

export type PrintWorkspaceOrderDetailResult = ReadResultMeta & {
  order: PrintWorkspaceOrderDto;
  timeline: PrintWorkspaceTimelineEventDto[];
  printJobs: PrintWorkspacePrintJobDto[];
};

export type PrintWorkspacePrintAttemptDto = {
  attemptNumber: number;
  status: string;
  outcome: string;
  errorMessage: string | null;
  createdAt: string;
};

export type PrintWorkspacePrintJobDto = {
  id: number;
  status: string;
  source: string;
  attemptCount: number;
  lastError: string | null;
  printerName: string | null;
  createdAt: string;
  dispatchedAt: string | null;
  printingAt: string | null;
  completedAt: string | null;
  attempts: PrintWorkspacePrintAttemptDto[];
};

export type PrintWorkspacePreviewTicketResult = ReadResultMeta & {
  payload: Record<string, unknown>;
};

export function clampPrintWorkspaceLimit(limit: number | undefined): number {
  return clampActiveOrderLimit(limit);
}

export function buildPrintWorkspaceMeta(now: Date = new Date()): ReadResultMeta {
  return {
    ...buildReadResultMeta(ORDER_READ_PROJECTION_SCHEMA_VERSION, now),
    queryCatalogVersion: ORDER_READ_QUERY_CATALOG_VERSION,
  };
}
