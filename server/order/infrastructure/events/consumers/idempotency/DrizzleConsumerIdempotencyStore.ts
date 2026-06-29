import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { orderDomainConsumerProcessed } from "../../../../../../drizzle/schema";
import type { OrderEventConsumerName } from "../contracts/OrderEventConsumer";
import type { ConsumerIdempotencyStore } from "./ConsumerIdempotencyStore";
import { InMemoryConsumerIdempotencyStore } from "./ConsumerIdempotencyStore";

export class DrizzleConsumerIdempotencyStore implements ConsumerIdempotencyStore {
  constructor(private readonly fallback = new InMemoryConsumerIdempotencyStore()) {}

  async hasProcessed(consumerName: OrderEventConsumerName, eventId: string): Promise<boolean> {
    let db: Awaited<ReturnType<typeof getDb>> = null;
    try {
      db = await getDb();
    } catch {
      db = null;
    }
    if (!db) {
      return this.fallback.hasProcessed(consumerName, eventId);
    }

    const [row] = await db
      .select()
      .from(orderDomainConsumerProcessed)
      .where(
        and(
          eq(orderDomainConsumerProcessed.consumerName, consumerName),
          eq(orderDomainConsumerProcessed.eventId, eventId)
        )
      )
      .limit(1);

    return row != null;
  }

  async markProcessed(consumerName: OrderEventConsumerName, eventId: string): Promise<void> {
    let db: Awaited<ReturnType<typeof getDb>> = null;
    try {
      db = await getDb();
    } catch {
      db = null;
    }
    if (!db) {
      await this.fallback.markProcessed(consumerName, eventId);
      return;
    }

    try {
      await db.insert(orderDomainConsumerProcessed).values({
        consumerName,
        eventId,
      });
    } catch {
      /* duplicate insert — already processed */
    }
  }
}
