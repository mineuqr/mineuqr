/**
 * PLATFORM-P0-PRODUCTION-READINESS-1 / OPERATIONS-INFORMATION-ARCHITECTURE-1
 * Placeholder / redirect admin pages.
 */

import { getAdminRoute } from "@/lib/admin/routes/adminRouteRegistry";
import type { AdminRouteId } from "@/lib/admin/routes/adminRouteTypes";
import { AdminLegacyRedirect } from "@/pages/admin/AdminLegacyRedirect";
import { operationsTabHref } from "@/pages/admin/operations/operationsTab";
import { AdminSectionPlaceholder } from "./AdminSectionPlaceholder";
import { AdminReportsPage as AdminReportsHubPage } from "./AdminReportsPage";

function createPlaceholderPage(routeId: AdminRouteId) {
  return function AdminPlaceholderPage() {
    getAdminRoute(routeId);
    return <AdminSectionPlaceholder routeId={routeId} />;
  };
}

/** PHASE-A — interim redirect until REBUILD-3B implements `/admin/tenants`. */
export function AdminTenantsPage() {
  return <AdminLegacyRedirect to={operationsTabHref("tenants")} />;
}

/**
 * PLATFORM-P0-PRODUCTION-READINESS-1 —
 * CS tooling lives under business operations; dedicated route redirects.
 */
export function AdminCustomerSuccessPage() {
  return <AdminLegacyRedirect to={operationsTabHref("accounts")} />;
}

/** OPERATIONS-INFORMATION-ARCHITECTURE-1 — bookmark redirect to Platform Ops health. */
export function AdminHealthPage() {
  return <AdminLegacyRedirect to="/admin/platform/health" />;
}

/** PLATFORM-P0-PRODUCTION-READINESS-1 — canonical Reports Hub. */
export { AdminReportsHubPage as AdminReportsPage };

/** Coming Soon — hidden from primary nav. */
export const AdminLaunchReadinessPage = createPlaceholderPage("launch-readiness");
