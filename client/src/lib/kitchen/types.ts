import type { OrderCategoryProjection, CategoryProjectionReadMeta } from "./categoryProjection";

export type KitchenPipelineStatus = "pending" | "preparing" | "ready";

export type KitchenUrgencyTier = "normal" | "elevated" | "critical";

export type KitchenTicketDto = {
  orderId: number;
  orderNumber: string;
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
  lineItems: Array<{
    lineItemId: number;
    menuItemId: number;
    nameAr: string;
    nameEn: string | null;
    quantity: number;
    price: string;
    category: OrderCategoryProjection;
  }>;
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
