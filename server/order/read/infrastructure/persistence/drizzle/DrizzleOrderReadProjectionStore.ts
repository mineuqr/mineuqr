import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import {
  orderReadAnalyticsDaily,
  orderReadOperationalKpiDaily,
  orderReadOrderLineItems,
  orderReadOrders,
  orderReadOrderTimeline,
  orderReadPublicOrderStatus,
} from "../../../../../../drizzle/schema";
import { ORDER_READ_PROJECTION_SCHEMA_VERSION } from "../../../domain/contracts/projectionIds";
import { clampActiveOrderLimit } from "../../../domain/contracts/queryContracts";
import {
  assertOrderLifecycleStage,
  DEFAULT_ORDER_LIFECYCLE_STAGE,
  isOperationalLifecycleStage,
} from "../../../../domain/value-objects/OrderLifecycleStage";
import type {
  ActiveOrderListQuery,
  OrderDetailQuery,
} from "../../../domain/contracts/queryContracts";
import type {
  OrderAnalyticsDayRecord,
  OrderTimelineProjectionRecord,
  OperationalKpiProjectionRecord,
  OwnerOrderProjectionRecord,
} from "../contracts/ProjectionRepositoryContracts";
import { InMemoryOrderReadProjectionStore } from "../inmemory/InMemoryOrderReadProjectionStore";
import type { OrderReadSourceContext } from "../OrderReadContextLoader";
import { drizzleCategoryResolutionPort } from "../DrizzleCategoryResolutionPort";
import { OrderCategoryProjectionBuilder } from "../../../projections/builders/OrderCategoryProjectionBuilder";
import { OrderReadLineItemProjectionBuilder } from "../../../projections/builders/OrderReadLineItemProjectionBuilder";
import { toPersistedLineItemColumns } from "../mapStoredOrderReadLineItem";

import type { OrderReadProjectionRepositories } from "../contracts/ProjectionRepositoryContracts";

export class DrizzleOrderReadProjectionStore {
  private readonly recordBuilder = new InMemoryOrderReadProjectionStore();
  private readonly lineItemBuilder = new OrderReadLineItemProjectionBuilder(
    new OrderCategoryProjectionBuilder(drizzleCategoryResolutionPort)
  );

  asRepositories(): OrderReadProjectionRepositories {
    return this.recordBuilder.asRepositories();
  }

  async persistFromSource(
    source: OrderReadSourceContext,
    eventId: string | null
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const lineItems = await this.lineItemBuilder.buildLineItemsFromSource(source);
    const record = this.recordBuilder.buildOwnerRecordFromSource(source, eventId, lineItems);
    const lifecycleStage = assertOrderLifecycleStage(
      source.order.lifecycleStage ?? DEFAULT_ORDER_LIFECYCLE_STAGE
    );
    const isActive = isOperationalLifecycleStage(lifecycleStage);

    await db
      .insert(orderReadOrders)
      .values({
        restaurantId: record.restaurantId,
        orderId: record.orderId,
        orderNumber: record.orderNumber,
        businessDay: record.businessDay,
        dailyDisplayNumber: record.dailyDisplayNumber,
        identityScope: record.identityScope,
        status: record.status as "pending" | "preparing" | "ready" | "served" | "cancelled",
        lifecycleStage,
        tableId: source.order.tableId,
        tableNumber: record.tableNumber,
        sessionId: record.sessionId,
        serviceMode: record.serviceMode,
        fulfilmentAnchorType: record.fulfilmentAnchorType,
        fulfilmentLabel: record.fulfilmentLabel,
        customerName: record.customerName,
        customerPhone: record.customerPhone,
        notes: record.notes,
        totalAmount: record.totalAmount,
        trackingToken: source.order.trackingToken,
        createdAt: record.createdAt,
        readyAt: record.readyAt,
        servedAt: record.servedAt,
        cancelledAt: record.cancelledAt,
        isActive,
        projectionSchemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
        lastEventId: record.lastEventId,
        updatedAt: record.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          orderNumber: record.orderNumber,
          businessDay: record.businessDay,
          dailyDisplayNumber: record.dailyDisplayNumber,
          identityScope: record.identityScope,
          status: record.status as "pending" | "preparing" | "ready" | "served" | "cancelled",
          lifecycleStage,
          tableNumber: record.tableNumber,
          sessionId: record.sessionId,
          serviceMode: record.serviceMode,
          fulfilmentAnchorType: record.fulfilmentAnchorType,
          fulfilmentLabel: record.fulfilmentLabel,
          customerName: record.customerName,
          customerPhone: record.customerPhone,
          notes: record.notes,
          totalAmount: record.totalAmount,
          trackingToken: source.order.trackingToken,
          readyAt: record.readyAt,
          servedAt: record.servedAt,
          cancelledAt: record.cancelledAt,
          isActive,
          projectionSchemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
          lastEventId: record.lastEventId,
          updatedAt: record.updatedAt,
        },
      });

    await db
      .delete(orderReadOrderLineItems)
      .where(
        and(
          eq(orderReadOrderLineItems.restaurantId, record.restaurantId),
          eq(orderReadOrderLineItems.orderId, record.orderId)
        )
      );

    if (record.lineItems.length > 0) {
      await db.insert(orderReadOrderLineItems).values(
        record.lineItems.map((li) => {
          const persisted = toPersistedLineItemColumns(li);
          return {
            restaurantId: record.restaurantId,
            orderId: record.orderId,
            lineItemId: li.lineItemId,
            menuItemId: persisted.menuItemId,
            nameAr: persisted.nameAr,
            nameEn: persisted.nameEn,
            quantity: persisted.quantity,
            price: persisted.price,
            itemNotes: persisted.itemNotes,
            modifiers: persisted.modifiers,
            lineProjectionType: persisted.lineProjectionType,
            categoryProjection: persisted.categoryProjection,
            offerProjection: persisted.offerProjection,
          };
        })
      );
    }

    if (source.order.trackingToken) {
      const itemCount = source.lineItems.reduce((sum, li) => sum + li.quantity, 0);
      await db
        .insert(orderReadPublicOrderStatus)
        .values({
          trackingToken: source.order.trackingToken,
          restaurantSlug: source.restaurantSlug,
          restaurantId: record.restaurantId,
          orderNumber: record.orderNumber,
          businessDay: record.businessDay,
          dailyDisplayNumber: record.dailyDisplayNumber,
          identityScope: record.identityScope,
          status: record.status,
          tableNumber: record.tableNumber,
          itemCount,
          totalAmount: record.totalAmount,
          createdAt: record.createdAt,
          readyAt: record.readyAt,
          projectionSchemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
          lastEventId: eventId,
          updatedAt: record.updatedAt,
        })
        .onDuplicateKeyUpdate({
          set: {
            status: record.status,
            tableNumber: record.tableNumber,
            itemCount,
            totalAmount: record.totalAmount,
            readyAt: record.readyAt,
            projectionSchemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
            lastEventId: eventId,
            updatedAt: record.updatedAt,
          },
        });
    }
  }

  async upsertTimeline(record: OrderTimelineProjectionRecord): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db
      .insert(orderReadOrderTimeline)
      .values({
        restaurantId: record.restaurantId,
        orderId: record.orderId,
        eventId: record.event.eventId,
        fromStatus: record.event.fromStatus,
        toStatus: record.event.toStatus,
        occurredAt: record.event.occurredAt,
        projectionSchemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
        lastEventId: record.lastEventId,
        updatedAt: record.updatedAt,
      })
      .onDuplicateKeyUpdate({ set: { updatedAt: record.updatedAt } });
  }

  async upsertKpi(record: OperationalKpiProjectionRecord): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db
      .insert(orderReadOperationalKpiDaily)
      .values({
        restaurantId: record.restaurantId,
        dayKey: record.dayKey,
        activeOrders: record.activeOrders,
        pendingOrders: record.pendingOrders,
        preparingOrders: record.preparingOrders,
        readyOrders: record.readyOrders,
        projectionSchemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
        lastEventId: record.lastEventId,
        updatedAt: record.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          activeOrders: record.activeOrders,
          pendingOrders: record.pendingOrders,
          preparingOrders: record.preparingOrders,
          readyOrders: record.readyOrders,
          projectionSchemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
          lastEventId: record.lastEventId,
          updatedAt: record.updatedAt,
        },
      });
  }

  async deleteKpiForRestaurant(restaurantId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db
      .delete(orderReadOperationalKpiDaily)
      .where(eq(orderReadOperationalKpiDaily.restaurantId, restaurantId));
  }

  async getAnalyticsDay(
    restaurantId: number,
    dayKey: string
  ): Promise<OrderAnalyticsDayRecord | null> {
    const db = await getDb();
    if (!db) return null;
    const [row] = await db
      .select()
      .from(orderReadAnalyticsDaily)
      .where(
        and(
          eq(orderReadAnalyticsDaily.restaurantId, restaurantId),
          eq(orderReadAnalyticsDaily.dayKey, dayKey)
        )
      )
      .limit(1);
    if (!row) return null;
    return {
      projectionId: "P-10-analytics",
      restaurantId: row.restaurantId,
      dayKey: row.dayKey,
      orderCount: Number(row.orderCount ?? 0),
      completedOrderCount: Number(row.completedOrderCount ?? 0),
      completedSales: String(row.completedSales ?? "0.00"),
      schemaVersion: Number(
        row.projectionSchemaVersion ?? ORDER_READ_PROJECTION_SCHEMA_VERSION
      ),
      lastEventId: row.lastEventId ?? null,
      updatedAt: String(row.updatedAt),
    };
  }

  async upsertAnalytics(record: OrderAnalyticsDayRecord): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db
      .insert(orderReadAnalyticsDaily)
      .values({
        restaurantId: record.restaurantId,
        dayKey: record.dayKey,
        orderCount: record.orderCount,
        completedOrderCount: record.completedOrderCount,
        completedSales: record.completedSales,
        projectionSchemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
        lastEventId: record.lastEventId,
        updatedAt: record.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          orderCount: record.orderCount,
          completedOrderCount: record.completedOrderCount,
          completedSales: record.completedSales,
          projectionSchemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
          lastEventId: record.lastEventId,
          updatedAt: record.updatedAt,
        },
      });
  }

  async deleteAnalyticsForRestaurant(restaurantId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db
      .delete(orderReadAnalyticsDaily)
      .where(eq(orderReadAnalyticsDaily.restaurantId, restaurantId));
  }
}
