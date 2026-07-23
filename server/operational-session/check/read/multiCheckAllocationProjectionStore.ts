/**
 * MULTI-CHECK-ALLOCATION-PROJECTION-1 — Read Model store contracts + in-memory impl.
 *
 * Not Write Model persistence. Not a financial authority.
 * Failures here MUST NOT affect committed Check / Allocation transactions.
 *
 * Snapshot governance: upsert replaces the entire prior snapshot for an identity.
 * Stores MUST NEVER merge fields from different Allocation revisions.
 */

import type {
  MultiCheckAllocationProjection,
  MultiCheckAllocationProjectionEventClaimKey,
  MultiCheckAllocationProjectionIdentity,
  MultiCheckAllocationSummaryProjection,
} from "@shared/operational-session";

export type MultiCheckAllocationProjectionStore = {
  upsertAllocation(projection: MultiCheckAllocationProjection): Promise<void>;
  upsertSummary(
    projection: MultiCheckAllocationSummaryProjection
  ): Promise<void>;
  findAllocationByIdentity(
    identity: MultiCheckAllocationProjectionIdentity
  ): Promise<MultiCheckAllocationProjection | null>;
  findSummaryByIdentity(
    identity: MultiCheckAllocationProjectionIdentity
  ): Promise<MultiCheckAllocationSummaryProjection | null>;
  listAllocationsBySourceCheck(input: {
    restaurantId: number;
    sourceCheckId: number;
  }): Promise<readonly MultiCheckAllocationProjection[]>;
  listAllocationsByTargetCheck(input: {
    restaurantId: number;
    targetCheckId: number;
  }): Promise<readonly MultiCheckAllocationProjection[]>;
  listAllocationsByRestaurant(input: {
    restaurantId: number;
  }): Promise<readonly MultiCheckAllocationProjection[]>;
  listSummariesBySourceCheck(input: {
    restaurantId: number;
    sourceCheckId: number;
  }): Promise<readonly MultiCheckAllocationSummaryProjection[]>;
  hasEventClaim(
    key: MultiCheckAllocationProjectionEventClaimKey
  ): Promise<boolean>;
  recordEventClaim(
    key: MultiCheckAllocationProjectionEventClaimKey
  ): Promise<void>;
};

function allocationKey(id: MultiCheckAllocationProjectionIdentity): string {
  return `${id.restaurantId}:${id.allocationId}`;
}

/**
 * Process-local Read Model store for tests and single-process operational use.
 * Durable projection stores may implement the same contract later without
 * changing builders or Write Model persistence.
 */
export class InMemoryMultiCheckAllocationProjectionStore
  implements MultiCheckAllocationProjectionStore
{
  private readonly allocations = new Map<
    string,
    MultiCheckAllocationProjection
  >();
  private readonly summaries = new Map<
    string,
    MultiCheckAllocationSummaryProjection
  >();
  private readonly eventClaims =
    new Set<MultiCheckAllocationProjectionEventClaimKey>();

  /**
   * Replace the entire Allocation projection snapshot for this identity.
   * Prior nested children / money / revision stamps are discarded wholesale.
   */
  async upsertAllocation(
    projection: MultiCheckAllocationProjection
  ): Promise<void> {
    this.allocations.set(
      allocationKey({
        restaurantId: projection.restaurantId,
        allocationId: projection.allocationId,
      }),
      projection
    );
  }

  /** Replace the entire Summary snapshot for this identity. */
  async upsertSummary(
    projection: MultiCheckAllocationSummaryProjection
  ): Promise<void> {
    this.summaries.set(
      allocationKey({
        restaurantId: projection.restaurantId,
        allocationId: projection.allocationId,
      }),
      projection
    );
  }

  async findAllocationByIdentity(
    identity: MultiCheckAllocationProjectionIdentity
  ): Promise<MultiCheckAllocationProjection | null> {
    return this.allocations.get(allocationKey(identity)) ?? null;
  }

  async findSummaryByIdentity(
    identity: MultiCheckAllocationProjectionIdentity
  ): Promise<MultiCheckAllocationSummaryProjection | null> {
    return this.summaries.get(allocationKey(identity)) ?? null;
  }

  async listAllocationsBySourceCheck(input: {
    restaurantId: number;
    sourceCheckId: number;
  }): Promise<readonly MultiCheckAllocationProjection[]> {
    return [...this.allocations.values()]
      .filter(
        (a) =>
          a.restaurantId === input.restaurantId &&
          a.sourceCheckId === input.sourceCheckId
      )
      .sort((a, b) =>
        a.allocationId < b.allocationId
          ? -1
          : a.allocationId > b.allocationId
            ? 1
            : 0
      );
  }

  async listAllocationsByTargetCheck(input: {
    restaurantId: number;
    targetCheckId: number;
  }): Promise<readonly MultiCheckAllocationProjection[]> {
    return [...this.allocations.values()]
      .filter(
        (a) =>
          a.restaurantId === input.restaurantId &&
          a.targetCheckIds.includes(input.targetCheckId)
      )
      .sort((a, b) =>
        a.allocationId < b.allocationId
          ? -1
          : a.allocationId > b.allocationId
            ? 1
            : 0
      );
  }

  async listAllocationsByRestaurant(input: {
    restaurantId: number;
  }): Promise<readonly MultiCheckAllocationProjection[]> {
    return [...this.allocations.values()]
      .filter((a) => a.restaurantId === input.restaurantId)
      .sort((a, b) =>
        a.sourceCheckId !== b.sourceCheckId
          ? a.sourceCheckId - b.sourceCheckId
          : a.allocationId < b.allocationId
            ? -1
            : a.allocationId > b.allocationId
              ? 1
              : 0
      );
  }

  async listSummariesBySourceCheck(input: {
    restaurantId: number;
    sourceCheckId: number;
  }): Promise<readonly MultiCheckAllocationSummaryProjection[]> {
    return [...this.summaries.values()]
      .filter(
        (s) =>
          s.restaurantId === input.restaurantId &&
          s.sourceCheckId === input.sourceCheckId
      )
      .sort((a, b) =>
        a.allocationId < b.allocationId
          ? -1
          : a.allocationId > b.allocationId
            ? 1
            : 0
      );
  }

  async hasEventClaim(
    key: MultiCheckAllocationProjectionEventClaimKey
  ): Promise<boolean> {
    return this.eventClaims.has(key);
  }

  async recordEventClaim(
    key: MultiCheckAllocationProjectionEventClaimKey
  ): Promise<void> {
    this.eventClaims.add(key);
  }

  /** Test helper — clear all projected state. */
  clear(): void {
    this.allocations.clear();
    this.summaries.clear();
    this.eventClaims.clear();
  }
}
