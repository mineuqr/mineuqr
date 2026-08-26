/**
 * CRMP-OPERATIONS-API-1 — canonical API error mapping.
 * Never expose Domain / Repository / Database internals or stack traces.
 */

import { TRPCError } from "@trpc/server";
import {
  CrmpConflictError,
  CrmpDomainError,
  CrmpImmutabilityError,
  CrmpInvalidTransitionError,
  CrmpInvariantError,
  CrmpNotFoundError,
  CrmpValidationError,
} from "@shared/crmp";

function operatorMessage(error: CrmpDomainError): string {
  // Deterministic, operator-facing; no stack / SQL / path leakage.
  switch (error.code) {
    case "NOT_FOUND": {
      const m = error.message.toLowerCase();
      if (m.includes("financial shift")) {
        return "Financial Shift not found";
      }
      return "Register not found";
    }
    case "CONFLICT":
      return "Register operation conflict";
    case "INVALID_TRANSITION":
      return "Illegal register state transition";
    case "INVARIANT_VIOLATION": {
      const m = error.message.toLowerCase();
      if (m.includes("financial shift is active")) {
        return "Register duty cannot close while a financial shift is active";
      }
      if (m.includes("duty is not closed")) {
        return "Register duty must be closed first";
      }
      if (m.includes("cannot host a financial shift")) {
        return "Register cannot host a financial shift in current state";
      }
      if (m.includes("inactive register cannot resume")) {
        return "Inactive register cannot resume";
      }
      if (m.includes("exceeds expected drawer cash")) {
        return "Drawer movement exceeds expected cash";
      }
      return "Register operation rejected";
    }
    case "VALIDATION": {
      const m = error.message.toLowerCase();
      if (m.includes("currencycode")) {
        return "Currency does not match the financial shift";
      }
      return "Invalid register operation input";
    }
    case "IMMUTABILITY_VIOLATION":
      return "Register operation not allowed";
    case "TENANT_ISOLATION":
      return "Register access denied";
    default:
      return "Unable to process register operation";
  }
}

export function throwCrmpApiError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof CrmpNotFoundError) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: operatorMessage(error),
    });
  }

  if (error instanceof CrmpConflictError) {
    const m = error.message.toLowerCase();
    throw new TRPCError({
      code: "CONFLICT",
      message: m.includes("idempotency")
        ? "Drawer movement already recorded with a different payload"
        : m.includes("does not match the active")
          ? "Financial Shift does not match the active Register"
          : m.includes("version conflict")
            ? "Register state is stale — refresh and retry"
            : m.includes("different amount")
              ? "Final cash count does not match the recorded close count"
              : operatorMessage(error),
    });
  }

  if (
    error instanceof CrmpInvalidTransitionError ||
    error instanceof CrmpInvariantError
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: operatorMessage(error),
    });
  }

  if (error instanceof CrmpValidationError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: operatorMessage(error),
    });
  }

  if (error instanceof CrmpImmutabilityError) {
    throw new TRPCError({
      code: "CONFLICT",
      message: operatorMessage(error),
    });
  }

  if (error instanceof CrmpDomainError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: operatorMessage(error),
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unable to process register operation",
  });
}

export function runCrmpRead<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error: unknown) => throwCrmpApiError(error));
}

export function runCrmpWrite<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error: unknown) => throwCrmpApiError(error));
}
