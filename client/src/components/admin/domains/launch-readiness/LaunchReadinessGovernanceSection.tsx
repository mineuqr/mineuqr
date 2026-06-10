/**
 * REBUILD-5G — launch governance ownership surface.
 * Admin shell, route registry, and overview navigation hub.
 */
export { OverviewWelcomeSection } from "@/components/admin/sections/overview/OverviewWelcomeSection";
export { OverviewFeaturedShortcutsSection } from "@/components/admin/sections/overview/OverviewFeaturedShortcutsSection";
export { OverviewAllSectionsSection } from "@/components/admin/sections/overview/OverviewAllSectionsSection";
export { NavShortcutCard } from "@/components/admin/sections/overview/NavShortcutCard";

export { resolveAdminPageShell, getAdminRoute } from "@/lib/admin/routes/adminRouteRegistry";
export {
  ADMIN_ROUTE_DEFINITIONS,
  ADMIN_LEGACY_ROUTES,
  ADMIN_ROUTE_NAV_GROUP_LAYOUT,
} from "@/lib/admin/routes/adminRoutes";

export { AdminOperationsShell } from "@/components/admin/layout/AdminOperationsShell";
export { AdminDashboardSidebar } from "@/components/admin/layout/AdminDashboardSidebar";
