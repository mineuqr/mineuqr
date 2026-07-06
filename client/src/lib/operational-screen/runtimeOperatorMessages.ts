import type { ScreenStateError } from "./state/operationalScreenStateContract";

const GENERIC_RUNTIME: Record<"en" | "ar", string> = {
  en: "Screen connection issue — retrying automatically.",
  ar: "مشكلة في اتصال الشاشة — تتم إعادة المحاولة تلقائياً.",
};

const STATUS_UNAVAILABLE: Record<"en" | "ar", string> = {
  en: "Screen status temporarily unavailable.",
  ar: "حالة الشاشة غير متاحة مؤقتاً.",
};

const HEARTBEAT_FAILED: Record<"en" | "ar", string> = {
  en: "Heartbeat failed — connection may be degraded.",
  ar: "فشل نبض الاتصال — قد يكون الاتصال ضعيفاً.",
};

function languageKey(language: string): "en" | "ar" {
  return language === "ar" ? "ar" : "en";
}

/** Map internal runtime errors to operator-safe messages (no stack traces or codes). */
export function toOperatorRuntimeMessage(
  error: ScreenStateError,
  language: string
): string {
  const lang = languageKey(language);
  const raw = error.message.toLowerCase();

  if (raw.includes("database_unavailable")) {
    return language === "ar"
      ? "بيانات التشغيل غير متاحة مؤقتاً."
      : "Operational data is temporarily unavailable.";
  }
  if (raw.includes("status_unavailable")) {
    return STATUS_UNAVAILABLE[lang];
  }
  if (raw.includes("heartbeat_failed") || raw.includes("heartbeat")) {
    return HEARTBEAT_FAILED[lang];
  }

  return GENERIC_RUNTIME[lang];
}
