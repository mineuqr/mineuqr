/**
 * ORDER-SETTLEMENT-PRESENTATION-ADOPTION-1 — tRPC hooks over orderSettlement.* only.
 */

import { trpc } from "@/lib/trpc";

type Enabled = { enabled?: boolean };

/** Settlements for a Check — canonical list source. */
export function useOrderSettlementsByCheck(
  input: { restaurantId: number; checkId: number },
  options: Enabled = {}
) {
  return trpc.orderSettlement.listByCheck.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.checkId > 0,
    staleTime: 15_000,
  });
}

/** Status-count summary for a Check (API-authored counts). */
export function useOrderSettlementSummaryByCheck(
  input: { restaurantId: number; checkId: number },
  options: Enabled = {}
) {
  return trpc.orderSettlement.getSummaryByCheck.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.checkId > 0,
    staleTime: 15_000,
  });
}

/** Settlements for an Order across Checks. */
export function useOrderSettlementsByOrder(
  input: { restaurantId: number; orderId: number },
  options: Enabled = {}
) {
  return trpc.orderSettlement.listByOrder.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.orderId > 0,
    staleTime: 15_000,
  });
}

/** Projection catalog metadata (diagnostics). */
export function useOrderSettlementProjectionMetadata(
  input: { restaurantId: number },
  options: Enabled = {}
) {
  return trpc.orderSettlement.getProjectionMetadata.useQuery(input, {
    enabled: (options.enabled ?? true) && input.restaurantId > 0,
    staleTime: 60_000,
  });
}

/** Invalidate Order Settlement reads after financial mutations. */
export function useInvalidateOrderSettlementQueries() {
  const utils = trpc.useUtils();
  return async (restaurantId: number) => {
    await Promise.all([
      utils.orderSettlement.listByRestaurant.invalidate({ restaurantId }),
      utils.orderSettlement.listByCheck.invalidate(),
      utils.orderSettlement.listByOrder.invalidate(),
      utils.orderSettlement.getSummaryByCheck.invalidate(),
      utils.orderSettlement.getByOrder.invalidate(),
    ]);
  };
}
