/**
 * P10-ORDER-COMPLETION-IDEMPOTENCY-1 — durable once-per-order completion marker for P-10.
 *
 * Reuses order_domain_consumer_processed with a dedicated consumer namespace.
 * Key is business identity (restaurantId + orderId), not eventId — so duplicate
 * OrderCompleted publications with distinct eventIds cannot inflate analytics.
 */

import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orderDomainConsumerProcessed } from "../../../../../drizzle/schema";

/** Distinct from OrderAnalyticsProjectionConsumer (eventId-scoped). */
export const P10_ANALYTICS_COMPLETION_CONSUMER = "P10AnalyticsOrderCompletion";

/**
 * Stable business completion identity (fits eventId varchar(36)).
 * Format: `c:{restaurantId}:{orderId}`
 */
export function p10CompletionIdempotencyKey(
  restaurantId: number,
  orderId: number
): string {
  return `c:${restaurantId}:${orderId}`;
}

export interface P10AnalyticsCompletionIdempotencyStore {
  hasAppliedCompletion(
    restaurantId: number,
    orderId: number
  ): Promise<boolean>;
  /**
   * Atomically claim a completion. Returns true only on first successful claim.
   * Callers must apply analytics deltas only when this returns true.
   */
  tryClaimCompletion(
    restaurantId: number,
    orderId: number
  ): Promise<boolean>;
  markCompletionApplied(
    restaurantId: number,
    orderId: number
  ): Promise<void>;
}

export class InMemoryP10AnalyticsCompletionIdempotencyStore
  implements P10AnalyticsCompletionIdempotencyStore
{
  private readonly applied = new Set<string>();

  async hasAppliedCompletion(
    restaurantId: number,
    orderId: number
  ): Promise<boolean> {
    return this.applied.has(p10CompletionIdempotencyKey(restaurantId, orderId));
  }

  async tryClaimCompletion(
    restaurantId: number,
    orderId: number
  ): Promise<boolean> {
    const key = p10CompletionIdempotencyKey(restaurantId, orderId);
    if (this.applied.has(key)) return false;
    this.applied.add(key);
    return true;
  }

  async markCompletionApplied(
    restaurantId: number,
    orderId: number
  ): Promise<void> {
    this.applied.add(p10CompletionIdempotencyKey(restaurantId, orderId));
  }

  clear(): void {
    this.applied.clear();
  }
}

/**
 * Durable store — same table as projection consumer idempotency, separate namespace.
 */
export class DrizzleP10AnalyticsCompletionIdempotencyStore
  implements P10AnalyticsCompletionIdempotencyStore
{
  constructor(
    private readonly fallback = new InMemoryP10AnalyticsCompletionIdempotencyStore()
  ) {}

  async hasAppliedCompletion(
    restaurantId: number,
    orderId: number
  ): Promise<boolean> {
    const eventId = p10CompletionIdempotencyKey(restaurantId, orderId);
    let db: Awaited<ReturnType<typeof getDb>> = null;
    try {
      db = await getDb();
    } catch {
      db = null;
    }
    if (!db) {
      return this.fallback.hasAppliedCompletion(restaurantId, orderId);
    }

    const [row] = await db
      .select()
      .from(orderDomainConsumerProcessed)
      .where(
        and(
          eq(
            orderDomainConsumerProcessed.consumerName,
            P10_ANALYTICS_COMPLETION_CONSUMER
          ),
          eq(orderDomainConsumerProcessed.eventId, eventId)
        )
      )
      .limit(1);

    return row != null;
  }

  async tryClaimCompletion(
    restaurantId: number,
    orderId: number
  ): Promise<boolean> {
    const eventId = p10CompletionIdempotencyKey(restaurantId, orderId);
    let db: Awaited<ReturnType<typeof getDb>> = null;
    try {
      db = await getDb();
    } catch {
      db = null;
    }
    if (!db) {
      return this.fallback.tryClaimCompletion(restaurantId, orderId);
    }

    try {
      await db.insert(orderDomainConsumerProcessed).values({
        consumerName: P10_ANALYTICS_COMPLETION_CONSUMER,
        eventId,
      });
      await this.fallback.markCompletionApplied(restaurantId, orderId);
      return true;
    } catch {
      await this.fallback.markCompletionApplied(restaurantId, orderId);
      return false;
    }
  }

  async markCompletionApplied(
    restaurantId: number,
    orderId: number
  ): Promise<void> {
    await this.tryClaimCompletion(restaurantId, orderId);
  }
}
