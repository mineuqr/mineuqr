/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — error presentation.
 */

export type SettlementRecordErrorKind =
  | "not_found"
  | "unavailable"
  | "unauthorized"
  | "unknown";

export function mapSettlementRecordApiError(error: unknown): SettlementRecordErrorKind {
  const err = error as { data?: { code?: string }; message?: string };
  const code = err?.data?.code;
  if (code === "NOT_FOUND") return "not_found";
  if (code === "PRECONDITION_FAILED") return "unavailable";
  if (code === "UNAUTHORIZED" || code === "FORBIDDEN") return "unauthorized";
  return "unknown";
}

export function settlementRecordErrorMessage(
  kind: SettlementRecordErrorKind,
  language: "ar" | "en"
): string {
  if (kind === "not_found") {
    return language === "ar" ? "التسوية غير موجودة" : "Settlement not found";
  }
  if (kind === "unavailable") {
    return language === "ar" ? "التسوية غير متاحة حالياً" : "Settlement unavailable";
  }
  if (kind === "unauthorized") {
    return language === "ar" ? "غير مصرح" : "Not authorized";
  }
  return language === "ar" ? "تعذر تحميل التسوية" : "Could not load settlement";
}
