import type { EventEnvelope, StoredOutboxRecord } from "../EventEnvelope";

export type OutboxAppendInput = {
  envelope: EventEnvelope;
};

export interface OutboxRepository {
  /** Append messages within an existing DB transaction (caller owns transaction). */
  appendInTransaction(
    tx: unknown,
    messages: OutboxAppendInput[]
  ): Promise<void>;

  /** Fetch pending messages eligible for relay (infrastructure only). */
  fetchPendingBatch(limit: number): Promise<StoredOutboxRecord[]>;

  /** Mark published — idempotent when already published. Returns false if lost race. */
  markPublished(outboxId: string, publishedAt: string): Promise<boolean>;

  /** Record failure and schedule retry or dead-letter (failed status). */
  markPublishFailed(
    outboxId: string,
    error: string,
    nextRetryAt: string | null,
    markDeadLetter: boolean
  ): Promise<void>;

  /** Count pending for queue depth metrics. */
  countPending(): Promise<number>;
}

export interface EventStore {
  getByAggregateId(aggregateId: number): Promise<EventEnvelope[]>;
}

export interface EventPublisher {
  /** Publish envelope to transport/dispatch layer. Must not contain business logic. */
  publish(envelope: EventEnvelope): Promise<void>;
}

export type RelayBatchResult = {
  processed: number;
  published: number;
  failed: number;
  skipped: number;
};

export interface EventRelay {
  processBatch(limit: number): Promise<RelayBatchResult>;
}
