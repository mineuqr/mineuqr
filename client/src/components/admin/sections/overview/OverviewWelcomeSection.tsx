import { useLanguage } from "@/contexts/LanguageContext";
import { AdminPageSection } from "../AdminPageSection";

export function OverviewWelcomeSection() {
  const { t } = useLanguage();

  return (
    <AdminPageSection
      title={t("admin.nav.welcome")}
      description={t("admin.nav.welcomeBody")}
      spacing="compact"
    />
  );
}
