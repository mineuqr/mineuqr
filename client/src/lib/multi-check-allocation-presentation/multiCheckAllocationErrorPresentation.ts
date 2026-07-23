/**
 * MULTI-CHECK-ALLOCATION-PRESENTATION-1 — map API errors to display kinds.
 * Never expose Domain / Repository / Database messages.
 */

import { TRPCClientError } from "@trpc/client";
import {
  multiCheckAllocationUiLabel,
  type MultiCheckAllocationLang,
} from "./multiCheckAllocationCopy";

export type MultiCheckAllocationErrorKind =
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "projectionUnavailable"
  | "unexpected";

export function mapMultiCheckAllocationApiError(
  error: unknown
): MultiCheckAllocationErrorKind {
  if (!(error instanceof TRPCClientError)) return "unexpected";
  const code = error.data?.code;
  if (code === "UNAUTHORIZED") return "unauthorized";
  if (code === "FORBIDDEN") return "forbidden";
  if (code === "NOT_FOUND") return "notFound";
  if (code === "CONFLICT" || code === "BAD_REQUEST") return "conflict";
  if (code === "PRECONDITION_FAILED") return "projectionUnavailable";
  return "unexpected";
}

export function multiCheckAllocationErrorMessage(
  kind: MultiCheckAllocationErrorKind,
  language: MultiCheckAllocationLang,
  options?: { mutation?: boolean }
): string {
  switch (kind) {
    case "unauthorized":
      return multiCheckAllocationUiLabel("unauthorized", language);
    case "forbidden":
      return multiCheckAllocationUiLabel("forbidden", language);
    case "notFound":
      return multiCheckAllocationUiLabel("notFound", language);
    case "conflict":
      return multiCheckAllocationUiLabel("conflict", language);
    case "projectionUnavailable":
      return multiCheckAllocationUiLabel("projectionUnavailable", language);
    default:
      return multiCheckAllocationUiLabel(
        options?.mutation ? "mutationUnexpected" : "unexpected",
        language
      );
  }
}
