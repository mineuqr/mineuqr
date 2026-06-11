import { Activity, AlertTriangle, BarChart3, CalendarDays } from "lucide-react";
import { AdminPageSection } from "@/components/admin/sections/AdminPageSection";
import { AdminStatCard } from "@/components/admin/layout/AdminStatCard";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatAdminKpiNumber } from "@/lib/admin/formatAdminCurrency";
import { countAuditBuckets } from "./securityCenterDisplay";
import { SecuritySectionError, SecuritySectionLoading } from "./SecuritySectionStates";
import { useSecurityCenterQueries } from "./useSecurityCenterQueries";

export function SecurityOverviewSection() {
  const { t } = useLanguage();
  const { statsQuery } = useSecurityCenterQueries();
  const { data, isLoading, isError } = statsQuery;

  return (
    <AdminPageSection
      title={t("admin.security.overview.title")}
      description={t("admin.security.overview.basedOnLast7Days")}
      spacing="tight"
      titleVariant="compact"
    >
      {isLoading ? (
        <SecuritySectionLoading />
      ) : isError ? (
        <SecuritySectionError />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <AdminStatCard
              compact
              title={t("admin.security.overview.totalEvents")}
              icon={BarChart3}
              value={formatAdminKpiNumber(data?.total ?? 0)}
            />
            <AdminStatCard
              compact
              title={t("admin.security.overview.eventsToday")}
              icon={CalendarDays}
              value={formatAdminKpiNumber(data?.today ?? 0)}
            />
            <AdminStatCard
              compact
              title={t("admin.security.overview.categories")}
              icon={Activity}
              value={formatAdminKpiNumber(
                countAuditBuckets(data?.byCategory).length
              )}
              hint={t("admin.security.overview.categoriesHint")}
            />
            <AdminStatCard
              compact
              title={t("admin.security.overview.severity")}
              icon={AlertTriangle}
              value={formatAdminKpiNumber(
                countAuditBuckets(data?.bySeverity).length
              )}
              hint={t("admin.security.overview.severityHint")}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className={adminDash.opsPanelHead}>
                {t("admin.security.overview.byCategory")}
              </div>
              <CategoryBucketList buckets={data?.byCategory} />
            </div>
            <div>
              <div className={adminDash.opsPanelHead}>
                {t("admin.security.overview.bySeverity")}
              </div>
              <CategoryBucketList buckets={data?.bySeverity} />
            </div>
          </div>
        </>
      )}
    </AdminPageSection>
  );
}

function CategoryBucketList({
  buckets,
}: {
  buckets: Record<string, number> | undefined;
}) {
  const { t } = useLanguage();
  const items = countAuditBuckets(buckets);

  if (items.length === 0) {
    return (
      <p className="px-2.5 py-2 text-xs text-slate-400">
        {t("admin.security.overview.noBuckets")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-cyan-500/15 border border-cyan-500/20 bg-slate-900/30">
      {items.map(({ key, count }) => (
        <li
          key={key}
          className="flex items-center justify-between px-2.5 py-1.5 text-xs"
        >
          <span className="truncate text-slate-300">{key}</span>
          <span className="ms-2 shrink-0 font-semibold tabular-nums text-white" dir="ltr">
            {formatAdminKpiNumber(count)}
          </span>
        </li>
      ))}
    </ul>
  );
}
