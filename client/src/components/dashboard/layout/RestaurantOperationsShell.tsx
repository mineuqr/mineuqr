import type { ReactNode } from "react";
import {
  AdminShellBreadcrumbs,
  type AdminBreadcrumbItem,
} from "@/components/admin/layout/AdminShellBreadcrumbs";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { RESTAURANT_WORKSPACE_DIR, restaurantDash } from "../restaurantDashStyles";
import { RestaurantDashboardSidebar } from "./RestaurantDashboardSidebar";
import { RestaurantShellHeaderActions } from "./RestaurantShellHeaderActions";
import { RestaurantSidebarProvider } from "./RestaurantSidebarProvider";
import type { RestaurantDashboardSection, RestaurantTab } from "./types";

export type RestaurantOperationsShellProps = {
  children: ReactNode;
  user?: { name?: string | null } | null;
  activeSection: RestaurantDashboardSection;
  restaurantTab?: RestaurantTab;
  onRestaurants: () => void;
  onLogout: () => void;
  onRestaurantTabChange?: (tab: RestaurantTab) => void;
  tablesLabel?: string;
  breadcrumbs?: AdminBreadcrumbItem[];
  className?: string;
};

export function RestaurantOperationsShell({
  children,
  user,
  activeSection,
  restaurantTab,
  onRestaurants,
  onLogout,
  onRestaurantTabChange,
  tablesLabel,
  breadcrumbs = [],
  className,
}: RestaurantOperationsShellProps) {
  const { language } = useLanguage();
  const crumbTrail: AdminBreadcrumbItem[] =
    breadcrumbs.length > 0
      ? breadcrumbs
      : [
          {
            label: language === "ar" ? "لوحة التحكم" : "Dashboard",
          },
        ];

  return (
    <RestaurantSidebarProvider>
      <div
        className={cn(restaurantDash.shell, "flex min-h-svh w-full")}
        dir={RESTAURANT_WORKSPACE_DIR}
        lang={language}
      >
        <RestaurantDashboardSidebar
          activeSection={activeSection}
          restaurantTab={restaurantTab}
          onRestaurants={onRestaurants}
          onLogout={onLogout}
          onRestaurantTabChange={onRestaurantTabChange}
          tablesLabel={tablesLabel}
        />
        <SidebarInset
          dir={RESTAURANT_WORKSPACE_DIR}
          lang={language}
          className="relative flex min-h-svh flex-col bg-transparent"
        >
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border/30 bg-background/60 px-4 backdrop-blur-xl">
            <SidebarTrigger className="-ms-1" />
            <Separator orientation="vertical" className="me-2 h-4" />
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <AdminShellBreadcrumbs items={crumbTrail} />
              <RestaurantShellHeaderActions user={user} />
            </div>
          </header>

          <main
            className={cn(
              restaurantDash.main,
              "flex-1 space-y-6 py-6 sm:space-y-8 sm:py-8",
              className
            )}
          >
            {children}
          </main>
        </SidebarInset>
      </div>
    </RestaurantSidebarProvider>
  );
}
