import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  BarChart3,
  ClipboardList,
  Grid3X3,
  Home,
  LayoutGrid,
  Monitor,
  Palette,
  Printer,
  QrCode,
  Receipt,
  Settings,
  Store,
  WalletCards,
  Tag,
  UsersRound,
  Wrench,
} from "lucide-react";
import { useLocation } from "wouter";
import { useCommercialFeatureVisibility } from "@/hooks/useCommercialFeatureVisibility";
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
  onRestaurantTabChange,
  tablesLabel,
}: {
  activeSection: RestaurantDashboardSection;
  restaurantTab?: RestaurantTab;
  onRestaurants: () => void;
  onRestaurantTabChange?: (tab: RestaurantTab) => void;
  tablesLabel?: string;
}) {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const { hasFeature } = useCommercialFeatureVisibility();
  const canManageScreens = hasFeature("devices");
  const canManageSessions = hasFeature("sessionTableManagement");
  const canManageMenu = hasFeature("menuManagement");
  const canManageDesign = hasFeature("menuDesign");
  const canManageQr = hasFeature("smartQr");
  const inRestaurant = activeSection === "restaurant-detail" && !!onRestaurantTabChange;

  const restaurantWorkspaceNav: NavItem[] = inRestaurant
    ? [
        {
          id: "home",
          label: language === "ar" ? "لوحة التحكم" : "Dashboard",
          icon: Home,
          active: restaurantTab === "home",
          onClick: () => onRestaurantTabChange!("home"),
        },
        ...(canManageSessions
          ? [
              {
                id: "sessions",
                label: language === "ar" ? "الجلسات" : "Sessions",
                icon: UsersRound,
                active: restaurantTab === "sessions",
                onClick: () => onRestaurantTabChange!("sessions"),
              } satisfies NavItem,
            ]
          : []),
        {
          id: "orders",
          label: language === "ar" ? "الطلبات" : "Orders",
          icon: ClipboardList,
          active: restaurantTab === "orders",
          onClick: () => onRestaurantTabChange!("orders"),
        },
        {
          id: "settlements",
          label: language === "ar" ? "التسويات" : "Settlements",
          icon: Receipt,
          active: restaurantTab === "settlements",
          onClick: () => onRestaurantTabChange!("settlements"),
        },
        {
          id: "register",
          label: language === "ar" ? "عمليات الصندوق" : "Register Ops",
          icon: WalletCards,
          active: restaurantTab === "register",
          onClick: () => onRestaurantTabChange!("register"),
        },
        // REGISTER-CREATION-UX-CONSOLIDATION-1 /
        // REGISTER-CREATION-LABEL-ADOPTION-1 — Catalog removed from sidebar;
        // create lives in Register Ops (label: إنشاء صندوق).
        ...(canManageScreens
          ? [
              {
                id: "screens",
                label: language === "ar" ? "إدارة الشاشات" : "Screens",
                icon: Monitor,
                active: restaurantTab === "screens" || restaurantTab === "devices",
                onClick: () => onRestaurantTabChange!("screens"),
              } satisfies NavItem,
            ]
          : []),
        {
          id: "print",
          label: language === "ar" ? "مساحة الطباعة" : "Print Workspace",
          icon: Printer,
          active: restaurantTab === "print",
          onClick: () => onRestaurantTabChange!("print"),
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
        ...(canManageMenu
          ? [
              {
                id: "categories",
                label: t("dashboard.categoriesAndItems"),
                icon: LayoutGrid,
                active: restaurantTab === "categories",
                onClick: () => onRestaurantTabChange!("categories"),
              } satisfies NavItem,
              {
                id: "offers",
                label: t("dashboard.offers"),
                icon: Tag,
                active: restaurantTab === "offers",
                onClick: () => onRestaurantTabChange!("offers"),
              } satisfies NavItem,
            ]
          : []),
        ...(canManageQr
          ? [
              {
                id: "tables",
                label: tablesLabel ?? (language === "ar" ? "الطاولات" : "Tables"),
                icon: Grid3X3,
                active: restaurantTab === "tables",
                onClick: () => onRestaurantTabChange!("tables"),
              } satisfies NavItem,
              {
                id: "qr",
                label: language === "ar" ? "رموز QR" : "QR Codes",
                icon: QrCode,
                active: restaurantTab === "qr",
                onClick: () => onRestaurantTabChange!("qr"),
              } satisfies NavItem,
            ]
          : []),
        ...(canManageDesign
          ? [
              {
                id: "templates",
                label: language === "ar" ? "قوالب المنيو" : "Menu Templates",
                icon: Palette,
                active: restaurantTab === "templates",
                onClick: () => onRestaurantTabChange!("templates"),
              } satisfies NavItem,
            ]
          : []),
        {
          id: "printer-management",
          label: language === "ar" ? "إدارة الطابعات" : "Printer Management",
          icon: Wrench,
          active: restaurantTab === "printer-management",
          onClick: () => onRestaurantTabChange!("printer-management"),
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
    </Sidebar>
  );
}
