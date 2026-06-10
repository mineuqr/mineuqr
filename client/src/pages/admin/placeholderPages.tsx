import { getAdminRoute } from "@/lib/admin/routes/adminRouteRegistry";
import type { AdminRouteId } from "@/lib/admin/routes/adminRouteTypes";
import { AdminLegacyRedirect } from "@/pages/admin/AdminLegacyRedirect";
import { operationsTabHref } from "@/pages/admin/operations/operationsTab";
import { AdminSectionPlaceholder } from "./AdminSectionPlaceholder";

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
export const AdminCustomerSuccessPage = createPlaceholderPage("customer-success");
export const AdminHealthPage = createPlaceholderPage("health");
export const AdminSecurityPage = createPlaceholderPage("security");
export const AdminReportsPage = createPlaceholderPage("reports");
export const AdminLaunchReadinessPage = createPlaceholderPage("launch-readiness");
