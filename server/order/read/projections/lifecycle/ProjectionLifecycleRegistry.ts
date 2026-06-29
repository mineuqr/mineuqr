import type { ProjectionDefinition } from "../../domain/contracts/projectionContracts";
import {
  ORDER_READ_PROJECTION_SCHEMA_VERSION,
  type ProjectionId,
} from "../../domain/contracts/projectionIds";

const ORDER_DOMAIN_EVENT_TYPES = [
  "OrderCreated",
  "OrderStatusChanged",
  "OrderReady",
  "OrderCompleted",
  "OrderCancelled",
] as const;

/**
 * Canonical projection catalog (READ-ARCHITECTURE-1 RA-02).
 * Phase 2: order-read projections in `queryable` state — store + consumers + dispatch active (Phase 3B).
 */
export const ORDER_PROJECTION_DEFINITIONS: readonly ProjectionDefinition[] = [
  {
    id: "P-01-owner-orders",
    name: "Owner Orders",
    ownerModule: "server/order/read",
    lifecycleState: "queryable",
    schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
    subscribedEventTypes: ORDER_DOMAIN_EVENT_TYPES,
    consumerName: "OwnerOrdersProjectionConsumer",
  },
  {
    id: "P-02-active-orders",
    name: "Active Orders",
    ownerModule: "server/order/read",
    lifecycleState: "queryable",
    schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
    subscribedEventTypes: ORDER_DOMAIN_EVENT_TYPES,
    consumerName: "ActiveOrdersProjectionConsumer",
  },
  {
    id: "P-03-order-details",
    name: "Order Details",
    ownerModule: "server/order/read",
    lifecycleState: "queryable",
    schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
    subscribedEventTypes: ORDER_DOMAIN_EVENT_TYPES,
    consumerName: "OrderDetailsProjectionConsumer",
  },
  {
    id: "P-04-order-timeline",
    name: "Order Timeline",
    ownerModule: "server/order/read",
    lifecycleState: "queryable",
    schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
    subscribedEventTypes: ["OrderCreated", "OrderStatusChanged", "OrderReady", "OrderCompleted", "OrderCancelled"],
    consumerName: "OrderTimelineProjectionConsumer",
  },
  {
    id: "P-05-dashboard",
    name: "Dashboard Overview",
    ownerModule: "server/ops",
    lifecycleState: "queryable",
    schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
    subscribedEventTypes: ORDER_DOMAIN_EVENT_TYPES,
    consumerName: "DashboardOverviewProjectionConsumer",
  },
  {
    id: "P-06-operational-kpi",
    name: "Operational KPI",
    ownerModule: "server/order/read",
    lifecycleState: "queryable",
    schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
    subscribedEventTypes: ORDER_DOMAIN_EVENT_TYPES,
    consumerName: "OperationalKpiProjectionConsumer",
  },
  {
    id: "P-07-kitchen-queue",
    name: "Kitchen Queue",
    ownerModule: "server/kitchen/read",
    lifecycleState: "defined",
    schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
    subscribedEventTypes: ["OrderCreated", "OrderStatusChanged", "OrderReady", "OrderCancelled"],
    consumerName: "KitchenQueueProjectionConsumer",
  },
  {
    id: "P-08-printing-queue",
    name: "Printing Queue",
    ownerModule: "server/printing/read",
    lifecycleState: "defined",
    schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
    subscribedEventTypes: ["OrderCreated", "OrderReady"],
    consumerName: "PrintingQueueProjectionConsumer",
  },
  {
    id: "P-09-settlement",
    name: "Settlement",
    ownerModule: "server/analytics",
    lifecycleState: "queryable",
    schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
    subscribedEventTypes: [],
    consumerName: null,
  },
  {
    id: "P-10-analytics",
    name: "Order Analytics",
    ownerModule: "server/analytics/order",
    lifecycleState: "queryable",
    schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
    subscribedEventTypes: ["OrderCreated", "OrderCompleted"],
    consumerName: "OrderAnalyticsProjectionConsumer",
  },
  {
    id: "P-11-public-order-status",
    name: "Public Order Status",
    ownerModule: "server/order/read",
    lifecycleState: "queryable",
    schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
    subscribedEventTypes: ORDER_DOMAIN_EVENT_TYPES,
    consumerName: "PublicOrderStatusProjectionConsumer",
  },
  {
    id: "P-12-session-workspace",
    name: "Session Workspace",
    ownerModule: "server/diningSession",
    lifecycleState: "queryable",
    schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
    subscribedEventTypes: [],
    consumerName: null,
  },
] as const;

export class ProjectionLifecycleRegistry {
  private readonly definitions = new Map<ProjectionId, ProjectionDefinition>();

  constructor(seed: readonly ProjectionDefinition[] = ORDER_PROJECTION_DEFINITIONS) {
    for (const definition of seed) {
      this.definitions.set(definition.id, definition);
    }
  }

  getDefinition(id: ProjectionId): ProjectionDefinition | undefined {
    return this.definitions.get(id);
  }

  listDefinitions(): ProjectionDefinition[] {
    return Array.from(this.definitions.values());
  }

  listByLifecycleState(state: ProjectionDefinition["lifecycleState"]): ProjectionDefinition[] {
    return this.listDefinitions().filter((d) => d.lifecycleState === state);
  }

  listMaterializingCandidates(): ProjectionDefinition[] {
    return this.listDefinitions().filter(
      (d) =>
        (d.lifecycleState === "infrastructure" || d.lifecycleState === "materializing") &&
        d.consumerName != null
    );
  }
}

export const orderProjectionLifecycleRegistry = new ProjectionLifecycleRegistry();
