/**
 * MULTI-CHECK-ALLOCATION-API-1 — canonical tRPC exposure.
 *
 * Reads: Projection store only.
 * Writes: Check Aggregate Integration only (via WriteService).
 * Authorization + validation + DTO serialization only.
 * No Domain rules, Persistence access, or money math.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { verifiedProcedure, router } from "../../../_core/trpc";
import { assertRestaurantAccess } from "../../../restaurantAccess";
import {
  runMultiCheckAllocationRead,
  runMultiCheckAllocationWrite,
} from "./mapMultiCheckAllocationApiError";
import {
  multiCheckAllocationReadService,
  multiCheckAllocationWriteService,
} from "./multiCheckAllocationApiComposition";

const restaurantInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
});

const allocationIdentityInput = restaurantInput.extend({
  allocationId: z.string().min(1).max(128),
});

const sourceCheckInput = restaurantInput.extend({
  sourceCheckId: z.coerce.number().int().positive(),
});

const targetCheckInput = restaurantInput.extend({
  targetCheckId: z.coerce.number().int().positive(),
});

const commandingCheckInput = restaurantInput.extend({
  checkId: z.coerce.number().int().positive(),
  allocationId: z.string().min(1).max(128),
  allocationReason: z.string().max(512).nullish(),
});

const moneyAmount = z.string().min(1).max(64);

const portionInput = z.object({
  portionId: z.string().min(1).max(128),
  sequence: z.coerce.number().int().nonnegative(),
  targetCheckId: z.coerce.number().int().positive(),
  amount: moneyAmount,
});

const sourceInput = z.object({
  sourceCheckId: z.coerce.number().int().positive(),
  sourcePaymentId: z.string().min(1).max(128).nullish(),
  financialReference: z.string().min(1).max(128).nullish(),
  responsibilityAmount: moneyAmount,
});

const createAllocationInput = restaurantInput.extend({
  checkId: z.coerce.number().int().positive(),
  allocationId: z.string().min(1).max(128),
  allocationReference: z.string().min(1).max(128),
  financialReference: z.string().min(1).max(128).nullish(),
  sourceCheckId: z.coerce.number().int().positive().optional(),
  sourcePaymentId: z.string().min(1).max(128).nullish(),
  financialResponsibility: moneyAmount,
  paymentValueCap: moneyAmount.nullish(),
  portions: z.array(portionInput).min(1),
  sources: z.array(sourceInput).optional(),
  allocationReason: z.string().max(512).nullish(),
});

const adjustAllocationInput = commandingCheckInput.extend({
  adjustmentId: z.string().min(1).max(128),
  amount: moneyAmount,
  direction: z.enum(["increase", "decrease"]),
  portionId: z.string().min(1).max(128).nullish(),
});

const reverseAllocationInput = commandingCheckInput.extend({
  reversalId: z.string().min(1).max(128),
});

/**
 * Canonical Multi Check Allocation API (`multiCheckAllocation.*`).
 *
 * Reads:
 * - getAllocation
 * - listAllocations / listBySourceCheck / listByTargetCheck / listByRestaurant
 * - getAllocationTimeline
 * - getAllocationSummary / listSummariesBySourceCheck
 * - getAllocationResponsibility
 * - getProjectionMetadata
 *
 * Writes:
 * - createAllocation
 * - reserveAllocation
 * - applyAllocation
 * - adjustAllocation
 * - reverseAllocation
 * - completeAllocation
 * - cancelAllocation
 */
export const multiCheckAllocationRouter = router({
  // ─── Reads (Projection only) ───────────────────────────────────────

  getAllocation: verifiedProcedure
    .input(allocationIdentityInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.getAllocation"
      );
      return runMultiCheckAllocationRead(async () => {
        const dto = await multiCheckAllocationReadService.getAllocation(input);
        if (!dto) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Multi Check Allocation not found",
          });
        }
        return dto;
      });
    }),

  listAllocations: verifiedProcedure
    .input(sourceCheckInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.listAllocations"
      );
      return runMultiCheckAllocationRead(() =>
        multiCheckAllocationReadService.listAllocationsBySourceCheck(input)
      );
    }),

  listBySourceCheck: verifiedProcedure
    .input(sourceCheckInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.listBySourceCheck"
      );
      return runMultiCheckAllocationRead(() =>
        multiCheckAllocationReadService.listAllocationsBySourceCheck(input)
      );
    }),

  listByTargetCheck: verifiedProcedure
    .input(targetCheckInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.listByTargetCheck"
      );
      return runMultiCheckAllocationRead(() =>
        multiCheckAllocationReadService.listAllocationsByTargetCheck(input)
      );
    }),

  listByRestaurant: verifiedProcedure
    .input(restaurantInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.listByRestaurant"
      );
      return runMultiCheckAllocationRead(() =>
        multiCheckAllocationReadService.listAllocationsByRestaurant(input)
      );
    }),

  getAllocationTimeline: verifiedProcedure
    .input(allocationIdentityInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.getAllocationTimeline"
      );
      return runMultiCheckAllocationRead(async () => {
        const dto =
          await multiCheckAllocationReadService.getAllocationTimeline(input);
        if (!dto) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Multi Check Allocation not found",
          });
        }
        return dto;
      });
    }),

  getAllocationSummary: verifiedProcedure
    .input(allocationIdentityInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.getAllocationSummary"
      );
      return runMultiCheckAllocationRead(async () => {
        const dto =
          await multiCheckAllocationReadService.getAllocationSummary(input);
        if (!dto) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Multi Check Allocation summary not found",
          });
        }
        return dto;
      });
    }),

  listSummariesBySourceCheck: verifiedProcedure
    .input(sourceCheckInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.listSummariesBySourceCheck"
      );
      return runMultiCheckAllocationRead(() =>
        multiCheckAllocationReadService.listAllocationSummariesBySourceCheck(
          input
        )
      );
    }),

  getAllocationResponsibility: verifiedProcedure
    .input(allocationIdentityInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.getAllocationResponsibility"
      );
      return runMultiCheckAllocationRead(async () => {
        const dto =
          await multiCheckAllocationReadService.getAllocationResponsibility(
            input
          );
        if (!dto) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Multi Check Allocation responsibility not found",
          });
        }
        return dto;
      });
    }),

  getProjectionMetadata: verifiedProcedure
    .input(restaurantInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.getProjectionMetadata"
      );
      return multiCheckAllocationReadService.getProjectionMetadata();
    }),

  // ─── Writes (Integration only) ─────────────────────────────────────

  createAllocation: verifiedProcedure
    .input(createAllocationInput)
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.createAllocation"
      );
      return runMultiCheckAllocationWrite(() =>
        multiCheckAllocationWriteService.createAllocation(input)
      );
    }),

  reserveAllocation: verifiedProcedure
    .input(commandingCheckInput)
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.reserveAllocation"
      );
      return runMultiCheckAllocationWrite(() =>
        multiCheckAllocationWriteService.reserveAllocation(input)
      );
    }),

  applyAllocation: verifiedProcedure
    .input(commandingCheckInput)
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.applyAllocation"
      );
      return runMultiCheckAllocationWrite(() =>
        multiCheckAllocationWriteService.applyAllocation(input)
      );
    }),

  adjustAllocation: verifiedProcedure
    .input(adjustAllocationInput)
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.adjustAllocation"
      );
      return runMultiCheckAllocationWrite(() =>
        multiCheckAllocationWriteService.adjustAllocation(input)
      );
    }),

  reverseAllocation: verifiedProcedure
    .input(reverseAllocationInput)
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.reverseAllocation"
      );
      return runMultiCheckAllocationWrite(() =>
        multiCheckAllocationWriteService.reverseAllocation(input)
      );
    }),

  completeAllocation: verifiedProcedure
    .input(commandingCheckInput)
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.completeAllocation"
      );
      return runMultiCheckAllocationWrite(() =>
        multiCheckAllocationWriteService.completeAllocation(input)
      );
    }),

  cancelAllocation: verifiedProcedure
    .input(commandingCheckInput)
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "multiCheckAllocation.cancelAllocation"
      );
      return runMultiCheckAllocationWrite(() =>
        multiCheckAllocationWriteService.cancelAllocation(input)
      );
    }),
});
