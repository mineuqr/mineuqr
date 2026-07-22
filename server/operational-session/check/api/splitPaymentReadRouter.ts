/**
 * SPLIT-PAYMENT-API-1 — read-only tRPC exposure of Split Payment Projection.
 *
 * Authorization + validation + DTO serialization only.
 * No commands, Domain, Aggregate, Repository, or money math.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { verifiedProcedure, router } from "../../../_core/trpc";
import { assertRestaurantAccess } from "../../../restaurantAccess";
import { runSplitPaymentRead } from "./mapSplitPaymentApiError";
import { splitPaymentReadService } from "./splitPaymentReadComposition";

const restaurantInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
});

const checkInput = restaurantInput.extend({
  checkId: z.coerce.number().int().positive(),
});

const paymentInput = checkInput.extend({
  paymentId: z.string().min(1).max(128),
});

const attemptInput = checkInput.extend({
  attemptId: z.string().min(1).max(128),
});

/**
 * Canonical read endpoints:
 * - getByPayment
 * - listByCheck / getByCheck
 * - listByRestaurant
 * - getOutstanding
 * - getTimeline
 * - getAttempts / listAttemptsByCheck
 * - getByAttempt
 * - getSummaryByCheck
 * - getProjectionMetadata
 */
export const splitPaymentReadRouter = router({
  getByPayment: verifiedProcedure
    .input(paymentInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "splitPayment.getByPayment"
      );
      return runSplitPaymentRead(async () => {
        const dto = await splitPaymentReadService.getByPayment(input);
        if (!dto) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Split Payment not found",
          });
        }
        return dto;
      });
    }),

  listByCheck: verifiedProcedure
    .input(checkInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "splitPayment.listByCheck"
      );
      return runSplitPaymentRead(() =>
        splitPaymentReadService.listByCheck(input)
      );
    }),

  /** Alias for list-by-check payment retrieval. */
  getByCheck: verifiedProcedure
    .input(checkInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "splitPayment.getByCheck"
      );
      return runSplitPaymentRead(() =>
        splitPaymentReadService.listByCheck(input)
      );
    }),

  listByRestaurant: verifiedProcedure
    .input(restaurantInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "splitPayment.listByRestaurant"
      );
      return runSplitPaymentRead(() =>
        splitPaymentReadService.listByRestaurant(input)
      );
    }),

  getOutstanding: verifiedProcedure
    .input(checkInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "splitPayment.getOutstanding"
      );
      return runSplitPaymentRead(async () => {
        const dto = await splitPaymentReadService.getOutstanding(input);
        if (!dto) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Split Payment outstanding not found",
          });
        }
        return dto;
      });
    }),

  getTimeline: verifiedProcedure
    .input(paymentInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "splitPayment.getTimeline"
      );
      return runSplitPaymentRead(async () => {
        const timeline = await splitPaymentReadService.getTimeline(input);
        if (!timeline) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Split Payment not found",
          });
        }
        return timeline;
      });
    }),

  getAttempts: verifiedProcedure
    .input(paymentInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "splitPayment.getAttempts"
      );
      return runSplitPaymentRead(() =>
        splitPaymentReadService.getAttemptsByPayment(input)
      );
    }),

  listAttemptsByCheck: verifiedProcedure
    .input(checkInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "splitPayment.listAttemptsByCheck"
      );
      return runSplitPaymentRead(() =>
        splitPaymentReadService.getAttemptsByCheck(input)
      );
    }),

  getByAttempt: verifiedProcedure
    .input(attemptInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "splitPayment.getByAttempt"
      );
      return runSplitPaymentRead(async () => {
        const dto = await splitPaymentReadService.getByAttempt(input);
        if (!dto) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Split Payment attempt not found",
          });
        }
        return dto;
      });
    }),

  getSummaryByCheck: verifiedProcedure
    .input(checkInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "splitPayment.getSummaryByCheck"
      );
      return runSplitPaymentRead(() =>
        splitPaymentReadService.getSummaryByCheck(input)
      );
    }),

  getProjectionMetadata: verifiedProcedure
    .input(restaurantInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "splitPayment.getProjectionMetadata"
      );
      return splitPaymentReadService.getProjectionCatalog();
    }),
});
