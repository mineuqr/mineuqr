/**
 * SPLIT-PAYMENT-PRESENTATION-ADOPTION-1 — map API errors to display kinds.
 * Never expose Domain / Repository / Database messages.
 */

import { TRPCClientError } from "@trpc/client";
import {
  splitPaymentUiLabel,
  type SplitPaymentLang,
} from "./splitPaymentCopy";

export type SplitPaymentErrorKind =
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "projectionUnavailable"
  | "unexpected";

export function mapSplitPaymentApiError(error: unknown): SplitPaymentErrorKind {
  if (!(error instanceof TRPCClientError)) return "unexpected";
  const code = error.data?.code;
  if (code === "UNAUTHORIZED") return "unauthorized";
  if (code === "FORBIDDEN") return "forbidden";
  if (code === "NOT_FOUND") return "notFound";
  if (code === "PRECONDITION_FAILED") return "projectionUnavailable";
  return "unexpected";
}

export function splitPaymentErrorMessage(
  kind: SplitPaymentErrorKind,
  language: SplitPaymentLang
): string {
  switch (kind) {
    case "unauthorized":
      return splitPaymentUiLabel("unauthorized", language);
    case "forbidden":
      return splitPaymentUiLabel("forbidden", language);
    case "notFound":
      return splitPaymentUiLabel("notFound", language);
    case "projectionUnavailable":
      return splitPaymentUiLabel("projectionUnavailable", language);
    default:
      return splitPaymentUiLabel("unexpected", language);
  }
}
