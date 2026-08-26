/**
 * REGISTER-OPERATIONS-UI-UX-REFINEMENT-1 — operator-friendly errors only.
 * Never expose raw API / stack messages.
 */

export type RegisterOperationsErrorKind =
  | "not_found"
  | "shift_not_found"
  | "no_current_shift"
  | "bad_request"
  | "conflict"
  | "stale_version"
  | "final_count_conflict"
  | "duty_blocked"
  | "forbidden"
  | "unauthorized"
  | "offline"
  | "unavailable"
  | "unknown";

export function mapRegisterOperationsApiError(
  error: unknown
): RegisterOperationsErrorKind {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "offline";
  }
  const err = error as {
    data?: { code?: string };
    message?: string;
    shape?: { data?: { code?: string } };
  };
  const code = err?.data?.code ?? err?.shape?.data?.code;
  const message = typeof err?.message === "string" ? err.message : "";
  if (code === "NOT_FOUND") {
    const m = message.toLowerCase();
    if (
      /no current (financial )?shift|no active (financial )?shift/.test(m)
    ) {
      return "no_current_shift";
    }
    if (/financial shift/.test(m)) return "shift_not_found";
    if (/register/.test(m) || /صندوق/.test(message)) return "not_found";
    return "unknown";
  }
  if (code === "BAD_REQUEST") return "bad_request";
  if (code === "FORBIDDEN") return "forbidden";
  if (code === "UNAUTHORIZED") return "unauthorized";
  if (code === "PRECONDITION_FAILED") return "unavailable";
  if (
    /state is stale|version conflict/i.test(message)
  ) {
    return "stale_version";
  }
  if (
    /final cash count does not match|different amount/i.test(message)
  ) {
    return "final_count_conflict";
  }
  if (
    /duty cannot close|financial shift is active|must be closed first/i.test(
      message
    )
  ) {
    return "duty_blocked";
  }
  if (code === "CONFLICT") return "conflict";
  if (
    typeof err?.message === "string" &&
    /network|fetch|offline|failed to fetch/i.test(err.message)
  ) {
    return "offline";
  }
  return "unknown";
}

export function registerOperationsErrorMessage(
  kind: RegisterOperationsErrorKind,
  language: "ar" | "en"
): string {
  if (kind === "not_found") {
    return language === "ar" ? "الصندوق غير موجود" : "Register not found";
  }
  if (kind === "shift_not_found") {
    return language === "ar" ? "الوردية غير موجودة" : "Financial shift not found";
  }
  if (kind === "no_current_shift") {
    return language === "ar"
      ? "لا توجد وردية حالية"
      : "No current financial shift";
  }
  if (kind === "bad_request") {
    return language === "ar" ? "طلب غير صالح — راجع المدخلات" : "Invalid request — check the inputs";
  }
  if (kind === "stale_version") {
    return language === "ar"
      ? "حالة الصندوق تغيّرت — حدّث ثم أعد المحاولة"
      : "Register state is stale — refresh and retry";
  }
  if (kind === "final_count_conflict") {
    return language === "ar"
      ? "مبلغ الإغلاق لا يطابق العدّ النقدي المسجّل"
      : "Final cash count does not match the recorded close count";
  }
  if (kind === "duty_blocked") {
    return language === "ar"
      ? "لا يمكن إغلاق الصندوق قبل إغلاق الوردية"
      : "Register duty cannot close while a financial shift is active";
  }
  if (kind === "conflict") {
    return language === "ar"
      ? "تعارض في حالة الصندوق — حدّث ثم أعد المحاولة"
      : "Register state conflict — refresh and retry";
  }
  if (kind === "unavailable") {
    return language === "ar"
      ? "الصندوق غير متاح حالياً"
      : "Register unavailable right now";
  }
  if (kind === "forbidden" || kind === "unauthorized") {
    return language === "ar" ? "غير مصرح بهذا الإجراء" : "Not authorized for this action";
  }
  if (kind === "offline") {
    return language === "ar"
      ? "لا يوجد اتصال — تحقق من الشبكة ثم أعد المحاولة"
      : "Offline — check the network and retry";
  }
  return language === "ar"
    ? "تعذر تنفيذ عملية الصندوق"
    : "Could not complete register operation";
}
