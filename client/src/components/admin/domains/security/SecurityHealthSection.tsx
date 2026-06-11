import { CheckCircle2, Database, Shield, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageSection } from "@/components/admin/sections/AdminPageSection";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { securityStatusBadgeClass } from "./securityCenterDisplay";
import { SecuritySectionError, SecuritySectionLoading } from "./SecuritySectionStates";
import { useSecurityCenterQueries } from "./useSecurityCenterQueries";

export function SecurityHealthSection() {
  const { t } = useLanguage();
  const { healthQuery } = useSecurityCenterQueries();
  const { data, isLoading, isError } = healthQuery;

  return (
    <AdminPageSection
      title={t("admin.security.health.title")}
      spacing="tight"
      titleVariant="compact"
    >
      {isLoading ? (
        <SecuritySectionLoading />
      ) : isError || !data ? (
        <SecuritySectionError />
      ) : (
        <div className={cn(adminDash.kpiCard, "p-3 sm:p-4")}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-semibold",
                securityStatusBadgeClass(data.status)
              )}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              {t(`admin.security.health.status.${data.status}`)}
            </span>
          </div>

          <dl className="mt-3 grid gap-2 sm:grid-cols-3">
            <HealthFact
              icon={Shield}
              label={t("admin.security.health.protectionActive")}
              value={
                data.protectionActive
                  ? t("admin.security.common.yes")
                  : t("admin.security.common.no")
              }
            />
            <HealthFact
              icon={Database}
              label={t("admin.security.health.auditPersistence")}
              value={
                data.auditPersistence.auditTableReadable
                  ? t("admin.security.health.auditAvailable")
                  : t("admin.security.health.auditUnavailable")
              }
            />
            <HealthFact
              icon={UserCheck}
              label={t("admin.security.health.platformUserResolved")}
              value={
                data.platformUserResolved
                  ? t("admin.security.common.yes")
                  : t("admin.security.common.no")
              }
            />
          </dl>
        </div>
      )}
    </AdminPageSection>
  );
}

function HealthFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shield;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-cyan-500/15 bg-slate-900/40 px-2.5 py-2">
      <dt className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-400" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}
