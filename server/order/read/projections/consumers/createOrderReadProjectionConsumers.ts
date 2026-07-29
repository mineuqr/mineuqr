import type { EventEnvelope } from "../../../infrastructure/events/EventEnvelope";
import type {
  OrderProjectionConsumer,
  OrderProjectionConsumerName,
} from "../consumers/contracts/OrderProjectionConsumer";
import type { ProjectionId } from "../../domain/contracts/projectionIds";
import type { OrderReadProjectionMaterializer } from "../materializers/OrderReadProjectionMaterializer";
import { publishOrdersRealtimeHintAfterProjection } from "../../realtime/publishOrdersRealtimeHintAfterProjection";
import { publishKitchenRealtimeHintAfterProjection } from "../../realtime/publishKitchenRealtimeHintAfterProjection";

type ConsumerSpec = {
  name: OrderProjectionConsumerName;
  projectionId: ProjectionId;
  eventTypes: readonly string[];
  handle: (materializer: OrderReadProjectionMaterializer, envelope: EventEnvelope) => Promise<void>;
};

const LIFECYCLE_STAGE_EVENT = "OrderLifecycleStageChanged" as const;

const CONSUMER_SPECS: ConsumerSpec[] = [
  {
    name: "OwnerOrdersProjectionConsumer",
    projectionId: "P-01-owner-orders",
    eventTypes: [
      "OrderCreated",
      "OrderStatusChanged",
      "OrderReady",
      "OrderCompleted",
      "OrderCancelled",
      LIFECYCLE_STAGE_EVENT,
    ],
    handle: async (m, e) => {
      await m.syncOrderProjections(resolveOrderId(e), e.eventId);
    },
  },
  {
    name: "ActiveOrdersProjectionConsumer",
    projectionId: "P-02-active-orders",
    eventTypes: [
      "OrderCreated",
      "OrderStatusChanged",
      "OrderReady",
      "OrderCompleted",
      "OrderCancelled",
      LIFECYCLE_STAGE_EVENT,
    ],
    handle: async (m, e) => {
      await m.syncOrderProjections(resolveOrderId(e), e.eventId);
      // REALTIME-ORDERS-ADOPTION-1 — orders channel after durable P-02 sync.
      await publishOrdersRealtimeHintAfterProjection(e);
      // REALTIME-KITCHEN-ADOPTION-1 — kitchen channel after same durable sync.
      await publishKitchenRealtimeHintAfterProjection(e);
    },
  },
  {
    name: "OrderDetailsProjectionConsumer",
    projectionId: "P-03-order-details",
    eventTypes: [
      "OrderCreated",
      "OrderStatusChanged",
      "OrderReady",
      "OrderCompleted",
      "OrderCancelled",
      LIFECYCLE_STAGE_EVENT,
    ],
    handle: async (m, e) => {
      await m.syncOrderProjections(resolveOrderId(e), e.eventId);
    },
  },
  {
    name: "OrderTimelineProjectionConsumer",
    projectionId: "P-04-order-timeline",
    eventTypes: [
      "OrderCreated",
      "OrderStatusChanged",
      "OrderReady",
      "OrderCompleted",
      "OrderCancelled",
    ],
    handle: async (m, e) => {
      await m.appendTimeline(e);
    },
  },
  {
    name: "OperationalKpiProjectionConsumer",
    projectionId: "P-06-operational-kpi",
    eventTypes: ["OrderCreated", "OrderStatusChanged", "OrderCompleted", "OrderCancelled", LIFECYCLE_STAGE_EVENT],
    handle: async (m, e) => {
      await m.adjustOperationalKpi(e);
    },
  },
  {
    name: "OrderAnalyticsProjectionConsumer",
    projectionId: "P-10-analytics",
    eventTypes: ["OrderCreated", "OrderCompleted"],
    handle: async (m, e) => {
      await m.adjustAnalytics(e);
    },
  },
  {
    name: "PublicOrderStatusProjectionConsumer",
    projectionId: "P-11-public-order-status",
    eventTypes: [
      "OrderCreated",
      "OrderStatusChanged",
      "OrderReady",
      "OrderCompleted",
      "OrderCancelled",
      LIFECYCLE_STAGE_EVENT,
    ],
    handle: async (m, e) => {
      await m.syncOrderProjections(resolveOrderId(e), e.eventId);
    },
  },
];

function resolveOrderId(envelope: EventEnvelope): number {
  const payload = envelope.payload as { orderId?: number };
  return payload.orderId ?? envelope.aggregateId;
}

export function createOrderReadProjectionConsumers(
  materializer: OrderReadProjectionMaterializer
): OrderProjectionConsumer[] {
  return CONSUMER_SPECS.map((spec) => ({
    name: spec.name,
    projectionId: spec.projectionId,
    subscribedEventTypes: spec.eventTypes,
    handle: (envelope: EventEnvelope) => spec.handle(materializer, envelope),
  }));
}

export { CONSUMER_SPECS };
