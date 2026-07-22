/**
 * ORDER-SETTLEMENT-API-1 — canonical API error mapping.
 * Never expose Domain / Repository / Database internals.
 */

import { TRPCError } from "@trpc/server";

export class OrderSettlementProjectionUnavailableError extends Error {
  constructor(message = "Order Settlement projection unavailable") {
    super(message);
    this.name = "OrderSettlementProjectionUnavailableError";
  }
}

export function throwOrderSettlementApiError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }
  if (error instanceof OrderSettlementProjectionUnavailableError) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Order Settlement projection unavailable",
    });
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unable to load Order Settlement",
  });
}

export function runOrderSettlementRead<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error: unknown) => throwOrderSettlementApiError(error));
}
