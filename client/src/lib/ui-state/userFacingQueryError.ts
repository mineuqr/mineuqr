import { TRPCClientError } from "@trpc/client";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import {
  classifyQueryError,
  isUnsafeErrorMessage,
} from "./classifyQueryError";
import type { QueryErrorKind } from "./types";

export type UiStateTranslate = (key: string) => string;

const KIND_MESSAGE_KEY: Record<QueryErrorKind, string> = {
  unauthorized: "uiState.unauthorizedDesc",
  forbidden: "uiState.forbiddenDesc",
  validation: "uiState.errorValidation",
  business_rule: "uiState.errorBusinessRule",
  network: "uiState.errorNetwork",
  database: "uiState.errorDatabase",
  unknown: "uiState.errorGeneric",
};

/**
 * Safe user-facing copy for query failures.
 * Never exposes SQL, stack traces, or ORM/implementation details.
 */
export function formatUserFacingQueryError(
  error: unknown,
  t: UiStateTranslate
): string {
  if (isEmailNotVerifiedError(error)) {
    return t("auth.trpcEmailNotVerified");
  }

  const kind = classifyQueryError(error);
  if (
    kind === "unauthorized" ||
    kind === "forbidden" ||
    kind === "network" ||
    kind === "database" ||
    kind === "unknown"
  ) {
    return t(KIND_MESSAGE_KEY[kind]);
  }

  // validation / business_rule — allow short server messages when safe
  if (error instanceof TRPCClientError) {
    const msg = String(error.message ?? "").trim();
    if (msg && !isUnsafeErrorMessage(msg)) return msg;
  }
  if (error instanceof Error) {
    const msg = error.message.trim();
    if (msg && !isUnsafeErrorMessage(msg)) return msg;
  }

  return t(KIND_MESSAGE_KEY[kind]);
}

export function userFacingErrorTitle(
  error: unknown,
  t: UiStateTranslate
): string {
  const kind = classifyQueryError(error);
  if (kind === "unauthorized") return t("uiState.unauthorizedTitle");
  if (kind === "forbidden") return t("uiState.forbiddenTitle");
  return t("uiState.errorTitle");
}
