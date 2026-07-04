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
  ChefHat,
  ClipboardList,
  Grid3X3,
  Home,
  LayoutGrid,
  MonitorSmartphone,
  Palette,
  Printer,
  QrCode,
  Settings,
  Store,
  Tag,
  UsersRound,
  Wrench,
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
        {
          id: "sessions",
          label: language === "ar" ? "الجلسات" : "Sessions",
          icon: UsersRound,
          active: restaurantTab === "sessions",
          onClick: () => onRestaurantTabChange!("sessions"),
        },
        {
          id: "orders",
          label: language === "ar" ? "الطلبات" : "Orders",
          icon: ClipboardList,
          active: restaurantTab === "orders",
          onClick: () => onRestaurantTabChange!("orders"),
        },
        {
          id: "kitchen",
          label: language === "ar" ? "شاشة المطبخ" : "Kitchen Display",
          icon: ChefHat,
          active: restaurantTab === "kitchen",
          onClick: () => onRestaurantTabChange!("kitchen"),
        },
        {
          id: "devices",
          label: language === "ar" ? "إدارة الأجهزة" : "Devices",
          icon: MonitorSmartphone,
          active: restaurantTab === "devices",
          onClick: () => onRestaurantTabChange!("devices"),
        },
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
