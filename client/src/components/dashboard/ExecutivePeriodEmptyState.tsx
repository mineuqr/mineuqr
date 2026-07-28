/**
 * REPORTING-PRODUCT-UX-RESTRUCTURE-2 + SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Premium empty / loading for executive period — adapters over Semantic Card DS.
 */
import { ClipboardList } from "lucide-react";
import {
  SemanticExecutiveEmptyState,
  SemanticExecutiveSkeleton,
} from "@/design-system/semantic-card";
import type { ExecutivePeriodScope } from "@/lib/reporting-exports/executivePeriodDashboard";

export function ExecutivePeriodEmptyState({
  scope,
  language,
  className,
}: {
  scope: ExecutivePeriodScope;
  language: "en" | "ar";
  className?: string;
}) {
  const isAr = language === "ar";
  const title =
    scope === "today"
      ? isAr
        ? "لا توجد مبيعات مسجّلة اليوم."
        : "No sales have been recorded today."
      : isAr
        ? "لا توجد مبيعات مسجّلة لهذا الشهر."
        : "No sales have been recorded this month.";
  const message =
    scope === "today"
      ? isAr
        ? "ابدأ خدمة العملاء وستظهر أرقام اليوم هنا."
        : "Start serving customers and today's business will appear here."
      : isAr
        ? "عند تسجيل الطلبات والمدفوعات ستظهر بطاقات هذا الشهر تلقائياً."
        : "When orders and payments are recorded, this month's cards will appear here.";
  const footnote = isAr
    ? "لوحة التنفيذ جاهزة عندما يبدأ النشاط"
    : "Your executive board is ready when activity begins";

  return (
    <SemanticExecutiveEmptyState
      title={title}
      message={message}
      footnote={
        <>
          <ClipboardList className="h-3.5 w-3.5" aria-hidden />
          {footnote}
        </>
      }
      className={className}
    />
  );
}

export function ExecutivePeriodDashboardSkeleton({
  className,
}: {
  className?: string;
}) {
  return <SemanticExecutiveSkeleton className={className} />;
}
