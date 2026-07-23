/**
 * MULTI-CHECK-ALLOCATION-API-1 — thin write adapter over Check Aggregate Integration.
 *
 * Delegates every mutation to CheckService (Integration ownership boundary).
 * No Domain rules, money math, or orchestration duplication.
 *
 * After a successful Integration commit, refreshes the shared Projection store
 * so Presentation reads observe the same coherent snapshot (API composition only).
 */

import type { MultiCheckAllocationCommandOutcome } from "@shared/operational-session";
import {
  adjustMultiCheckAllocationOnCheck,
  applyMultiCheckAllocationOnCheck,
  cancelMultiCheckAllocationOnCheck,
  completeMultiCheckAllocationOnCheck,
  createMultiCheckAllocationOnCheck,
  reserveMultiCheckAllocationOnCheck,
  reverseMultiCheckAllocationOnCheck,
  type CheckMultiCheckAllocationMutationResult,
} from "../CheckService";
import { tryMaterializeMultiCheckAllocationProjections } from "../read/multiCheckAllocationProjectionMaterializer";
import type { MultiCheckAllocationProjectionStore } from "../read/multiCheckAllocationProjectionStore";
import { toMultiCheckAllocationCommandResultDto } from "./multiCheckAllocationApiMapper";
import type { MultiCheckAllocationCommandResultDto } from "./multiCheckAllocationApiDtos";
import { MultiCheckAllocationReadService } from "./multiCheckAllocationReadService";

export type CreateMultiCheckAllocationApiInput = Readonly<{
  restaurantId: number;
  checkId: number;
  allocationId: string;
  allocationReference: string;
  financialReference?: string | null;
  sourceCheckId?: number;
  sourcePaymentId?: string | null;
  financialResponsibility: string;
  paymentValueCap?: string | null;
  portions: readonly Readonly<{
    portionId: string;
    sequence: number;
    targetCheckId: number;
    amount: string;
  }>[];
  sources?: readonly Readonly<{
    sourceCheckId: number;
    sourcePaymentId?: string | null;
    financialReference?: string | null;
    responsibilityAmount: string;
  }>[];
  allocationReason?: string | null;
}>;

export type MultiCheckAllocationIdentityApiInput = Readonly<{
  restaurantId: number;
  checkId: number;
  allocationId: string;
  allocationReason?: string | null;
}>;

export type AdjustMultiCheckAllocationApiInput =
  MultiCheckAllocationIdentityApiInput &
    Readonly<{
      adjustmentId: string;
      amount: string;
      direction: "increase" | "decrease";
      portionId?: string | null;
    }>;

export type ReverseMultiCheckAllocationApiInput =
  MultiCheckAllocationIdentityApiInput &
    Readonly<{
      reversalId: string;
    }>;

export class MultiCheckAllocationWriteService {
  constructor(
    private readonly store: MultiCheckAllocationProjectionStore,
    private readonly reads: MultiCheckAllocationReadService
  ) {}

  async createAllocation(
    input: CreateMultiCheckAllocationApiInput
  ): Promise<MultiCheckAllocationCommandResultDto> {
    const result = await createMultiCheckAllocationOnCheck(input);
    return this.afterMutation(result);
  }

  async reserveAllocation(
    input: MultiCheckAllocationIdentityApiInput
  ): Promise<MultiCheckAllocationCommandResultDto> {
    const result = await reserveMultiCheckAllocationOnCheck(input);
    return this.afterMutation(result);
  }

  async applyAllocation(
    input: MultiCheckAllocationIdentityApiInput
  ): Promise<MultiCheckAllocationCommandResultDto> {
    const result = await applyMultiCheckAllocationOnCheck(input);
    return this.afterMutation(result);
  }

  async adjustAllocation(
    input: AdjustMultiCheckAllocationApiInput
  ): Promise<MultiCheckAllocationCommandResultDto> {
    const result = await adjustMultiCheckAllocationOnCheck(input);
    return this.afterMutation(result);
  }

  async reverseAllocation(
    input: ReverseMultiCheckAllocationApiInput
  ): Promise<MultiCheckAllocationCommandResultDto> {
    const result = await reverseMultiCheckAllocationOnCheck(input);
    return this.afterMutation(result);
  }

  async completeAllocation(
    input: MultiCheckAllocationIdentityApiInput
  ): Promise<MultiCheckAllocationCommandResultDto> {
    const result = await completeMultiCheckAllocationOnCheck(input);
    return this.afterMutation(result);
  }

  async cancelAllocation(
    input: MultiCheckAllocationIdentityApiInput
  ): Promise<MultiCheckAllocationCommandResultDto> {
    const result = await cancelMultiCheckAllocationOnCheck(input);
    return this.afterMutation(result);
  }

  private async afterMutation(
    result: CheckMultiCheckAllocationMutationResult
  ): Promise<MultiCheckAllocationCommandResultDto> {
    if (result.allocation && result.version != null) {
      await tryMaterializeMultiCheckAllocationProjections(this.store, {
        committedSnapshots: [
          {
            allocation: result.allocation,
            allocationRevision: result.version,
          },
        ],
        events: result.events,
      });
    }

    const allocation =
      result.allocation == null
        ? null
        : await this.reads.getAllocation({
            restaurantId: result.allocation.restaurantId,
            allocationId: result.allocation.allocationId,
          });

    return toMultiCheckAllocationCommandResultDto({
      outcome: result.outcome as MultiCheckAllocationCommandOutcome,
      allocation,
    });
  }
}
