import type { OrderProjectionConsumerName } from "../../../projections/consumers/contracts/OrderProjectionConsumer";

export interface ProjectionConsumerIdempotencyStore {
  hasProcessed(consumerName: OrderProjectionConsumerName, eventId: string): Promise<boolean>;
  markProcessed(consumerName: OrderProjectionConsumerName, eventId: string): Promise<void>;
}

export class InMemoryProjectionConsumerIdempotencyStore
  implements ProjectionConsumerIdempotencyStore
{
  private readonly processed = new Set<string>();

  private key(consumerName: OrderProjectionConsumerName, eventId: string): string {
    return `${consumerName}:${eventId}`;
  }

  async hasProcessed(
    consumerName: OrderProjectionConsumerName,
    eventId: string
  ): Promise<boolean> {
    return this.processed.has(this.key(consumerName, eventId));
  }

  async markProcessed(
    consumerName: OrderProjectionConsumerName,
    eventId: string
  ): Promise<void> {
    this.processed.add(this.key(consumerName, eventId));
  }

  clear(): void {
    this.processed.clear();
  }
}
