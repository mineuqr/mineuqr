import { Construction } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function PlaceholderComingSoonIndicator() {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-300">
      <Construction className="h-4 w-4 shrink-0" />
      <span>{t("admin.nav.comingSoon")}</span>
    </div>
  );
}
