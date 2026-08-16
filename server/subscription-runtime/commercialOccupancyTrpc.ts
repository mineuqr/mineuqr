/**
 * COMMERCIAL-OCCUPANCY-ERROR-SEMANTICS-HARDENING-1
 * Shared tRPC mapping for Commercial occupancy failures.
 * Does not change checkLimit, COUNT, or the occupancy lock.
 */

import { TRPCError } from "@trpc/server";
import {
  CommercialLimitExceededError,
  CommercialOccupancyUnavailableError,
} from "./commercialLimitOccupancy";

/** Client-safe business rejection. Matches checkLimit reasonCode. */
export const COMMERCIAL_LIMIT_EXCEEDED_CLIENT_CODE = "limit_exceeded";

/** Client-safe infrastructure/capacity-resolution failure. Matches G-04 register JSON. */
export const COMMERCIAL_OCCUPANCY_UNAVAILABLE_CLIENT_CODE =
  "commercial_capacity_unavailable";

export const COMMERCIAL_OCCUPANCY_UNAVAILABLE_CLIENT_MESSAGE =
  "تعذر التحقق من سعة الخطة التجارية.";

export function throwCommercialOccupancyTrpcError(
  error: unknown,
  atLimitMessage: (cap: number, reasonCode: string) => string
): never {
  if (error instanceof CommercialLimitExceededError) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: atLimitMessage(error.cap ?? 0, error.reasonCode),
      cause: error,
    });
  }
  if (error instanceof CommercialOccupancyUnavailableError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: COMMERCIAL_OCCUPANCY_UNAVAILABLE_CLIENT_MESSAGE,
      cause: error,
    });
  }
  throw error;
}
