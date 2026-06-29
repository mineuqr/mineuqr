import type { OrderDomainEvent } from "../../../domain/events/OrderDomainEvents";
import type { OutboxAppendInput } from "../contracts/EventInfrastructureContracts";
import {
  buildEventEnvelope,
  extractAggregateIdFromEvent,
  extractOccurredAtFromEvent,
  extractRestaurantIdFromEvent,
} from "../serialization/domainEventSerializer";
import { newOutboxIds } from "../outbox/DrizzleOutboxRepository";

export function domainEventsToOutboxInputs(
  events: OrderDomainEvent[],
  options?: {
    correlationId?: string | null;
    causationId?: string | null;
    aggregateVersion?: number | null;
    restaurantId?: number;
  }
): OutboxAppendInput[] {
  return events.map((event) => {
    const { id, eventId } = newOutboxIds();
    return {
      envelope: buildEventEnvelope({
        id,
        eventId,
        event,
        aggregateId: extractAggregateIdFromEvent(event),
        restaurantId: extractRestaurantIdFromEvent(event, options?.restaurantId),
        sequenceNumber: 0,
        occurredAt: extractOccurredAtFromEvent(event),
        correlationId: options?.correlationId,
        causationId: options?.causationId,
        aggregateVersion: options?.aggregateVersion,
      }),
    };
  });
}
