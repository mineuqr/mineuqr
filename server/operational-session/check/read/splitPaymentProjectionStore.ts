/**
 * SPLIT-PAYMENT-PROJECTION-1 — Read Model store contracts + in-memory impl.
 *
 * Not Write Model persistence. Not a financial authority.
 * Failures here MUST NOT affect committed Check / Split Payment transactions.
 */

import type {
  SplitPaymentAttemptProjection,
  SplitPaymentAttemptProjectionIdentity,
  SplitPaymentOutstandingProjection,
  SplitPaymentOutstandingProjectionIdentity,
  SplitPaymentProjection,
  SplitPaymentProjectionEventClaimKey,
  SplitPaymentProjectionIdentity,
} from "@shared/operational-session";

export type SplitPaymentProjectionStore = {
  upsertPayment(projection: SplitPaymentProjection): Promise<void>;
  findPaymentByIdentity(
    identity: SplitPaymentProjectionIdentity
  ): Promise<SplitPaymentProjection | null>;
  listPaymentsByCheck(input: {
    restaurantId: number;
    checkId: number;
  }): Promise<readonly SplitPaymentProjection[]>;
  listPaymentsByRestaurant(input: {
    restaurantId: number;
  }): Promise<readonly SplitPaymentProjection[]>;

  upsertAttempt(projection: SplitPaymentAttemptProjection): Promise<void>;
  findAttemptByIdentity(
    identity: SplitPaymentAttemptProjectionIdentity
  ): Promise<SplitPaymentAttemptProjection | null>;
  listAttemptsByCheck(input: {
    restaurantId: number;
    checkId: number;
  }): Promise<readonly SplitPaymentAttemptProjection[]>;
  listAttemptsByPayment(input: {
    restaurantId: number;
    checkId: number;
    paymentId: string;
  }): Promise<readonly SplitPaymentAttemptProjection[]>;

  upsertOutstanding(
    projection: SplitPaymentOutstandingProjection
  ): Promise<void>;
  findOutstandingByIdentity(
    identity: SplitPaymentOutstandingProjectionIdentity
  ): Promise<SplitPaymentOutstandingProjection | null>;

  hasEventClaim(key: SplitPaymentProjectionEventClaimKey): Promise<boolean>;
  recordEventClaim(key: SplitPaymentProjectionEventClaimKey): Promise<void>;
};

function paymentKey(id: SplitPaymentProjectionIdentity): string {
  return `${id.restaurantId}:${id.checkId}:${id.paymentId}`;
}

function attemptKey(id: SplitPaymentAttemptProjectionIdentity): string {
  return `${id.restaurantId}:${id.checkId}:${id.attemptId}`;
}

function outstandingKey(
  id: SplitPaymentOutstandingProjectionIdentity
): string {
  return `${id.restaurantId}:${id.checkId}`;
}

/**
 * Process-local Read Model store for tests and single-process operational use.
 * Durable projection stores may implement the same contract later without
 * changing builders or Write Model persistence.
 */
export class InMemorySplitPaymentProjectionStore
  implements SplitPaymentProjectionStore
{
  private readonly payments = new Map<string, SplitPaymentProjection>();
  private readonly attempts = new Map<string, SplitPaymentAttemptProjection>();
  private readonly outstanding = new Map<
    string,
    SplitPaymentOutstandingProjection
  >();
  private readonly eventClaims = new Set<SplitPaymentProjectionEventClaimKey>();

  async upsertPayment(projection: SplitPaymentProjection): Promise<void> {
    this.payments.set(
      paymentKey({
        restaurantId: projection.restaurantId,
        checkId: projection.checkId,
        paymentId: projection.paymentId,
      }),
      projection
    );
  }

  async findPaymentByIdentity(
    identity: SplitPaymentProjectionIdentity
  ): Promise<SplitPaymentProjection | null> {
    return this.payments.get(paymentKey(identity)) ?? null;
  }

  async listPaymentsByCheck(input: {
    restaurantId: number;
    checkId: number;
  }): Promise<readonly SplitPaymentProjection[]> {
    return [...this.payments.values()]
      .filter(
        (p) =>
          p.restaurantId === input.restaurantId && p.checkId === input.checkId
      )
      .sort((a, b) =>
        a.paymentId < b.paymentId ? -1 : a.paymentId > b.paymentId ? 1 : 0
      );
  }

  async listPaymentsByRestaurant(input: {
    restaurantId: number;
  }): Promise<readonly SplitPaymentProjection[]> {
    return [...this.payments.values()]
      .filter((p) => p.restaurantId === input.restaurantId)
      .sort((a, b) =>
        a.checkId !== b.checkId
          ? a.checkId - b.checkId
          : a.paymentId < b.paymentId
            ? -1
            : a.paymentId > b.paymentId
              ? 1
              : 0
      );
  }

  async upsertAttempt(projection: SplitPaymentAttemptProjection): Promise<void> {
    this.attempts.set(
      attemptKey({
        restaurantId: projection.restaurantId,
        checkId: projection.checkId,
        attemptId: projection.attemptId,
      }),
      projection
    );
  }

  async findAttemptByIdentity(
    identity: SplitPaymentAttemptProjectionIdentity
  ): Promise<SplitPaymentAttemptProjection | null> {
    return this.attempts.get(attemptKey(identity)) ?? null;
  }

  async listAttemptsByCheck(input: {
    restaurantId: number;
    checkId: number;
  }): Promise<readonly SplitPaymentAttemptProjection[]> {
    return [...this.attempts.values()]
      .filter(
        (a) =>
          a.restaurantId === input.restaurantId && a.checkId === input.checkId
      )
      .sort((a, b) =>
        a.createdAt !== b.createdAt
          ? a.createdAt < b.createdAt
            ? -1
            : 1
          : a.attemptId < b.attemptId
            ? -1
            : a.attemptId > b.attemptId
              ? 1
              : 0
      );
  }

  async listAttemptsByPayment(input: {
    restaurantId: number;
    checkId: number;
    paymentId: string;
  }): Promise<readonly SplitPaymentAttemptProjection[]> {
    return (await this.listAttemptsByCheck(input)).filter(
      (a) => a.paymentId === input.paymentId
    );
  }

  async upsertOutstanding(
    projection: SplitPaymentOutstandingProjection
  ): Promise<void> {
    this.outstanding.set(
      outstandingKey({
        restaurantId: projection.restaurantId,
        checkId: projection.checkId,
      }),
      projection
    );
  }

  async findOutstandingByIdentity(
    identity: SplitPaymentOutstandingProjectionIdentity
  ): Promise<SplitPaymentOutstandingProjection | null> {
    return this.outstanding.get(outstandingKey(identity)) ?? null;
  }

  async hasEventClaim(
    key: SplitPaymentProjectionEventClaimKey
  ): Promise<boolean> {
    return this.eventClaims.has(key);
  }

  async recordEventClaim(
    key: SplitPaymentProjectionEventClaimKey
  ): Promise<void> {
    this.eventClaims.add(key);
  }

  /** Test helper — clear all projected state. */
  clear(): void {
    this.payments.clear();
    this.attempts.clear();
    this.outstanding.clear();
    this.eventClaims.clear();
  }
}
