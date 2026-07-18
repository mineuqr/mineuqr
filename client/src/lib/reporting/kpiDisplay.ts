/**
 * REPORTING-KPI-GOVERNANCE-1 — presentation labels from canonical KPI registry.
 * Does not calculate KPI values.
 */
import { getKpiDefinition, type KpiId } from "@shared/reporting-platform";

const AR_LABELS: Partial<Record<KpiId, string>> = {
  revenue: "الإيرادات",
  paidCheckCount: "شيكات مدفوعة",
  taxCollected: "الضريبة المحصّلة",
  averageCheck: "متوسط الشيك",
  complimentaryCount: "شيكات مجانية",
  complimentaryAmount: "قيمة الشيكات المجانية",
  voidedCount: "الشيكات الملغاة",
  orderSales: "مبيعات الطلبات",
  averageOrder: "متوسط قيمة الطلب",
  orderCount: "عدد الطلبات",
  completedOrders: "الطلبات المكتملة",
  dailySales: "المبيعات اليومية",
  activeSessions: "الجلسات النشطة",
  occupiedTables: "الطاولات المشغولة",
  pendingOrders: "الطلبات المعلقة",
  activeOrders: "الطلبات النشطة",
  kitchenLoad: "حمل المطبخ",
  catalogCategoryCount: "التصنيفات",
  catalogItemCount: "الأصناف",
  menuVisits: "زيارات القائمة",
};

/** Canonical display name — English from KPI_DICTIONARY; Arabic from locale map. */
export function kpiDisplayName(
  id: KpiId,
  language: "ar" | "en"
): string {
  if (language === "ar") {
    return AR_LABELS[id] ?? getKpiDefinition(id).name;
  }
  return getKpiDefinition(id).name;
}
