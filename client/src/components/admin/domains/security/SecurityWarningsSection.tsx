import { AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageSection } from "@/components/admin/sections/AdminPageSection";
import { AdminEmptyState } from "@/components/admin/operations/AdminEmptyState";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { hasCriticalSecurityWarnings } from "./securityCenterDisplay";
import { SecuritySectionError, SecuritySectionLoading } from "./SecuritySectionStates";
import { useSecurityCenterQueries } from "./useSecurityCenterQueries";

function warningRowClass(severity: string): string {
  if (severity === "critical") {
    return "border-red-500/30 bg-red-500/5";
  }
  if (severity === "warning") {
    return "border-amber-500/30 bg-amber-500/5";
  }
  return "border-cyan-500/20 bg-slate-900/30";
}

export function SecurityWarningsBanner() {
  const { healthQuery } = useSecurityCenterQueries();
  const { data, isLoading, isError } = healthQuery;

  if (isLoading || isError || !data || !hasCriticalSecurityWarnings(data.warnings)) {
    return null;
  }

  const critical = data.warnings.filter((w) => w.severity === "critical");

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0">
          {critical.map((w) => (
            <p key={w.code} className="leading-snug">
              {w.message}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SecurityWarningsSection() {
  const { t } = useLanguage();
  const { healthQuery } = useSecurityCenterQueries();
  const { data, isLoading, isError } = healthQuery;

  return (
    <AdminPageSection
      title={t("admin.security.warnings.title")}
      spacing="tight"
      titleVariant="compact"
    >
      {isLoading ? (
        <SecuritySectionLoading />
      ) : isError || !data ? (
        <SecuritySectionError />
      ) : data.warnings.length === 0 ? (
        <AdminEmptyState
          icon={AlertTriangle}
          title={t("admin.security.warnings.emptyTitle")}
          description={t("admin.security.warnings.emptyDesc")}
        />
      ) : (
        <ul className="space-y-1.5">
          {data.warnings.map((warning) => (
            <li
              key={warning.code}
              className={cn(
                "rounded-lg border px-2.5 py-2 text-xs",
                warningRowClass(warning.severity)
              )}
            >
              <p className="font-medium text-white">{warning.code}</p>
              <p className="mt-0.5 text-slate-300">{warning.message}</p>
            </li>
          ))}
        </ul>
      )}
    </AdminPageSection>
  );
}
