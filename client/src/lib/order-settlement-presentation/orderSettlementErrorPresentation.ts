/**
 * ORDER-SETTLEMENT-PRESENTATION-ADOPTION-1 — map API errors to display kinds.
 * Never expose Domain / Repository / Database messages.
 */

import { TRPCClientError } from "@trpc/client";
import {
  orderSettlementUiLabel,
  type OrderSettlementLang,
} from "./orderSettlementCopy";

export type OrderSettlementErrorKind =
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "projectionUnavailable"
  | "unexpected";

export function mapOrderSettlementApiError(
  error: unknown
): OrderSettlementErrorKind {
  if (!(error instanceof TRPCClientError)) return "unexpected";
  const code = error.data?.code;
  if (code === "UNAUTHORIZED") return "unauthorized";
  if (code === "FORBIDDEN") return "forbidden";
  if (code === "NOT_FOUND") return "notFound";
  if (code === "PRECONDITION_FAILED") return "projectionUnavailable";
  return "unexpected";
}

export function orderSettlementErrorMessage(
  kind: OrderSettlementErrorKind,
  language: OrderSettlementLang
): string {
  switch (kind) {
    case "unauthorized":
      return orderSettlementUiLabel("unauthorized", language);
    case "forbidden":
      return orderSettlementUiLabel("forbidden", language);
    case "notFound":
      return orderSettlementUiLabel("notFound", language);
    case "projectionUnavailable":
      return orderSettlementUiLabel("projectionUnavailable", language);
    default:
      return orderSettlementUiLabel("unexpected", language);
  }
}
