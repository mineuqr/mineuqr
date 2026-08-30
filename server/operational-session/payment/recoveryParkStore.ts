/**
 * RECOVERY-RESILIENCE-AND-DURABILITY-HARDENING-1 Phase 4
 * Durable permanent-park tokens. Reuses order_domain_consumer_processed with
 * Recovery-only consumer names (same reuse pattern as projection consumers).
 * Does not delete CF / Order / Outbox rows. eventId is a 36-char hash because
 * collectionFactId is varchar(128) and the existing eventId column is varchar(36).
 */
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { orderDomainConsumerProcessed } from "../../../drizzle/schema";
import { getDb } from "../../db";

export const RECOVERY_PARK_CONSUMER_DRAWER = "rcv.park.drawer";
export const RECOVERY_PARK_CONSUMER_CHECK = "rcv.park.check";

export function recoveryParkEventId(scope: string): string {
  const hex = createHash("sha256").update(scope).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export interface RecoveryParkStore {
  hasDrawer(collectionFactId: string): Promise<boolean>;
  markDrawer(collectionFactId: string): Promise<void>;
  hasCheck(restaurantId: number, orderId: number): Promise<boolean>;
  markCheck(restaurantId: number, orderId: number): Promise<void>;
}

export class InMemoryRecoveryParkStore implements RecoveryParkStore {
  private readonly drawer = new Set<string>();
  private readonly check = new Set<string>();

  async hasDrawer(collectionFactId: string): Promise<boolean> {
    return this.drawer.has(collectionFactId);
  }

  async markDrawer(collectionFactId: string): Promise<void> {
    this.drawer.add(collectionFactId);
  }

  async hasCheck(restaurantId: number, orderId: number): Promise<boolean> {
    return this.check.has(`${restaurantId}:${orderId}`);
  }

  async markCheck(restaurantId: number, orderId: number): Promise<void> {
    this.check.add(`${restaurantId}:${orderId}`);
  }

  clear(): void {
    this.drawer.clear();
    this.check.clear();
  }
}

async function safeDb() {
  try {
    return await getDb();
  } catch {
    return null;
  }
}

export class DrizzleRecoveryParkStore implements RecoveryParkStore {
  constructor(private readonly fallback = new InMemoryRecoveryParkStore()) {}

  async hasDrawer(collectionFactId: string): Promise<boolean> {
    return this.has(RECOVERY_PARK_CONSUMER_DRAWER, recoveryParkEventId(collectionFactId));
  }

  async markDrawer(collectionFactId: string): Promise<void> {
    await this.mark(RECOVERY_PARK_CONSUMER_DRAWER, recoveryParkEventId(collectionFactId));
    await this.fallback.markDrawer(collectionFactId);
  }

  async hasCheck(restaurantId: number, orderId: number): Promise<boolean> {
    return this.has(
      RECOVERY_PARK_CONSUMER_CHECK,
      recoveryParkEventId(`${restaurantId}:${orderId}`)
    );
  }

  async markCheck(restaurantId: number, orderId: number): Promise<void> {
    await this.mark(
      RECOVERY_PARK_CONSUMER_CHECK,
      recoveryParkEventId(`${restaurantId}:${orderId}`)
    );
    await this.fallback.markCheck(restaurantId, orderId);
  }

  private async has(consumerName: string, eventId: string): Promise<boolean> {
    const db = await safeDb();
    if (!db) return false;
    const [row] = await db
      .select({ eventId: orderDomainConsumerProcessed.eventId })
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

  private async mark(consumerName: string, eventId: string): Promise<void> {
    const db = await safeDb();
    if (!db) return;
    try {
      await db.insert(orderDomainConsumerProcessed).values({
        consumerName,
        eventId,
      });
    } catch {
      /* duplicate — already parked */
    }
  }
}

let store: RecoveryParkStore = new DrizzleRecoveryParkStore();

export function getRecoveryParkStore(): RecoveryParkStore {
  return store;
}

export function setRecoveryParkStoreForTests(next: RecoveryParkStore): void {
  store = next;
}

export function resetRecoveryParkStoreForTests(): void {
  store = new DrizzleRecoveryParkStore();
}
