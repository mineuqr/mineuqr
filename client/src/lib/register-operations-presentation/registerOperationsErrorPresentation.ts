/**
 * REGISTER-OPERATIONS-UI-1 — API error → operator messages.
 * Never expose stack traces or internal codes beyond TRPC code.
 */

export type RegisterOperationsErrorKind =
  | "not_found"
  | "bad_request"
  | "conflict"
  | "forbidden"
  | "unauthorized"
  | "offline"
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
  language: "ar" | "en",
  apiMessage?: string
): string {
  // Prefer server operator message when present (already mapped, no stack).
  if (
    apiMessage &&
    apiMessage.length > 0 &&
    apiMessage.length < 200 &&
    !/at\s+\w+|Error:|stack/i.test(apiMessage)
  ) {
    if (kind === "conflict" || kind === "bad_request" || kind === "not_found") {
      return apiMessage;
    }
  }
  if (kind === "not_found") {
    return language === "ar" ? "الصندوق غير موجود" : "Register not found";
  }
  if (kind === "bad_request") {
    return language === "ar" ? "طلب غير صالح" : "Invalid register request";
  }
  if (kind === "conflict") {
    return language === "ar"
      ? "تعارض في حالة الصندوق — حدّث ثم أعد المحاولة"
      : "Register state conflict — refresh and retry";
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

export function extractTrpcMessage(error: unknown): string | undefined {
  const err = error as { message?: string };
  return typeof err?.message === "string" ? err.message : undefined;
}
