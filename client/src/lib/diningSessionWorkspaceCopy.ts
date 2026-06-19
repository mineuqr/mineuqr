/**
 * TABLE-MANAGEMENT-1 UX-1B — session workspace summary copy and formatting.
 */

type Lang = "ar" | "en";

export function formatSessionDuration(durationMs: number, language: Lang): string {
  const totalMinutes = Math.floor(durationMs / 60_000);
  if (totalMinutes < 1) {
    return language === "ar" ? "أقل من دقيقة" : "Less than 1 min";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (language === "ar") {
    if (hours === 0) {
      if (totalMinutes === 2) return "دقيقتان";
      return `${totalMinutes} دقيقة`;
    }
    if (minutes === 0) {
      return hours === 1 ? "ساعة واحدة" : `${hours} ساعات`;
    }
    const hourPart = hours === 1 ? "ساعة واحدة" : `${hours} ساعات`;
    const minPart = minutes === 2 ? "دقيقتان" : `${minutes} دقيقة`;
    return `${hourPart} ${minPart}`;
  }

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function computeWorkspaceDurationMs(
  openedAt: string,
  closedAt: string | null,
  status: string,
  now: Date = new Date()
): number {
  const normalize = (value: string) =>
    value.includes("T") ? value : value.replace(" ", "T") + "Z";

  const start = Date.parse(normalize(openedAt));
  if (!Number.isFinite(start)) return 0;

  let endMs = now.getTime();
  if (status === "closed" && closedAt) {
    const closed = Date.parse(normalize(closedAt));
    if (Number.isFinite(closed)) endMs = closed;
  }

  return Math.max(0, endMs - start);
}

export function formatSessionTotalAmount(
  amount: string,
  currencySymbol: string,
  language: Lang
): string {
  const parsed = Number.parseFloat(amount);
  const display = Number.isFinite(parsed) ? parsed.toFixed(2) : amount;
  return language === "ar" ? `${display} ${currencySymbol}` : `${display} ${currencySymbol}`;
}

export const sessionSummaryLabels = {
  openedAt: { ar: "بدأت", en: "Started" },
  startedAt: { ar: "وقت البدء", en: "Started At" },
  duration: { ar: "المدة", en: "Duration" },
  orders: { ar: "الطلبات", en: "Orders" },
  sessionTotal: { ar: "إجمالي الجلسة", en: "Session total" },
  ordersInSession: { ar: "الطلبات في الجلسة", en: "Orders in session" },
  timeline: { ar: "سجل الجلسة", en: "Session timeline" },
  noOrders: { ar: "لا توجد طلبات مرتبطة بهذه الجلسة", en: "No orders linked to this session" },
  loadError: { ar: "تعذر تحميل الجلسة", en: "Unable to load session" },
  sessionNotFound: { ar: "الجلسة غير موجودة", en: "Session not found" },
  overview: { ar: "نظرة عامة", en: "Session Overview" },
  ordersSummary: { ar: "ملخص الطلبات", en: "Orders Summary" },
  settlementSummary: { ar: "ملخص التسوية", en: "Settlement Summary" },
  sessionId: { ar: "رقم الجلسة", en: "Session ID" },
  table: { ar: "الطاولة", en: "Table" },
  status: { ar: "الحالة", en: "Status" },
  ordersCount: { ar: "عدد الطلبات", en: "Orders Count" },
  itemsCount: { ar: "عدد الأصناف", en: "Items Count" },
  orderValue: { ar: "قيمة الطلبات", en: "Order Value" },
  settlementMethod: { ar: "طريقة التسوية", en: "Settlement Method" },
  settlementAmount: { ar: "مبلغ التسوية", en: "Settlement Amount" },
  settlementTime: { ar: "وقت التسوية", en: "Settlement Time" },
  settlementPending: {
    ar: "لم تُسوَّ الجلسة بعد",
    en: "Settlement pending",
  },
  settlementPaid: { ar: "مدفوعة", en: "Paid" },
  settlementComplimentary: { ar: "ضيافة", en: "Complimentary" },
  actions: { ar: "إجراءات الجلسة", en: "Session Actions" },
} as const;

export function sessionSummaryLabel(
  key: keyof typeof sessionSummaryLabels,
  language: Lang
): string {
  return sessionSummaryLabels[key][language];
}
