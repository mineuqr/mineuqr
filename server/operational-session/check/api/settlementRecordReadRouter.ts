/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — read-only tRPC exposure of Settlement Record.
 *
 * Authorization + validation + DTO serialization only.
 * No commands, Domain mutation, or money math.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { verifiedProcedure, router } from "../../../_core/trpc";
import { assertRestaurantAccess } from "../../../restaurantAccess";
import { SETTLEMENT_RECORD_KINDS } from "@shared/operational-session";
import { runSettlementRecordRead } from "./mapSettlementRecordApiError";
import { settlementRecordReadService } from "./settlementRecordReadService";

const restaurantInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
});

const idInput = restaurantInput.extend({
  settlementRecordId: z.string().min(1).max(128),
});

const checkInput = restaurantInput.extend({
  checkId: z.coerce.number().int().positive(),
});

const sessionInput = restaurantInput.extend({
  sessionId: z.coerce.number().int().positive(),
});

const listInput = restaurantInput.extend({
  dateFrom: z.string().min(1).max(32).optional().nullable(),
  dateTo: z.string().min(1).max(32).optional().nullable(),
  search: z.string().max(128).optional().nullable(),
  outcome: z.enum(["paid", "complimentary", "voided"]).optional().nullable(),
  recordKind: z.enum(SETTLEMENT_RECORD_KINDS).optional().nullable(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

/**
 * Canonical Settlement Record read endpoints (ADR-ARCH-026 §12):
 * - getById
 * - getByCheck
 * - listByRestaurant (history)
 * - listBySession
 * - getReceipt
 */
export const settlementRecordReadRouter = router({
  getById: verifiedProcedure.input(idInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(
      ctx,
      input.restaurantId,
      "settlementRecord.getById"
    );
    return runSettlementRecordRead(async () => {
      const dto = await settlementRecordReadService.getById(input);
      if (!dto) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Settlement Record not found",
        });
      }
      return dto;
    });
  }),

  getByCheck: verifiedProcedure
    .input(checkInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "settlementRecord.getByCheck"
      );
      return runSettlementRecordRead(() =>
        settlementRecordReadService.getByCheck(input)
      );
    }),

  listByRestaurant: verifiedProcedure
    .input(listInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "settlementRecord.listByRestaurant"
      );
      return runSettlementRecordRead(() =>
        settlementRecordReadService.listByRestaurant(input)
      );
    }),

  listBySession: verifiedProcedure
    .input(sessionInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "settlementRecord.listBySession"
      );
      return runSettlementRecordRead(() =>
        settlementRecordReadService.listBySession(input)
      );
    }),

  getReceipt: verifiedProcedure.input(idInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(
      ctx,
      input.restaurantId,
      "settlementRecord.getReceipt"
    );
    return runSettlementRecordRead(async () => {
      const dto = await settlementRecordReadService.getReceipt(input);
      if (!dto) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Settlement Record not found",
        });
      }
      return dto;
    });
  }),
});
