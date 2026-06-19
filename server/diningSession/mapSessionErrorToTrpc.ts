import { TRPCError } from "@trpc/server";
import {
  DiningSessionConflictError,
  DiningSessionNotFoundError,
  DiningSessionUnavailableError,
  DiningSessionValidationError,
  DiningSessionTransitionError,
} from "./sessionTypes";

/** Map dining session domain errors to tRPC errors (TABLE-MANAGEMENT-1 D3). */
export function throwSessionServiceTrpcError(err: unknown): never {
  if (err instanceof DiningSessionValidationError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  if (err instanceof DiningSessionTransitionError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
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
