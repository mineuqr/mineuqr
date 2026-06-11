import { KeyRound, Shield, User } from "lucide-react";
import { AdminPageSection } from "@/components/admin/sections/AdminPageSection";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { SecuritySectionError, SecuritySectionLoading } from "./SecuritySectionStates";
import { useSecurityCenterQueries } from "./useSecurityCenterQueries";

export function SecurityProtectedAccountsSection() {
  const { t } = useLanguage();
  const { healthQuery } = useSecurityCenterQueries();
  const { data, isLoading, isError } = healthQuery;

  return (
    <AdminPageSection
      title={t("admin.security.protected.title")}
      description={t("admin.security.protected.readOnly")}
      spacing="tight"
      titleVariant="compact"
    >
      {isLoading ? (
        <SecuritySectionLoading />
      ) : isError || !data ? (
        <SecuritySectionError />
      ) : (
        <div className={adminDash.kpiCard}>
          <div className="divide-y divide-cyan-500/15">
            <ProtectedRow
              icon={User}
              label={t("admin.security.protected.platformUserId")}
              value={
                data.platformUserId != null
                  ? String(data.platformUserId)
                  : t("admin.security.common.notResolved")
              }
              valueDir="ltr"
            />
            <ProtectedRow
              icon={Shield}
              label={t("admin.security.protected.protectionActive")}
              value={
                data.protectionActive
                  ? t("admin.security.common.yes")
                  : t("admin.security.common.no")
              }
            />
            <ProtectedRow
              icon={KeyRound}
              label={t("admin.security.protected.ownerOpenId")}
              value={
                data.ownerOpenIdConfigured
                  ? data.ownerOpenIdPrefix
                    ? `${t("admin.security.common.configured")} (${data.ownerOpenIdPrefix}…)`
                    : t("admin.security.common.configured")
                  : t("admin.security.common.notConfigured")
              }
            />
          </div>
        </div>
      )}
    </AdminPageSection>
  );
}

function ProtectedRow({
  icon: Icon,
  label,
  value,
  valueDir = "auto",
}: {
  icon: typeof User;
  label: string;
  value: string;
  valueDir?: "ltr" | "rtl" | "auto";
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5">
      <dt className="flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
        <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-400" aria-hidden />
        {label}
      </dt>
      <dd
        dir={valueDir}
        className="shrink-0 text-end text-xs font-semibold text-white"
      >
        {value}
      </dd>
    </div>
  );
}
