/**
 * REGISTER-OPERATIONS-UI-UX-REFINEMENT-1 — operator-friendly errors only.
 * Never expose raw API / stack messages.
 */

export type RegisterOperationsErrorKind =
  | "not_found"
  | "bad_request"
  | "conflict"
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
  if (code === "NOT_FOUND") return "not_found";
  if (code === "BAD_REQUEST") return "bad_request";
  if (code === "CONFLICT") return "conflict";
  if (code === "FORBIDDEN") return "forbidden";
  if (code === "UNAUTHORIZED") return "unauthorized";
  if (code === "PRECONDITION_FAILED") return "unavailable";
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
  if (kind === "bad_request") {
    return language === "ar" ? "طلب غير صالح — راجع المدخلات" : "Invalid request — check the inputs";
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
