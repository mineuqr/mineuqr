/**
 * PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1
 * Collection Fact persistence port. Insert + retrieve only.
 */

import type { CollectionFact } from "@shared/operational-session/payment/collection-fact";

export type CollectionFactStore = {
  insert(fact: CollectionFact): Promise<CollectionFact>;
  findByIdempotency(input: {
    restaurantId: number;
    idempotencyKey: string;
  }): Promise<CollectionFact | null>;
  findByPaymentIntent(input: {
    restaurantId: number;
    paymentIntentId: string;
  }): Promise<CollectionFact | null>;
  findByFactId(input: {
    restaurantId: number;
    collectionFactId: string;
  }): Promise<CollectionFact | null>;
};
