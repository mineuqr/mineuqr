/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 — map domain refund errors to tRPC.
 */

import { TRPCError } from "@trpc/server";
import { RefundDomainError } from "@shared/operational-session";

export function throwCheckRefundApiError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }
  if (error instanceof RefundDomainError) {
    switch (error.code) {
      case "BUDGET_EXCEEDED":
      case "ALREADY_REFUNDED":
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: error.message,
          cause: error,
        });
      case "CHECK_NOT_REFUNDABLE":
      case "NO_PRIOR_SETTLEMENT":
      case "INVALID_STATE":
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: error.message,
          cause: error,
        });
      case "TENANT_ISOLATION":
        throw new TRPCError({
          code: "FORBIDDEN",
          message: error.message,
          cause: error,
        });
      case "INVALID_MONEY":
      case "ALLOCATION_OVERFLOW":
      case "BUDGET_NEGATIVE":
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
          cause: error,
        });
      case "DUPLICATE_REFUND":
      case "CONCURRENT_GENERATION":
      case "IDENTITY_VIOLATION":
        throw new TRPCError({
          code: "CONFLICT",
          message: error.message,
          cause: error,
        });
      default:
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
          cause: error,
        });
    }
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unable to execute refund",
  });
}

export function runCheckRefundApi<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error: unknown) => throwCheckRefundApiError(error));
}
