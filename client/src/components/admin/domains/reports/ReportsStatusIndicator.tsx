import { CommercialStatusBadge } from "@/components/admin/commercial";
import { useLanguage } from "@/contexts/LanguageContext";

type ReportsStatusIndicatorProps = {
  /** UX-REFINE-1C — inline header legend without marketing copy */
  compact?: boolean;
};

/** Reports domain — status badge reference legend for overview shell. */
export function ReportsStatusIndicator({ compact = false }: ReportsStatusIndicatorProps) {
  const { t } = useLanguage();

  if (compact) {
    return (
      <div
        className="flex flex-wrap items-center justify-end gap-1.5"
        aria-label={t("admin.nav.canonicalHint")}
      >
        <CommercialStatusBadge status="active" label={t("subscription.status.active")} />
        <CommercialStatusBadge status="trial" label={t("subscription.status.trial")} />
        <CommercialStatusBadge status="grace" label={t("admin.nav.statusGrace")} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
      <span>{t("admin.nav.canonicalHint")}</span>
      <CommercialStatusBadge status="active" label={t("subscription.status.active")} />
      <CommercialStatusBadge status="trial" label={t("subscription.status.trial")} />
      <CommercialStatusBadge status="grace" label={t("admin.nav.statusGrace")} />
    </div>
  );
}
