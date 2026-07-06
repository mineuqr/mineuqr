export type KitchenQueueFailureKind = "database_unavailable" | "fetch_failed";

export function classifyKitchenQueueFailure(error: unknown): KitchenQueueFailureKind | null {
  if (error == null) return null;
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("database_unavailable")) {
    return "database_unavailable";
  }
  return "fetch_failed";
}

export function kitchenQueueOperatorMessage(
  kind: KitchenQueueFailureKind,
  language: string
): string {
  const isAr = language === "ar";
  if (kind === "database_unavailable") {
    return isAr
      ? "بيانات الطلبات غير متاحة مؤقتاً — لا يمكن عرض الطابور الآن."
      : "Order data is temporarily unavailable — the kitchen queue cannot be loaded.";
  }
  return isAr
    ? "تعذر تحميل طابور المطبخ — تحقق من الاتصال وحاول مرة أخرى."
    : "Kitchen queue could not be loaded — check the connection and retry.";
}

export function kitchenStaleDataMessage(language: string): string {
  return language === "ar"
    ? "يتم عرض آخر بيانات معروفة — الاتصال ضعيف أو الطلب فشل."
    : "Showing last known data — connection degraded or fetch failed.";
}
