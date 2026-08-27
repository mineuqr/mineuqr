import { TRPCError } from "@trpc/server";
import { LifecycleSettlementGuardError } from "@shared/operational-session";
import { CashierHandoffError } from "../pos/cashier-handoff/cashierHandoffErrors";
import {
  OperationalSessionAnchorNotActivatedError,
  OperationalSessionValidationError,
} from "../operational-session/operationalSessionErrors";
import {
  DiningSessionConflictError,
  DiningSessionExpiredError,
  DiningSessionNotFoundError,
  DiningSessionUnavailableError,
  DiningSessionValidationError,
  DiningSessionTransitionError,
} from "./sessionTypes";

/** Map dining / operational session domain errors to tRPC errors. */
export function throwSessionServiceTrpcError(err: unknown): never {
  if (err instanceof CashierHandoffError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  if (err instanceof LifecycleSettlementGuardError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  if (err instanceof OperationalSessionValidationError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  if (err instanceof OperationalSessionAnchorNotActivatedError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  if (err instanceof DiningSessionValidationError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  if (err instanceof DiningSessionTransitionError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  if (err instanceof DiningSessionExpiredError) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "انتهت جلسة الطاولة",
    });
  }
  if (err instanceof DiningSessionNotFoundError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  if (err instanceof DiningSessionUnavailableError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "تعذر بدء جلسة الطاولة",
    });
  }
  if (err instanceof DiningSessionConflictError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "تعذر بدء جلسة الطاولة",
    });
  }
  throw err;
}
