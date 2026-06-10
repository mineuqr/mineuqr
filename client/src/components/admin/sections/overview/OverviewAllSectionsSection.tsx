import { useLanguage } from "@/contexts/LanguageContext";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/routes/adminRouteRegistry";
import { AdminPageSection } from "../AdminPageSection";
import { NavShortcutCard } from "./NavShortcutCard";

export function OverviewAllSectionsSection() {
  const { t } = useLanguage();
  const shortcutItems = ADMIN_NAV_ITEMS.filter((item) => item.id !== "overview");

  return (
    <AdminPageSection
      title={t("admin.nav.allSections")}
      titleVariant="compact"
      spacing="tight"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {shortcutItems.map((item) => (
          <NavShortcutCard key={item.id} item={item} />
        ))}
      </div>
    </AdminPageSection>
  );
}
