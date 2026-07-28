/**
 * REPORTING-PRODUCT-POLISH-1 — Orders Details (presentation from existing DTOs).
 */
import { ClipboardList, CheckCircle2, ShoppingBag } from "lucide-react";
import { RestaurantDashSection } from "./RestaurantDashSection";
import { SemanticKpiCard } from "@/design-system/semantic-card";
import { restaurantDash } from "./restaurantDashStyles";
import { preferredKpiLabel } from "@shared/reporting-platform";
import { cn } from "@/lib/utils";

export function OrdersDetailsSection({
  language,
  orderCount,
  completedOrders,
  orderSalesDisplay,
  sectionId,
  emphasized,
}: {
  language: string;
  orderCount: number | null | undefined;
  completedOrders: number | null | undefined;
  orderSalesDisplay: string;
  sectionId?: string;
  emphasized?: boolean;
}) {
  const isAr = language === "ar";
  const lang = isAr ? "ar" : "en";
  const title = isAr ? "تفاصيل الطلبات" : "Orders Details";
  const note = isAr
    ? "ملخص طلبات الفترة المحددة — لمساعدتك على فهم حجم التشغيل."
    : "Order summary for the selected period — understand operational volume at a glance.";

  return (
    <RestaurantDashSection
      id={sectionId}
      title={title}
      description={note}
      ariaLabel={title}
      className={cn(
        emphasized &&
          "rounded-2xl ring-2 ring-orange-400/40 ring-offset-2 ring-offset-slate-950"
      )}
    >
      <div className={restaurantDash.kpiGridSecondary}>
        <SemanticKpiCard
          label={preferredKpiLabel("orderCount", lang)}
          value={orderCount ?? 0}
          icon={ClipboardList}
          tone="warning"
          emphasis="secondary"
        />
        <SemanticKpiCard
          label={preferredKpiLabel("completedOrders", lang)}
          value={completedOrders ?? 0}
          icon={CheckCircle2}
          tone="success"
          emphasis="secondary"
        />
        <SemanticKpiCard
          label={preferredKpiLabel("orderSales", lang)}
          value={orderSalesDisplay}
          icon={ShoppingBag}
          tone="info"
          valueVariant="revenue"
          emphasis="supporting"
        />
      </div>
    </RestaurantDashSection>
  );
}
