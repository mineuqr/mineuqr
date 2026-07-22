/**
 * SPLIT-PAYMENT-API-1 — canonical API error mapping.
 * Never expose Domain / Repository / Database internals.
 */

import { TRPCError } from "@trpc/server";

export class SplitPaymentProjectionUnavailableError extends Error {
  constructor(message = "Split Payment projection unavailable") {
    super(message);
    this.name = "SplitPaymentProjectionUnavailableError";
  }
}

export function throwSplitPaymentApiError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }
  if (error instanceof SplitPaymentProjectionUnavailableError) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Split Payment projection unavailable",
    });
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unable to load Split Payment",
  });
}

export function runSplitPaymentRead<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error: unknown) => throwSplitPaymentApiError(error));
}
