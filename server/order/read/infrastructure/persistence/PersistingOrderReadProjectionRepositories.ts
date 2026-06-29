import type {
  OrderAnalyticsDayRecord,
  OrderReadProjectionRepositories,
  OrderTimelineProjectionRecord,
  OperationalKpiProjectionRecord,
  OwnerOrderProjectionRecord,
  PublicOrderStatusProjectionRecord,
} from "./contracts/ProjectionRepositoryContracts";
import type { OrderReadContextLoader } from "./OrderReadContextLoader";
import { DrizzleOrderReadProjectionStore } from "./drizzle/DrizzleOrderReadProjectionStore";

/**
 * Decorator — mirrors in-memory upserts to Drizzle projection tables.
 * Phase 2: used by backfill and (future) live materializers when dispatch is enabled.
 */
export function createPersistingProjectionRepositories(
  inner: OrderReadProjectionRepositories,
  drizzle: DrizzleOrderReadProjectionStore,
  loader: OrderReadContextLoader
): OrderReadProjectionRepositories {
  return {
    ownerOrders: {
      ...inner.ownerOrders,
      upsert: async (record: OwnerOrderProjectionRecord) => {
        await inner.ownerOrders.upsert(record);
        const source = await loader.loadByOrderId(record.orderId);
        if (source) await drizzle.persistFromSource(source, record.lastEventId);
      },
    },
    activeOrders: {
      ...inner.activeOrders,
      upsert: async (record) => {
        await inner.activeOrders.upsert(record);
      },
    },
    orderDetails: {
      ...inner.orderDetails,
      upsert: async (record) => {
        await inner.orderDetails.upsert(record);
      },
    },
    orderTimeline: {
      ...inner.orderTimeline,
      upsert: async (record: OrderTimelineProjectionRecord) => {
        await inner.orderTimeline.upsert(record);
        await drizzle.upsertTimeline(record);
      },
    },
    operationalKpi: {
      ...inner.operationalKpi,
      upsert: async (record: OperationalKpiProjectionRecord) => {
        await inner.operationalKpi.upsert(record);
        await drizzle.upsertKpi(record);
      },
    },
    publicOrderStatus: {
      ...inner.publicOrderStatus,
      upsert: async (record: PublicOrderStatusProjectionRecord) => {
        await inner.publicOrderStatus.upsert(record);
      },
    },
    orderAnalytics: {
      ...inner.orderAnalytics,
      upsert: async (record: OrderAnalyticsDayRecord) => {
        await inner.orderAnalytics.upsert(record);
        await drizzle.upsertAnalytics(record);
      },
    },
  };
}
