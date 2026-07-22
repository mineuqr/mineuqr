/**
 * SPLIT-PAYMENT-PRESENTATION-ADOPTION-1 — tRPC hooks over splitPayment.* only.
 */

import { trpc } from "@/lib/trpc";

type Enabled = { enabled?: boolean };

/** Payments for a Check — canonical list source. */
export function useSplitPaymentsByCheck(
  input: { restaurantId: number; checkId: number },
  options: Enabled = {}
) {
  return trpc.splitPayment.listByCheck.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.checkId > 0,
    staleTime: 15_000,
  });
}

/** Check-scoped outstanding projection. */
export function useSplitPaymentOutstanding(
  input: { restaurantId: number; checkId: number },
  options: Enabled = {}
) {
  return trpc.splitPayment.getOutstanding.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.checkId > 0,
    staleTime: 15_000,
  });
}

/** Status-count summary for a Check (API-authored counts). */
export function useSplitPaymentSummaryByCheck(
  input: { restaurantId: number; checkId: number },
  options: Enabled = {}
) {
  return trpc.splitPayment.getSummaryByCheck.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.checkId > 0,
    staleTime: 15_000,
  });
}

/** Payment timeline envelope. */
export function useSplitPaymentTimeline(
  input: { restaurantId: number; checkId: number; paymentId: string },
  options: Enabled = {}
) {
  return trpc.splitPayment.getTimeline.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.checkId > 0 &&
      input.paymentId.length > 0,
    staleTime: 15_000,
  });
}

/** Attempts for a Payment. */
export function useSplitPaymentAttempts(
  input: { restaurantId: number; checkId: number; paymentId: string },
  options: Enabled = {}
) {
  return trpc.splitPayment.getAttempts.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.checkId > 0 &&
      input.paymentId.length > 0,
    staleTime: 15_000,
  });
}

/** Attempts for a Check. */
export function useSplitPaymentAttemptsByCheck(
  input: { restaurantId: number; checkId: number },
  options: Enabled = {}
) {
  return trpc.splitPayment.listAttemptsByCheck.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.checkId > 0,
    staleTime: 15_000,
  });
}

/** Projection / API contract catalog metadata (diagnostics). */
export function useSplitPaymentProjectionMetadata(
  input: { restaurantId: number },
  options: Enabled = {}
) {
  return trpc.splitPayment.getProjectionMetadata.useQuery(input, {
    enabled: (options.enabled ?? true) && input.restaurantId > 0,
    staleTime: 60_000,
  });
}

/** Invalidate Split Payment reads after financial mutations. */
export function useInvalidateSplitPaymentQueries() {
  const utils = trpc.useUtils();
  return async (restaurantId: number) => {
    await Promise.all([
      utils.splitPayment.listByRestaurant.invalidate({ restaurantId }),
      utils.splitPayment.listByCheck.invalidate(),
      utils.splitPayment.getByCheck.invalidate(),
      utils.splitPayment.getByPayment.invalidate(),
      utils.splitPayment.getOutstanding.invalidate(),
      utils.splitPayment.getSummaryByCheck.invalidate(),
      utils.splitPayment.getTimeline.invalidate(),
      utils.splitPayment.getAttempts.invalidate(),
      utils.splitPayment.listAttemptsByCheck.invalidate(),
      utils.splitPayment.getByAttempt.invalidate(),
    ]);
  };
}
