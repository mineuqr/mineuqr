import type { CategoryProjectionReadMeta } from "./categoryProjection";
import type { KitchenLineItemDto } from "./lineProjection";

export type KitchenPipelineStatus = "pending" | "preparing" | "ready";

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
  /** OPERATIONAL-FULFILMENT-PROJECTION-1 — ops presentation consumes these. */
  serviceMode: string;
  fulfilmentAnchorType: string;
  fulfilmentLabel: string;
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
  lineItems: KitchenLineItemDto[];
  lastEventId: string | null;
};

export type KitchenQueueColumns = {
  pending: KitchenTicketDto[];
  preparing: KitchenTicketDto[];
  ready: KitchenTicketDto[];
};

export type KitchenQueueResult = CategoryProjectionReadMeta & {
  generatedAt: string;
  projectionSchemaVersion: number;
  queryCatalogVersion: number;
  orderingPolicyId: string;
  tickets: KitchenTicketDto[];
  columns: KitchenQueueColumns;
  meta: {
    totalVisible: number;
    counts: {
      pending: number;
      preparing: number;
      ready: number;
    };
  };
};
