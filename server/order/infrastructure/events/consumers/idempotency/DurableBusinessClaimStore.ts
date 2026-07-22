/**
 * EVENT-SIDE-EFFECT-IDEMPOTENCY-1 / ADR-ARCH-021 Pattern B —
 * Durable business claim: (consumerNamespace, businessKey) in
 * order_domain_consumer_processed. Distinct from transport (consumerName, eventId).
 *
 * businessKey MUST fit varchar(36).
 */

import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { orderDomainConsumerProcessed } from "../../../../../../drizzle/schema";

export interface DurableBusinessClaimStore {
  /** Returns true only on first successful claim. */
  tryClaim(consumerNamespace: string, businessKey: string): Promise<boolean>;
  /** Idempotent seed (rebuild). */
  markClaimed(consumerNamespace: string, businessKey: string): Promise<void>;
}

export class InMemoryDurableBusinessClaimStore
  implements DurableBusinessClaimStore
{
  private readonly claimed = new Set<string>();

  private key(ns: string, businessKey: string): string {
    return `${ns}\0${businessKey}`;
  }

  async tryClaim(
    consumerNamespace: string,
    businessKey: string
  ): Promise<boolean> {
    assertBusinessKeyLength(businessKey);
    const k = this.key(consumerNamespace, businessKey);
    if (this.claimed.has(k)) return false;
    this.claimed.add(k);
    return true;
  }

  async markClaimed(
    consumerNamespace: string,
    businessKey: string
  ): Promise<void> {
    await this.tryClaim(consumerNamespace, businessKey);
  }

  clear(): void {
    this.claimed.clear();
  }
}

export class DrizzleDurableBusinessClaimStore
  implements DurableBusinessClaimStore
{
  constructor(
    private readonly fallback = new InMemoryDurableBusinessClaimStore()
  ) {}

  async tryClaim(
    consumerNamespace: string,
    businessKey: string
  ): Promise<boolean> {
    assertBusinessKeyLength(businessKey);
    let db: Awaited<ReturnType<typeof getDb>> = null;
    try {
      db = await getDb();
    } catch {
      db = null;
    }
    if (!db) {
      return this.fallback.tryClaim(consumerNamespace, businessKey);
    }

    try {
      await db.insert(orderDomainConsumerProcessed).values({
        consumerName: consumerNamespace,
        eventId: businessKey,
      });
      await this.fallback.markClaimed(consumerNamespace, businessKey);
      return true;
    } catch {
      await this.fallback.markClaimed(consumerNamespace, businessKey);
      return false;
    }
  }

  async markClaimed(
    consumerNamespace: string,
    businessKey: string
  ): Promise<void> {
    await this.tryClaim(consumerNamespace, businessKey);
  }
}

function assertBusinessKeyLength(businessKey: string): void {
  if (businessKey.length === 0 || businessKey.length > 36) {
    throw new Error(
      `businessKey length ${businessKey.length} exceeds varchar(36): ${businessKey}`
    );
  }
}

/** Compact keys for ADR-021 Pattern B (≤36 chars). */
export const BUSINESS_CLAIM_NS = {
  notificationNewOrder: "BizClaim:NotifyNewOrder",
  sessionOrderCreated: "BizClaim:SessionCreated",
  sessionOrderCancelled: "BizClaim:SessionCancel",
  p06Kpi: "BizClaim:P06Kpi",
  p10Created: "BizClaim:P10Created",
} as const;

export function notificationNewOrderKey(
  restaurantId: number,
  orderId: number
): string {
  return `n:${restaurantId}:${orderId}`;
}

export function sessionOrderCreatedKey(
  restaurantId: number,
  orderId: number
): string {
  return `s:${restaurantId}:${orderId}:c`;
}

export function sessionOrderCancelledKey(
  restaurantId: number,
  orderId: number
): string {
  return `s:${restaurantId}:${orderId}:x`;
}

export function p06OrderCreatedKey(
  restaurantId: number,
  orderId: number
): string {
  return `k:${restaurantId}:${orderId}:c`;
}

/** Status transition claim — e.g. k:1:55:pending>ready */
export function p06StatusTransitionKey(
  restaurantId: number,
  orderId: number,
  fromStatus: string,
  toStatus: string
): string {
  return `k:${restaurantId}:${orderId}:${fromStatus}>${toStatus}`;
}

/**
 * Canonical kitchen path transitions implied by a snapshot status.
 * Used to seed P-06 claims after rebuild so historical replays cannot re-skew.
 */
export function p06CanonicalTransitionsForStatus(
  status: string
): ReadonlyArray<readonly [string, string]> {
  const path = ["pending", "preparing", "ready", "served"] as const;
  const idx = path.indexOf(status as (typeof path)[number]);
  if (idx <= 0) return [];
  const out: Array<[string, string]> = [];
  for (let i = 0; i < idx; i++) {
    out.push([path[i], path[i + 1]]);
  }
  return out;
}

/** ADR-021 Pattern E — business-scoped print job key (not eventId). */
export function orderPrintBusinessIdempotencyKey(
  orderId: number,
  eventType: string
): string {
  return `order:${orderId}:${eventType}`;
}

/** P-10 OrderCreated claim — once-per-order orderCount increment. */
export function p10OrderCreatedKey(
  restaurantId: number,
  orderId: number
): string {
  return `a:${restaurantId}:${orderId}:c`;
}

/**
 * P-04 Timeline — deterministic eventId (PK) for Pattern E natural uniqueness.
 * Fits varchar(36). Transport eventId is retained on lastEventId only.
 */
export function timelineCreatedEventId(
  restaurantId: number,
  orderId: number
): string {
  return `t:${restaurantId}:${orderId}:c`;
}

export function timelineTransitionEventId(
  restaurantId: number,
  orderId: number,
  fromStatus: string,
  toStatus: string
): string {
  return `t:${restaurantId}:${orderId}:${fromStatus}>${toStatus}`;
}
