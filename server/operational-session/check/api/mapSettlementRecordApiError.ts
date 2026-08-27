/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — canonical API error mapping.
 */

import { TRPCError } from "@trpc/server";
import { SettlementRecordPersistenceError } from "../settlementRecordRepository";
import {
  AmbiguousPaidSaleReceiptError,
  PaidSaleReceiptIdentityError,
} from "./paidSaleReceiptResolution";

export function throwSettlementRecordApiError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }
  if (error instanceof AmbiguousPaidSaleReceiptError) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Paid sale receipt identity is ambiguous",
    });
  }
  if (error instanceof PaidSaleReceiptIdentityError) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Paid sale receipt not found",
    });
  }
  if (error instanceof SettlementRecordPersistenceError) {
    if (error.code === "NOT_FOUND") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Settlement Record not found",
      });
    }
    if (error.code === "UNAVAILABLE") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Settlement Record unavailable",
      });
    }
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unable to load Settlement Record",
  });
}

export function runSettlementRecordRead<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error: unknown) => throwSettlementRecordApiError(error));
}
