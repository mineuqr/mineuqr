/**
 * PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1
 * In-memory Collection Fact store for the controlled test / shadow harness.
 * Unique constraints match payment_collection_facts (intent + idempotency).
 */

import { CollectionFactError } from "@shared/operational-session/payment/collection-fact";
import type { CollectionFact } from "@shared/operational-session/payment/collection-fact";
import { freezeCollectionFact } from "./collectionFactImmutability";
import type { CollectionFactStore } from "./collectionFactStore";

function idempotencyKeyOf(fact: Pick<CollectionFact, "restaurantId" | "idempotencyKey">): string {
  return `${fact.restaurantId}::${fact.idempotencyKey}`;
}

function intentKeyOf(fact: Pick<CollectionFact, "restaurantId" | "paymentIntentId">): string {
  return `${fact.restaurantId}::${fact.paymentIntentId}`;
}

export class InMemoryCollectionFactStore implements CollectionFactStore {
  private readonly facts = new Map<string, CollectionFact>();
  private readonly byIdempotency = new Map<string, string>();
  private readonly byIntent = new Map<string, string>();
  private chain: Promise<void> = Promise.resolve();

  private async withLock<T>(fn: () => T | Promise<T>): Promise<T> {
    let release: () => void = () => undefined;
    const previous = this.chain;
    this.chain = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  async insert(fact: CollectionFact): Promise<CollectionFact> {
    return this.withLock(() => {
      if (this.facts.has(fact.collectionFactId)) {
        throw new CollectionFactError("DUPLICATE", "Collection Fact id already exists");
      }
      const idempotencyKey = idempotencyKeyOf(fact);
      const intentKey = intentKeyOf(fact);
      if (this.byIdempotency.has(idempotencyKey) || this.byIntent.has(intentKey)) {
        throw new CollectionFactError("DUPLICATE", "Collection Fact already exists");
      }
      const stored = freezeCollectionFact(fact);
      this.facts.set(stored.collectionFactId, stored);
      this.byIdempotency.set(idempotencyKey, stored.collectionFactId);
      this.byIntent.set(intentKey, stored.collectionFactId);
      return stored;
    });
  }

  async findByIdempotency(input: {
    restaurantId: number;
    idempotencyKey: string;
  }): Promise<CollectionFact | null> {
    const id = this.byIdempotency.get(
      idempotencyKeyOf({
        restaurantId: input.restaurantId,
        idempotencyKey: input.idempotencyKey,
      })
    );
    return id ? this.facts.get(id) ?? null : null;
  }

  async findByPaymentIntent(input: {
    restaurantId: number;
    paymentIntentId: string;
  }): Promise<CollectionFact | null> {
    const id = this.byIntent.get(
      intentKeyOf({
        restaurantId: input.restaurantId,
        paymentIntentId: input.paymentIntentId,
      })
    );
    return id ? this.facts.get(id) ?? null : null;
  }

  async findByFactId(input: {
    restaurantId: number;
    collectionFactId: string;
  }): Promise<CollectionFact | null> {
    const fact = this.facts.get(input.collectionFactId) ?? null;
    if (!fact || fact.restaurantId !== input.restaurantId) return null;
    return fact;
  }

  snapshot(): readonly CollectionFact[] {
    return [...this.facts.values()];
  }
}
