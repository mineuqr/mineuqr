import { CommercialStatusBadge } from "@/components/admin/commercial";
import { useLanguage } from "@/contexts/LanguageContext";

export function OverviewStatusIndicator() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>{t("admin.nav.canonicalHint")}</span>
      <CommercialStatusBadge status="active" label={t("subscription.status.active")} />
      <CommercialStatusBadge status="trial" label={t("subscription.status.trial")} />
      <CommercialStatusBadge status="grace" label={t("admin.nav.statusGrace")} />
    </div>
  );
}
