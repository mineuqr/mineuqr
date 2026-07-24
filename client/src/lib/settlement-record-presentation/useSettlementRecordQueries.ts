/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — tRPC hooks over settlementRecord.* only.
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
  input: { restaurantId: number; settlementRecordId: string },
  options: Enabled = {}
) {
  return trpc.settlementRecord.getReceipt.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.settlementRecordId.length > 0,
    staleTime: 30_000,
  });
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

export function useInvalidateSettlementRecordQueries() {
  const utils = trpc.useUtils();
  return async (restaurantId: number) => {
    await Promise.all([
      utils.settlementRecord.listByRestaurant.invalidate({ restaurantId }),
      utils.settlementRecord.listBySession.invalidate(),
      utils.settlementRecord.getById.invalidate(),
      utils.settlementRecord.getByCheck.invalidate(),
      utils.settlementRecord.getReceipt.invalidate(),
    ]);
  };
}
