/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 / REFUND-SETTLEMENT-RECORD-ADOPTION-1
 * REFUND-PRESENTATION-ADOPTION-1
 * tRPC hooks over settlementRecord.* only — recordKind filter includes refund.
 */

import { trpc } from "@/lib/trpc";

type Enabled = { enabled?: boolean };

export function useSettlementRecordHistory(
  input: {
    restaurantId: number;
    page?: number;
    pageSize?: number;
    search?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    outcome?: "paid" | "complimentary" | "voided" | null;
    recordKind?:
      | "settlement"
      | "refund"
      | "void"
      | "reversal"
      | "correction"
      | null;
  },
  options: Enabled = {}
) {
  return trpc.settlementRecord.listByRestaurant.useQuery(input, {
    enabled: (options.enabled ?? true) && input.restaurantId > 0,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}

export function useSettlementRecordDetail(
  input: { restaurantId: number; settlementRecordId: string },
  options: Enabled = {}
) {
  return trpc.settlementRecord.getById.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.settlementRecordId.length > 0,
    staleTime: 30_000,
  });
}

export function useSettlementRecordReceipt(
  input: {
    restaurantId: number;
    settlementRecordId?: string | null;
    orderId?: number | null;
  },
  options: Enabled = {}
) {
  const settlementRecordId = input.settlementRecordId?.trim() ?? "";
  const orderId = input.orderId ?? null;
  const hasIdentity =
    settlementRecordId.length > 0 ||
    (orderId != null && orderId > 0);
  return trpc.settlementRecord.getReceipt.useQuery(
    {
      restaurantId: input.restaurantId,
      settlementRecordId: settlementRecordId.length > 0 ? settlementRecordId : null,
      orderId: settlementRecordId.length > 0 ? null : orderId,
    },
    {
      enabled:
        (options.enabled ?? true) &&
        input.restaurantId > 0 &&
        hasIdentity,
      staleTime: 30_000,
    }
  );
}

export function useSettlementRecordsBySession(
  input: { restaurantId: number; sessionId: number },
  options: Enabled = {}
) {
  return trpc.settlementRecord.listBySession.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.sessionId > 0,
    staleTime: 15_000,
  });
}

/** Compensating chain / timeline for a Check (read-only). */
export function useSettlementRecordsByCheck(
  input: { restaurantId: number; checkId: number },
  options: Enabled = {}
) {
  return trpc.settlementRecord.getByCheck.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.checkId > 0,
    staleTime: 15_000,
  });
}

export function useInvalidateSettlementRecordQueries() {
  const utils = trpc.useUtils();
  return async (restaurantId: number) => {
    await Promise.all([
      utils.settlementRecord.listByRestaurant.invalidate({ restaurantId }),
      utils.settlementRecord.listBySession.invalidate(),
      utils.settlementRecord.getById.invalidate(),
      utils.settlementRecord.getByCheck.invalidate(),
      utils.settlementRecord.getReceipt.invalidate(),
      utils.checkRefund.getBudget.invalidate(),
    ]);
  };
}

/** Domain budget façade — eligibility/display only. */
export function useCheckRefundBudget(
  input: { restaurantId: number; checkId: number },
  options: Enabled = {}
) {
  return trpc.checkRefund.getBudget.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.checkId > 0,
    staleTime: 10_000,
  });
}

/** Settlement Ledger lookup by Settlement Number (ADOPTION-2). */
export function useLookupCheckRefundBySettlementNumber(
  input: { restaurantId: number; settlementNumber: string },
  options: Enabled = {}
) {
  return trpc.checkRefund.lookupBySettlementNumber.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.settlementNumber.trim().length > 0,
    staleTime: 5_000,
    retry: false,
  });
}

/** Applies refund via Check Aggregate façade (no presentation money math). */
export function useApplyCheckRefund() {
  const utils = trpc.useUtils();
  return trpc.checkRefund.applyOnCheck.useMutation({
    onSuccess: async (_data, variables) => {
      await Promise.all([
        utils.settlementRecord.listByRestaurant.invalidate({
          restaurantId: variables.restaurantId,
        }),
        utils.settlementRecord.getByCheck.invalidate({
          restaurantId: variables.restaurantId,
          checkId: variables.checkId,
        }),
        utils.settlementRecord.getById.invalidate(),
        utils.settlementRecord.getReceipt.invalidate(),
        utils.checkRefund.getBudget.invalidate({
          restaurantId: variables.restaurantId,
          checkId: variables.checkId,
        }),
        utils.checkRefund.lookupBySettlementNumber.invalidate(),
      ]);
    },
  });
}
