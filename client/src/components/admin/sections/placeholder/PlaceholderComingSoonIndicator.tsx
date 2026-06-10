import { Construction } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type PlaceholderComingSoonIndicatorProps = {
  /** UX-REFINE-1D — inline header placement (Operations headerActions pattern) */
  compact?: boolean;
};

export function PlaceholderComingSoonIndicator({
  compact = false,
}: PlaceholderComingSoonIndicatorProps) {
  const { t } = useLanguage();

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[10px] text-orange-300">
        <Construction className="h-3 w-3 shrink-0" aria-hidden />
        <span>{t("admin.nav.comingSoon")}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-300">
      <Construction className="h-4 w-4 shrink-0" aria-hidden />
      <span>{t("admin.nav.comingSoon")}</span>
    </div>
  );
}
