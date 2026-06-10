import { Link, useLocation, useSearch } from "wouter";
import { Store } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ADMIN_LEGACY_NAV,
  ADMIN_NAV_GROUPS,
  isAdminNavItemActive,
  type AdminNavItem,
} from "@/lib/admin/adminNavigation";
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
  SidebarSeparator,
} from "@/components/ui/sidebar";

function NavMenuItems({ items }: { items: AdminNavItem[] }) {
  const [pathname] = useLocation();
  const search = useSearch();
  const { t } = useLanguage();

  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isAdminNavItemActive(item, pathname, search);
        return (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton asChild isActive={active} tooltip={t(item.labelKey)}>
              <Link href={item.path}>
                <Icon />
                <span>{t(item.labelKey)}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AdminDashboardSidebar() {
  const { t } = useLanguage();

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Store className="size-4" />
                </div>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold">{t("admin.nav.brand")}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t("admin.nav.brandSubtitle")}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {ADMIN_NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.id}>
            {group.labelKey ? (
              <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <NavMenuItems items={group.items} />
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {ADMIN_LEGACY_NAV.length > 0 ? (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>{t("admin.nav.operationsGroup")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <NavMenuItems items={ADMIN_LEGACY_NAV} />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <p className="px-2 text-xs text-muted-foreground">{t("admin.nav.footerHint")}</p>
      </SidebarFooter>
    </Sidebar>
  );
}
