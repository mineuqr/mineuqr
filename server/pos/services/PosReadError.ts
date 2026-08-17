/**
 * POS-READ-APIS-IMPLEMENTATION-1
 * Read-path errors. Not a domain mutation. Not occupancy.
 */

import { TRPCError } from "@trpc/server";

export class PosReadError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PosReadError";
    this.code = code;
  }
}

const FORBIDDEN_CODES = new Set([
  "pos_permission_denied",
  "terminal_not_found",
  "terminal_foreign",
  "terminal_inactive",
  "entitlement_unavailable",
  "restaurant_access_denied",
]);

export function mapPosReadError(err: unknown): never {
  if (err instanceof PosReadError) {
    if (err.code === "not_found") {
      throw new TRPCError({ code: "NOT_FOUND", message: err.message });
    }
    if (FORBIDDEN_CODES.has(err.code)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" });
    }
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  throw err;
}
