import type { ProjectionId } from "../../../domain/contracts/projectionIds";
import type { ProjectionRecordMeta, TenantScopedProjectionKey } from "../../../domain/contracts/projectionContracts";
import type {
  ActiveOrderItemDto,
  ActiveOrderListQuery,
  OrderDetailQuery,
  OrderTimelineEventDto,
} from "../../../domain/contracts/queryContracts";

/**
 * Base projection repository — write path for consumers, read path for services.
 */
export interface ProjectionRepository<TRecord, TKey> {
  upsert(record: TRecord): Promise<void>;
  deleteByKey(key: TKey): Promise<void>;
  findByKey(key: TKey): Promise<TRecord | null>;
}

export type ActiveOrderProjectionKey = TenantScopedProjectionKey & {
  orderId: number;
};

export type OrderProjectionOrderRow = ActiveOrderItemDto &
  ProjectionRecordMeta & {
    servedAt: string | null;
    cancelledAt: string | null;
  };

export type ActiveOrderProjectionRecord = OrderProjectionOrderRow & {
  projectionId: "P-02-active-orders";
};

export interface ActiveOrdersProjectionRepository
  extends ProjectionRepository<ActiveOrderProjectionRecord, ActiveOrderProjectionKey> {
  findPage(query: ActiveOrderListQuery): Promise<ActiveOrderProjectionRecord[]>;
  countActive(restaurantId: number): Promise<number>;
}

export type OwnerOrderProjectionKey = ActiveOrderProjectionKey;

export type OwnerOrderProjectionRecord = OrderProjectionOrderRow & {
  projectionId: "P-01-owner-orders";
};

export interface OwnerOrdersProjectionRepository
  extends ProjectionRepository<OwnerOrderProjectionRecord, OwnerOrderProjectionKey> {
  findPage(query: ActiveOrderListQuery): Promise<OwnerOrderProjectionRecord[]>;
}

export type OrderDetailProjectionKey = ActiveOrderProjectionKey;

export type OrderDetailProjectionRecord = OrderProjectionOrderRow & {
  projectionId: "P-03-order-details";
};

export interface OrderDetailsProjectionRepository
  extends ProjectionRepository<OrderDetailProjectionRecord, OrderDetailProjectionKey> {
  getDetail(query: OrderDetailQuery): Promise<OrderDetailProjectionRecord | null>;
}

export type OrderTimelineProjectionKey = TenantScopedProjectionKey & {
  orderId: number;
  eventId: string;
};

export type OrderTimelineProjectionRecord = ProjectionRecordMeta & {
  projectionId: "P-04-order-timeline";
  orderId: number;
  event: OrderTimelineEventDto;
};

export interface OrderTimelineProjectionRepository
  extends ProjectionRepository<OrderTimelineProjectionRecord, OrderTimelineProjectionKey> {
  listByOrderId(orderId: number, restaurantId: number, limit?: number): Promise<OrderTimelineProjectionRecord[]>;
}

export type OperationalKpiProjectionKey = TenantScopedProjectionKey & {
  dayKey: string;
};

export type OperationalKpiProjectionRecord = ProjectionRecordMeta & {
  projectionId: "P-06-operational-kpi";
  dayKey: string;
  activeOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
};

export interface OperationalKpiProjectionRepository
  extends ProjectionRepository<OperationalKpiProjectionRecord, OperationalKpiProjectionKey> {
  getForDay(restaurantId: number, dayKey: string): Promise<OperationalKpiProjectionRecord | null>;
}

export type PublicOrderStatusProjectionKey = {
  trackingToken: string;
  restaurantSlug: string;
};

export type PublicOrderStatusProjectionRecord = ProjectionRecordMeta & {
  projectionId: "P-11-public-order-status";
  trackingToken: string;
  restaurantSlug: string;
  orderNumber: string;
  businessDay?: string | null;
  dailyDisplayNumber?: number | null;
  identityScope?: string | null;
  status: string;
  tableNumber: number;
  itemCount: number;
  totalAmount: string;
  createdAt: string;
  readyAt: string | null;
};

export interface PublicOrderStatusProjectionRepository
  extends ProjectionRepository<PublicOrderStatusProjectionRecord, PublicOrderStatusProjectionKey> {
  findByTrackingToken(
    trackingToken: string,
    restaurantSlug: string
  ): Promise<PublicOrderStatusProjectionRecord | null>;
}

export type OrderAnalyticsDayKey = TenantScopedProjectionKey & {
  dayKey: string;
};

export type OrderAnalyticsDayRecord = ProjectionRecordMeta & {
  projectionId: "P-10-analytics";
  dayKey: string;
  orderCount: number;
  completedOrderCount: number;
  completedSales: string;
};

export interface OrderAnalyticsProjectionRepository
  extends ProjectionRepository<OrderAnalyticsDayRecord, OrderAnalyticsDayKey> {
  getDay(restaurantId: number, dayKey: string): Promise<OrderAnalyticsDayRecord | null>;
  listDaysInMonth(restaurantId: number, year: number, month: number): Promise<OrderAnalyticsDayRecord[]>;
}

export type OrderReadProjectionRepositories = {
  activeOrders: ActiveOrdersProjectionRepository;
  ownerOrders: OwnerOrdersProjectionRepository;
  orderDetails: OrderDetailsProjectionRepository;
  orderTimeline: OrderTimelineProjectionRepository;
  operationalKpi: OperationalKpiProjectionRepository;
  publicOrderStatus: PublicOrderStatusProjectionRepository;
  orderAnalytics: OrderAnalyticsProjectionRepository;
};

export function assertProjectionId(
  record: { projectionId: ProjectionId },
  expected: ProjectionId
): void {
  if (record.projectionId !== expected) {
    throw new Error(`Projection id mismatch: expected ${expected}, got ${record.projectionId}`);
  }
}
