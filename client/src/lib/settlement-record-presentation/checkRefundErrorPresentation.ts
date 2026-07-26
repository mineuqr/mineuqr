/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 — surface domain errors only.
 */

import {
  settlementRecordUiLabel,
  type SettlementRecordLang,
} from "./settlementRecordCopy";

export type CheckRefundErrorKind =
  | "budget_exhausted"
  | "already_refunded"
  | "not_refundable"
  | "permission_denied"
  | "invalid_amount"
  | "conflict"
  | "generic";

export function mapCheckRefundApiError(error: unknown): CheckRefundErrorKind {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";
  const code =
    error && typeof error === "object" && "data" in error
      ? String(
          (error as { data?: { code?: unknown } }).data?.code ??
            (error as { shape?: { data?: { code?: unknown } } }).shape?.data
              ?.code ??
            ""
        )
      : "";

  const hay = `${message} ${code}`.toLowerCase();
  if (hay.includes("forbidden") || hay.includes("permission")) {
    return "permission_denied";
  }
  if (hay.includes("already_refunded") || hay.includes("already refunded")) {
    return "already_refunded";
  }
  if (hay.includes("budget") || hay.includes("exceeded")) {
    return "budget_exhausted";
  }
  if (
    hay.includes("not_refundable") ||
    hay.includes("no_prior") ||
    hay.includes("not refundable")
  ) {
    return "not_refundable";
  }
  if (hay.includes("invalid") || hay.includes("bad_request")) {
    return "invalid_amount";
  }
  if (hay.includes("conflict") || hay.includes("duplicate")) {
    return "conflict";
  }
  return "generic";
}

export function checkRefundErrorMessage(
  kind: CheckRefundErrorKind,
  language: SettlementRecordLang
): string {
  switch (kind) {
    case "budget_exhausted":
      return settlementRecordUiLabel("refundErrorBudget", language);
    case "already_refunded":
      return settlementRecordUiLabel("refundErrorAlready", language);
    case "not_refundable":
      return settlementRecordUiLabel("refundErrorNotRefundable", language);
    case "permission_denied":
      return settlementRecordUiLabel("refundErrorPermission", language);
    case "invalid_amount":
      return settlementRecordUiLabel("refundErrorAmount", language);
    case "conflict":
      return settlementRecordUiLabel("refundErrorConflict", language);
    default:
      return settlementRecordUiLabel("refundErrorGeneric", language);
  }
}
