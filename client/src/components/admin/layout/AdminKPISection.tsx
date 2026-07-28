/**
 * SEMANTIC-CARD-PLATFORM-ADOPTION-1
 * Admin KPI section — SemanticKpiCard only.
 */
import {
  Clock,
  CreditCard,
  DollarSign,
  Store,
  Users,
} from "lucide-react";
import type { AdminKPIValues } from "@/lib/admin/dashboardSummaryKpis";
import { ADMIN_EXPIRING_SOON_DAYS } from "@/lib/admin/dashboardSummaryKpis";
import { formatAdminKpiNumber, formatAdminRevenueUSD } from "@/lib/admin/formatAdminCurrency";
import { SemanticKpiCard, SEMANTIC_KPI_GRID } from "@/design-system/semantic-card";
import { AdminLoadingState } from "../operations/AdminLoadingState";
import { AdminSection } from "./AdminSection";

type AdminKPISectionProps = {
  kpis: AdminKPIValues;
  loading?: boolean;
  locale: "ar" | "en";
  title: string;
  description?: string;
  labels?: {
    activeRestaurants?: string;
    activeSubscriptions?: string;
    expiringSoon?: string;
    estimatedMrr?: string;
    totalUsers?: string;
    activeRestaurantsHint?: string;
    activeSubscriptionsHint?: string;
    expiringSoonHint?: string;
    estimatedMrrHint?: string;
  };
  loadingLabel?: string;
};

export function AdminKPISection({
  kpis,
  loading = false,
  locale,
  title,
  description,
  labels = {},
  loadingLabel,
}: AdminKPISectionProps) {
  const isAr = locale === "ar";
  const mrrDisplay = formatAdminRevenueUSD(kpis.estimatedMrr, locale);

  return (
    <AdminSection title={title} description={description}>
      {loading ? (
        <AdminLoadingState variant="kpiStrip" label={loadingLabel} />
      ) : (
        <div className={SEMANTIC_KPI_GRID.dense}>
          <SemanticKpiCard
            label={labels.activeRestaurants ?? (isAr ? "المطاعم النشطة" : "Active Restaurants")}
            value={formatAdminKpiNumber(kpis.activeRestaurants)}
            icon={Store}
            loading={loading}
            valueDir="ltr"
            tone="info"
            hint={
              labels.activeRestaurantsHint ??
              (isAr ? "اشتراك فعّال أو تجريبي" : "Active or trial subscription")
            }
          />
          <SemanticKpiCard
            label={labels.activeSubscriptions ?? (isAr ? "الاشتراكات النشطة" : "Active Subscriptions")}
            value={formatAdminKpiNumber(kpis.activeSubscriptions)}
            icon={CreditCard}
            loading={loading}
            valueDir="ltr"
            tone="info"
            hint={
              labels.activeSubscriptionsHint ??
              (isAr ? "فعّال + تجريبي" : "Active & trial")
            }
          />
          <SemanticKpiCard
            label={labels.expiringSoon ?? (isAr ? "تنتهي قريباً" : "Expiring Soon")}
            value={formatAdminKpiNumber(kpis.expiringSoon)}
            icon={Clock}
            loading={loading}
            valueDir="ltr"
            tone="warning"
            hint={
              labels.expiringSoonHint ??
              (isAr
                ? `خلال ${ADMIN_EXPIRING_SOON_DAYS} يوماً`
                : `Within ${ADMIN_EXPIRING_SOON_DAYS} days`)
            }
          />
          <SemanticKpiCard
            label={labels.estimatedMrr ?? (isAr ? "MRR تقديري (USD)" : "Estimated MRR (USD)")}
            value={mrrDisplay}
            icon={DollarSign}
            loading={loading}
            valueDir="ltr"
            tone="success"
            valueVariant="revenue"
            hint={
              labels.estimatedMrrHint ??
              (isAr
                ? "تقدير شهري من اشتراكات فعّالة مدفوعة فقط — ليس إيراداً محصلاً"
                : "Projected monthly from paid active subs only — not collected revenue")
            }
          />
          <div className="col-span-2 lg:col-span-1">
            <SemanticKpiCard
              label={labels.totalUsers ?? (isAr ? "إجمالي المستخدمين" : "Total Users")}
              value={formatAdminKpiNumber(kpis.totalUsers)}
              icon={Users}
              loading={loading}
              valueDir="ltr"
              tone="neutral"
            />
          </div>
        </div>
      )}
    </AdminSection>
  );
}
