/**
 * Canonical domain event envelope — transport-agnostic (ORDER-EVENTS-1A).
 * Not coupled to message broker, HTTP, or tRPC.
 */
export type EventEnvelopeStatus = "pending" | "published" | "failed";

export type EventEnvelope<TPayload = unknown> = {
  /** Outbox row primary key */
  id: string;
  /** Globally unique event identifier (idempotency key) */
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: number;
  /** Optional optimistic-lock / revision hint */
  aggregateVersion: number | null;
  restaurantId: number;
  /** Monotonic per-aggregate sequence for ordering */
  sequenceNumber: number;
  occurredAt: string;
  correlationId: string | null;
  causationId: string | null;
  payloadVersion: number;
  payload: TPayload;
};

export type PendingOutboxRecord = EventEnvelope & {
  status: "pending";
  publishAttempts: number;
  nextRetryAt: string | null;
};

export type StoredOutboxRecord = EventEnvelope & {
  status: EventEnvelopeStatus;
  publishAttempts: number;
  lastError: string | null;
  publishedAt: string | null;
  nextRetryAt: string | null;
  createdAt: string;
};

export const ORDER_AGGREGATE_TYPE = "Order";
