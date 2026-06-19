import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bell,
  ClipboardList,
  Grid3X3,
  Home,
  LayoutGrid,
  LogOut,
  Palette,
  QrCode,
  Settings,
  Store,
  Tag,
} from "lucide-react";
import { useLocation } from "wouter";
import { restaurantDash } from "../restaurantDashStyles";
import type { RestaurantDashboardSection, RestaurantTab } from "./types";

type NavItem = {
  id: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  onClick: () => void;
};

function NavMenuItems({ items }: { items: NavItem[] }) {
  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              isActive={item.active}
              tooltip={item.label}
              onClick={item.onClick}
            >
              <Icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function RestaurantDashboardSidebar({
  activeSection,
  restaurantTab,
  onRestaurants,
  onLogout,
  onRestaurantTabChange,
  tablesLabel,
}: {
  activeSection: RestaurantDashboardSection;
  restaurantTab?: RestaurantTab;
  onRestaurants: () => void;
  onLogout: () => void;
  onRestaurantTabChange?: (tab: RestaurantTab) => void;
  tablesLabel?: string;
}) {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const inRestaurant = activeSection === "restaurant-detail" && !!onRestaurantTabChange;

  const topNavItems: NavItem[] = [
    {
      id: "restaurants",
      label: language === "ar" ? "مطاعمي" : "My Restaurants",
      icon: Store,
      active: activeSection === "restaurants",
      onClick: onRestaurants,
    },
    {
      id: "notifications",
      label: t("common.notifications"),
      icon: Bell,
      active: false,
      onClick: () => setLocation("/notifications"),
    },
  ];

  const restaurantWorkspaceNav: NavItem[] = inRestaurant
    ? [
        {
          id: "home",
          label: language === "ar" ? "لوحة التحكم" : "Dashboard",
          icon: Home,
          active: restaurantTab === "home",
          onClick: () => onRestaurantTabChange!("home"),
        },
        {
          id: "orders",
          label: language === "ar" ? "الطلبات" : "Orders",
          icon: ClipboardList,
          active: restaurantTab === "orders",
          onClick: () => onRestaurantTabChange!("orders"),
        },
        {
          id: "reports",
          label: language === "ar" ? "التقارير والإحصائيات" : "Reports & Statistics",
          icon: BarChart3,
          active: restaurantTab === "reports",
          onClick: () => onRestaurantTabChange!("reports"),
        },
      ]
    : [];

  const restaurantMenuNav: NavItem[] = inRestaurant
    ? [
        {
          id: "categories",
          label: t("dashboard.categoriesAndItems"),
          icon: LayoutGrid,
          active: restaurantTab === "categories",
          onClick: () => onRestaurantTabChange!("categories"),
        },
        {
          id: "offers",
          label: t("dashboard.offers"),
          icon: Tag,
          active: restaurantTab === "offers",
          onClick: () => onRestaurantTabChange!("offers"),
        },
        {
          id: "tables",
          label: tablesLabel ?? (language === "ar" ? "الطاولات" : "Tables"),
          icon: Grid3X3,
          active: restaurantTab === "tables",
          onClick: () => onRestaurantTabChange!("tables"),
        },
        {
          id: "qr",
          label: language === "ar" ? "رموز QR" : "QR Codes",
          icon: QrCode,
          active: restaurantTab === "qr",
          onClick: () => onRestaurantTabChange!("qr"),
        },
        {
          id: "templates",
          label: language === "ar" ? "قوالب المنيو" : "Menu Templates",
          icon: Palette,
          active: restaurantTab === "templates",
          onClick: () => onRestaurantTabChange!("templates"),
        },
        {
          id: "settings",
          label: t("dashboard.settings"),
          icon: Settings,
          active: restaurantTab === "settings",
          onClick: () => onRestaurantTabChange!("settings"),
        },
      ]
    : [];

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-cyan-500/30">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => {
                if (inRestaurant) onRestaurants();
                else setLocation("/dashboard");
              }}
            >
              <div className={restaurantDash.brandIcon}>
                <Store />
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold text-white">mineuqr</span>
                <span className="truncate text-xs text-cyan-300/80">
                  {language === "ar" ? "لوحة المطعم" : "Restaurant console"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{language === "ar" ? "عام" : "General"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavMenuItems items={topNavItems} />
          </SidebarGroupContent>
        </SidebarGroup>

        {inRestaurant ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>
                {language === "ar" ? "مساحة العمل" : "Workspace"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <NavMenuItems items={restaurantWorkspaceNav} />
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>
                {language === "ar" ? "إدارة المنيو" : "Menu management"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <NavMenuItems items={restaurantMenuNav} />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="border-t border-cyan-500/20 p-2">
        <p className="px-2 text-xs text-slate-400">
          {language === "ar" ? "تحتاج مساعدة؟ تواصل مع الدعم" : "Need help? Contact support"}
        </p>
        <Button
          variant="outline"
          size="sm"
          className={cn("mt-2 h-8 w-full text-xs", restaurantDash.toolbarBtn)}
          onClick={() => setLocation("/contact")}
        >
          {language === "ar" ? "تواصل معنا" : "Contact us"}
        </Button>
        <SidebarMenu className="mt-2">
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={t("dashboard.signOut")} onClick={onLogout}>
              <LogOut />
              <span>{t("dashboard.signOut")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
