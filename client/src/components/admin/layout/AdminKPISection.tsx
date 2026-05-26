import {
  Clock,
  CreditCard,
  DollarSign,
  Store,
  Users,
} from "lucide-react";
import type { AdminKPIValues } from "@/lib/admin/computeAdminKPIs";
import { ADMIN_EXPIRING_SOON_DAYS } from "@/lib/admin/computeAdminKPIs";
import { formatCurrencySAR } from "@/lib/subscription";
import { AdminSection } from "./AdminSection";
import { AdminStatCard } from "./AdminStatCard";

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
};

export function AdminKPISection({
  kpis,
  loading = false,
  locale,
  title,
  description,
  labels = {},
}: AdminKPISectionProps) {
  const isAr = locale === "ar";
  const mrrDisplay = formatCurrencySAR(kpis.estimatedMrr, locale);

  return (
    <AdminSection title={title} description={description}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <AdminStatCard
          title={labels.activeRestaurants ?? (isAr ? "المطاعم النشطة" : "Active Restaurants")}
          value={kpis.activeRestaurants}
          icon={Store}
          loading={loading}
          valueDir="ltr"
          hint={
            labels.activeRestaurantsHint ??
            (isAr ? "اشتراك فعّال أو تجريبي" : "Active or trial subscription")
          }
        />
        <AdminStatCard
          title={labels.activeSubscriptions ?? (isAr ? "الاشتراكات النشطة" : "Active Subscriptions")}
          value={kpis.activeSubscriptions}
          icon={CreditCard}
          loading={loading}
          valueDir="ltr"
          hint={
            labels.activeSubscriptionsHint ??
            (isAr ? "فعّال + تجريبي" : "Active & trial")
          }
        />
        <AdminStatCard
          title={labels.expiringSoon ?? (isAr ? "تنتهي قريباً" : "Expiring Soon")}
          value={kpis.expiringSoon}
          icon={Clock}
          loading={loading}
          valueDir="ltr"
          hint={
            labels.expiringSoonHint ??
            (isAr
              ? `خلال ${ADMIN_EXPIRING_SOON_DAYS} يوماً`
              : `Within ${ADMIN_EXPIRING_SOON_DAYS} days`)
          }
        />
        <AdminStatCard
          title={labels.estimatedMrr ?? (isAr ? "MRR تقديري" : "Estimated MRR")}
          value={mrrDisplay}
          icon={DollarSign}
          loading={loading}
          valueDir="ltr"
          hint={
            labels.estimatedMrrHint ??
            (isAr ? "بناءً على أسعار الباقات النشطة" : "Based on active plan prices")
          }
        />
        <div className="col-span-2 lg:col-span-1">
          <AdminStatCard
            title={labels.totalUsers ?? (isAr ? "إجمالي المستخدمين" : "Total Users")}
            value={kpis.totalUsers}
            icon={Users}
            loading={loading}
            valueDir="ltr"
          />
        </div>
      </div>
    </AdminSection>
  );
}
