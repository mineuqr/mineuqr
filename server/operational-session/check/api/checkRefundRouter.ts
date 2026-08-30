/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 / ADOPTION-2
 *
 * Thin tRPC transport façade over certified CheckService refund entry points.
 * ADOPTION-2 adds Settlement Number lookup + refund policy window enforcement.
 * Authorization + validation + DTO serialization only.
 * No Refund Domain reimplementation. No Check Aggregate changes.
 */

import { z } from "zod";
import {
  parseRefundMoney,
  SELECTABLE_PAYMENT_METHODS,
} from "@shared/operational-session";
import { verifiedProcedure, router } from "../../../_core/trpc";
import { assertRestaurantAccess } from "../../../restaurantAccess";
import {
  applyRefundOnCheck,
  getCheckRefundBudget,
} from "../CheckService";
import {
  CHECK_REFUND_API_CONTRACT_ID,
  CHECK_REFUND_API_CONTRACT_VERSION,
  type CheckRefundApplyResultDto,
  type CheckRefundBudgetDto,
} from "./checkRefundApiDtos";
import { runCheckRefundApi } from "./mapCheckRefundApiError";
import {
  assertRefundPolicyAllowsApply,
  lookupCheckRefundByInvoiceNumber,
  lookupCheckRefundBySettlementNumber,
} from "./checkRefundLookupService";

const restaurantInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
});

const budgetInput = restaurantInput.extend({
  checkId: z.coerce.number().int().positive(),
});

const lookupSettlementInput = restaurantInput.extend({
  settlementNumber: z.string().min(1).max(64),
});

const lookupInvoiceInput = restaurantInput.extend({
  invoiceNumber: z.string().min(1).max(32),
});

const moneyAmount = z
  .string()
  .min(1)
  .max(32)
  .regex(/^\d+(\.\d{1,2})?$/, "invalid decimal amount");

const applyInput = restaurantInput.extend({
  checkId: z.coerce.number().int().positive(),
  amount: moneyAmount,
  reason: z.string().max(500).optional().nullable(),
  tenderMethod: z.enum(SELECTABLE_PAYMENT_METHODS).optional(),
  registerId: z.string().min(1).max(128).optional().nullable(),
  managerApproved: z.boolean().optional().nullable(),
});

function toBudgetDto(
  restaurantId: number,
  checkId: number,
  budget: Awaited<ReturnType<typeof getCheckRefundBudget>>
): CheckRefundBudgetDto {
  const refundable = parseRefundMoney(budget.refundableBalance);
  return {
    contractId: CHECK_REFUND_API_CONTRACT_ID,
    contractVersion: CHECK_REFUND_API_CONTRACT_VERSION,
    restaurantId,
    checkId,
    settledValue: budget.settledValue,
    appliedRefundTotal: budget.appliedRefundTotal,
    refundableBalance: budget.refundableBalance,
    priorSettlementRecordId: budget.priorSettlementRecordId,
    nextRecordGeneration: budget.nextRecordGeneration,
    eligible: refundable > 0,
  };
}

/**
 * Operational Check Refund façade (Settlement Ledger entry):
 * - lookupByInvoiceNumber (primary human-facing identity)
 * - lookupBySettlementNumber (legacy ST- secondary)
 * - getBudget
 * - applyOnCheck (tRPC reserves the name `apply`)
 */
export const checkRefundRouter = router({
  lookupByInvoiceNumber: verifiedProcedure
    .input(lookupInvoiceInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "checkRefund.lookupByInvoiceNumber"
      );
      return runCheckRefundApi(() =>
        lookupCheckRefundByInvoiceNumber({
          restaurantId: input.restaurantId,
          invoiceNumber: input.invoiceNumber,
        })
      );
    }),

  lookupBySettlementNumber: verifiedProcedure
    .input(lookupSettlementInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "checkRefund.lookupBySettlementNumber"
      );
      return runCheckRefundApi(() =>
        lookupCheckRefundBySettlementNumber({
          restaurantId: input.restaurantId,
          settlementNumber: input.settlementNumber,
        })
      );
    }),

  getBudget: verifiedProcedure
    .input(budgetInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "checkRefund.getBudget"
      );
      return runCheckRefundApi(async () => {
        const budget = await getCheckRefundBudget({
          restaurantId: input.restaurantId,
          checkId: input.checkId,
        });
        return toBudgetDto(input.restaurantId, input.checkId, budget);
      });
    }),

  applyOnCheck: verifiedProcedure
    .input(applyInput)
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "checkRefund.applyOnCheck"
      );
      return runCheckRefundApi(async () => {
        await assertRefundPolicyAllowsApply({
          restaurantId: input.restaurantId,
          checkId: input.checkId,
          amount: input.amount,
          reason: input.reason,
          managerApproved: input.managerApproved,
        });

        const result = await applyRefundOnCheck({
          restaurantId: input.restaurantId,
          checkId: input.checkId,
          amount: input.amount,
          reason: input.reason,
          tenderMethod: input.tenderMethod,
          settlementContextHints: {
            registerId: input.registerId ?? undefined,
            operatorUserId: ctx.user?.id,
          },
        });

        const dto: CheckRefundApplyResultDto = {
          contractId: CHECK_REFUND_API_CONTRACT_ID,
          contractVersion: CHECK_REFUND_API_CONTRACT_VERSION,
          restaurantId: input.restaurantId,
          checkId: input.checkId,
          outcome:
            result.outcome === "already_applied" ? "already_applied" : "applied",
          refundableBalanceRemaining: result.remainingBudget,
          settledValue: result.settledValue,
          appliedRefundTotal: result.appliedRefundTotal,
          settlementRecordId: result.settlementRecord?.settlementRecordId ?? null,
          recordGeneration: result.settlementRecord?.recordGeneration ?? null,
          recordKind: result.settlementRecord?.recordKind ?? null,
        };
        return dto;
      });
    }),
});
