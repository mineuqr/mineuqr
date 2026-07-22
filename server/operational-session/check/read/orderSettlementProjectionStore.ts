/**
 * ORDER-SETTLEMENT-PROJECTION-1 — Read Model store contracts + in-memory impl.
 *
 * Not Write Model persistence. Not a financial authority.
 * Failures here MUST NOT affect committed Check / OS transactions.
 */

import type {
  OrderSettlementProjection,
  OrderSettlementProjectionEventClaimKey,
  OrderSettlementProjectionIdentity,
} from "@shared/operational-session";

export type OrderSettlementProjectionStore = {
  upsert(projection: OrderSettlementProjection): Promise<void>;
  findByIdentity(
    identity: OrderSettlementProjectionIdentity
  ): Promise<OrderSettlementProjection | null>;
  listByCheck(input: {
    restaurantId: number;
    checkId: number;
  }): Promise<readonly OrderSettlementProjection[]>;
  listByRestaurant(input: {
    restaurantId: number;
  }): Promise<readonly OrderSettlementProjection[]>;
  /** ADR-021 event claim — true if already recorded. */
  hasEventClaim(key: OrderSettlementProjectionEventClaimKey): Promise<boolean>;
  recordEventClaim(key: OrderSettlementProjectionEventClaimKey): Promise<void>;
};

function identityKey(id: OrderSettlementProjectionIdentity): string {
  return `${id.restaurantId}:${id.checkId}:${id.orderId}`;
}

/**
 * Process-local Read Model store for tests and single-process operational use.
 * Durable projection stores may implement the same contract later without
 * changing builders or Write Model persistence.
 */
export class InMemoryOrderSettlementProjectionStore
  implements OrderSettlementProjectionStore
{
  private readonly byIdentity = new Map<string, OrderSettlementProjection>();
  private readonly eventClaims = new Set<OrderSettlementProjectionEventClaimKey>();

  async upsert(projection: OrderSettlementProjection): Promise<void> {
    this.byIdentity.set(
      identityKey({
        restaurantId: projection.restaurantId,
        checkId: projection.checkId,
        orderId: projection.orderId,
      }),
      projection
    );
  }

  async findByIdentity(
    identity: OrderSettlementProjectionIdentity
  ): Promise<OrderSettlementProjection | null> {
    return this.byIdentity.get(identityKey(identity)) ?? null;
  }

  async listByCheck(input: {
    restaurantId: number;
    checkId: number;
  }): Promise<readonly OrderSettlementProjection[]> {
    return [...this.byIdentity.values()]
      .filter(
        (p) =>
          p.restaurantId === input.restaurantId && p.checkId === input.checkId
      )
      .sort((a, b) => a.orderId - b.orderId);
  }

  async listByRestaurant(input: {
    restaurantId: number;
  }): Promise<readonly OrderSettlementProjection[]> {
    return [...this.byIdentity.values()]
      .filter((p) => p.restaurantId === input.restaurantId)
      .sort((a, b) =>
        a.checkId !== b.checkId
          ? a.checkId - b.checkId
          : a.orderId - b.orderId
      );
  }

  async hasEventClaim(
    key: OrderSettlementProjectionEventClaimKey
  ): Promise<boolean> {
    return this.eventClaims.has(key);
  }

  async recordEventClaim(
    key: OrderSettlementProjectionEventClaimKey
  ): Promise<void> {
    this.eventClaims.add(key);
  }

  /** Test helper — clear all projected state. */
  clear(): void {
    this.byIdentity.clear();
    this.eventClaims.clear();
  }
}
