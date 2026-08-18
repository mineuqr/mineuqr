/**
 * CASHIER-SETTLEMENT-UNKNOWN-RESULT-RECOVERY-1
 * Classifies settlement command failures. Not financial authority.
 * Does not settle. Does not invent Paid.
 */

import { TRPCClientError } from "@trpc/client";
import { classifyCashierRegisterGap } from "./cashierRegisterGap";
import { classifyQueryError } from "@/lib/ui-state/classifyQueryError";

export type CashierSettlementFailureClass =
  | "DEFINITELY_NOT_PAID"
  | "UNKNOWN_RESULT";

const PRE_COMMIT_POS_CODES = new Set([
  "pos_permission_denied",
  "terminal_not_found",
  "terminal_foreign",
  "terminal_inactive",
  "entitlement_unavailable",
  "invalid_session",
  "invalid_idempotency_key",
  "order_not_found",
  "order_wrong_restaurant",
  "order_not_eligible",
  "check_not_found",
  "check_wrong_restaurant",
  "check_not_eligible",
]);

const UNKNOWN_POS_CODES = new Set([
  "check_already_terminal",
  "concurrency_conflict",
  "idempotency_conflict",
]);

export function posCodeFromSettlementError(error: unknown): string | null {
  if (!(error instanceof TRPCClientError)) return null;
  const data = error.data as { posCode?: unknown } | undefined;
  if (typeof data?.posCode === "string" && data.posCode.trim().length > 0) {
    return data.posCode;
  }
  return null;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
}

/**
 * UNKNOWN_RESULT: commit may already have occurred (timeout, transport,
 * terminal Check, concurrency). DEFINITELY_NOT_PAID: pre-commit gates.
 */
export function classifyCashierSettlementFailure(
  error: unknown
): CashierSettlementFailureClass {
  if (classifyCashierRegisterGap(error) != null) {
    return "DEFINITELY_NOT_PAID";
  }

  const posCode = posCodeFromSettlementError(error);
  if (posCode && PRE_COMMIT_POS_CODES.has(posCode)) {
    return "DEFINITELY_NOT_PAID";
  }
  if (posCode && UNKNOWN_POS_CODES.has(posCode)) {
    return "UNKNOWN_RESULT";
  }

  const kind = classifyQueryError(error);
  if (kind === "forbidden" || kind === "unauthorized") {
    return "DEFINITELY_NOT_PAID";
  }
  if (kind === "network" || kind === "database" || kind === "unknown") {
    return "UNKNOWN_RESULT";
  }

  if (error instanceof TRPCClientError) {
    const code = String(error.data?.code ?? "");
    if (
      code === "TIMEOUT" ||
      code === "CLIENT_CLOSED_REQUEST" ||
      code === "INTERNAL_SERVER_ERROR" ||
      code === "CONFLICT"
    ) {
      return "UNKNOWN_RESULT";
    }
  }

  const message = messageOf(error).toLowerCase();
  if (
    message.includes("already terminal") ||
    message.includes("aborted") ||
    /\btimeout\b/.test(message) ||
    message.includes("failed to fetch") ||
    message.includes("network")
  ) {
    return "UNKNOWN_RESULT";
  }

  if (error instanceof Error && error.name === "AbortError") {
    return "UNKNOWN_RESULT";
  }

  // Unproven BAD_REQUEST (tender validation, etc.): do not recover.
  return "DEFINITELY_NOT_PAID";
}
