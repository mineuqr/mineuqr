import type { EventEnvelope } from "../../../infrastructure/events/EventEnvelope";
import type {
  ConsumerRegistryDispatchDelegate,
  OrderEventConsumerRegistry,
} from "../../../infrastructure/events/registry/OrderEventConsumerRegistry";
import type { RegistryDispatchResult } from "../../../infrastructure/events/consumers/contracts/OrderEventConsumer";
import type { OrderProjectionConsumerRegistry } from "./OrderProjectionConsumerRegistry";
import type { ProjectionRegistryDispatchResult } from "../../projections/consumers/contracts/OrderProjectionConsumer";
import {
  getOrderLifecycleLatencyContext,
  markOrderLifecycleLatency,
  noteOrderLifecyclePhase,
} from "../../../observability/orderLifecycleLatency";

export type CompositeDispatchResult = RegistryDispatchResult & {
  projection: ProjectionRegistryDispatchResult;
};

/**
 * Chains integration + projection dispatch without coupling consumer implementations.
 * Wired via eventInfrastructureComposition when projections are enabled (Phase 3B).
 */
export class CompositeEventDispatchDelegate implements ConsumerRegistryDispatchDelegate {
  constructor(
    private readonly integrationRegistry: OrderEventConsumerRegistry,
    private readonly projectionRegistry: OrderProjectionConsumerRegistry
  ) {}

  async dispatch(envelope: EventEnvelope): Promise<RegistryDispatchResult> {
    const integrationStarted = Date.now();
    const integrationResult = await this.integrationRegistry.dispatch(envelope);
    const integrationMs = Date.now() - integrationStarted;

    const projectionStarted = Date.now();
    const projectionResult = await this.projectionRegistry.dispatchProjections(envelope);
    const projectionMs = Date.now() - projectionStarted;
    void projectionResult;

    if (getOrderLifecycleLatencyContext()) {
      noteOrderLifecyclePhase("integration_dispatch_ms", integrationMs);
      noteOrderLifecyclePhase("projection_dispatch_ms", projectionMs);
      markOrderLifecycleLatency("integration_dispatch");
      markOrderLifecycleLatency("projection_dispatch");
    }

    return integrationResult;
  }

  async dispatchWithDetails(envelope: EventEnvelope): Promise<CompositeDispatchResult> {
    const integration = await this.integrationRegistry.dispatch(envelope);
    const projection = await this.projectionRegistry.dispatchProjections(envelope);
    return { ...integration, projection };
  }
}
