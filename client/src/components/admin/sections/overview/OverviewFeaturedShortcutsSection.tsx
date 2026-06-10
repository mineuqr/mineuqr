import { BarChart3, Store, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { operationsTabHref } from "@/pages/admin/operations/operationsTab";
import { AdminPageSection } from "../AdminPageSection";
import { NavShortcutCard, type NavShortcutCardItem } from "./NavShortcutCard";

const FEATURED_SHORTCUTS: NavShortcutCardItem[] = [
  {
    path: "/admin/analytics",
    labelKey: "admin.nav.analytics",
    descriptionKey: "admin.nav.analyticsDesc",
    icon: BarChart3,
  },
  {
    path: operationsTabHref("accounts"),
    labelKey: "admin.nav.operations",
    descriptionKey: "admin.nav.operationsDesc",
    icon: Store,
  },
  {
    path: "/admin/commercial",
    labelKey: "admin.nav.commercial",
    descriptionKey: "admin.nav.commercialDesc",
    icon: TrendingUp,
  },
];

export function OverviewFeaturedShortcutsSection() {
  const { t } = useLanguage();

  return (
    <AdminPageSection title={t("admin.nav.shortcuts")}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURED_SHORTCUTS.map((item) => (
          <NavShortcutCard key={item.path} item={item} />
        ))}
      </div>
    </AdminPageSection>
  );
}
