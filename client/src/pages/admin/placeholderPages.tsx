import { ADMIN_NAV_ITEMS } from "@/lib/admin/adminNavigation";
import { AdminSectionPlaceholder } from "./AdminSectionPlaceholder";

function createPlaceholderPage(navId: string) {
  return function AdminPlaceholderPage() {
    const item = ADMIN_NAV_ITEMS.find((entry) => entry.id === navId);
    if (!item) {
      throw new Error(`Unknown admin nav id: ${navId}`);
    }
    return <AdminSectionPlaceholder navItem={item} />;
  };
}

export const AdminTenantsPage = createPlaceholderPage("tenants");
export const AdminCustomerSuccessPage = createPlaceholderPage("customer-success");
export const AdminHealthPage = createPlaceholderPage("health");
export const AdminSecurityPage = createPlaceholderPage("security");
export const AdminReportsPage = createPlaceholderPage("reports");
export const AdminLaunchReadinessPage = createPlaceholderPage("launch-readiness");
