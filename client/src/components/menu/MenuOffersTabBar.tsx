import { UtensilsCrossed, Flame } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { MenuBrowseTab } from "./types";

type MenuOffersTabBarProps = {
  activeTab: MenuBrowseTab;
  onTabChange: (tab: MenuBrowseTab) => void;
  accentColor: string;
  textColor: string;
  visible: boolean;
};

export function MenuOffersTabBar({
  activeTab,
  onTabChange,
  accentColor,
  textColor,
  visible,
}: MenuOffersTabBarProps) {
  const { t } = useLanguage();

  if (!visible) return null;

  const tabs: { id: MenuBrowseTab; label: string; icon: typeof UtensilsCrossed }[] = [
    { id: "menu", label: t("menu.tabMenu"), icon: UtensilsCrossed },
    { id: "offers", label: t("menu.tabOffers"), icon: Flame },
  ];

  return (
    <div className="container pt-3 pb-1">
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        role="tablist"
        aria-label={t("menu.browseTabs")}
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(id)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={
                active
                  ? { background: accentColor, color: "#000" }
                  : { color: `${textColor}b3` }
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
