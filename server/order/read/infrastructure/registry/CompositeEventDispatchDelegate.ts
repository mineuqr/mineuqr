import type { EventEnvelope } from "../../../infrastructure/events/EventEnvelope";
import type {
  ConsumerRegistryDispatchDelegate,
  OrderEventConsumerRegistry,
} from "../../../infrastructure/events/registry/OrderEventConsumerRegistry";
import type { RegistryDispatchResult } from "../../../infrastructure/events/consumers/contracts/OrderEventConsumer";
import type { OrderProjectionConsumerRegistry } from "./OrderProjectionConsumerRegistry";
import type { ProjectionRegistryDispatchResult } from "../../projections/consumers/contracts/OrderProjectionConsumer";

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
    const integrationResult = await this.integrationRegistry.dispatch(envelope);
    const projectionResult = await this.projectionRegistry.dispatchProjections(envelope);
    void projectionResult;
    return integrationResult;
  }

  async dispatchWithDetails(envelope: EventEnvelope): Promise<CompositeDispatchResult> {
    const integration = await this.integrationRegistry.dispatch(envelope);
    const projection = await this.projectionRegistry.dispatchProjections(envelope);
    return { ...integration, projection };
  }
}
