import type { OrderEventConsumerName } from "../contracts/OrderEventConsumer";

export interface ConsumerIdempotencyStore {
  hasProcessed(consumerName: OrderEventConsumerName, eventId: string): Promise<boolean>;
  markProcessed(consumerName: OrderEventConsumerName, eventId: string): Promise<void>;
}

export class InMemoryConsumerIdempotencyStore implements ConsumerIdempotencyStore {
  private readonly processed = new Set<string>();

  private key(consumerName: OrderEventConsumerName, eventId: string): string {
    return `${consumerName}:${eventId}`;
  }

  async hasProcessed(consumerName: OrderEventConsumerName, eventId: string): Promise<boolean> {
    return this.processed.has(this.key(consumerName, eventId));
  }

  async markProcessed(consumerName: OrderEventConsumerName, eventId: string): Promise<void> {
    this.processed.add(this.key(consumerName, eventId));
  }

  clear(): void {
    this.processed.clear();
  }
}
