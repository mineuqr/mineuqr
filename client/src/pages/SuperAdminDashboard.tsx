/**
 * Legacy route `/super-admin` — PHASE-A redirect to executive admin home.
 */
import { AdminLegacyRedirect } from "@/pages/admin/AdminLegacyRedirect";

export default function SuperAdminDashboard() {
  return <AdminLegacyRedirect to="/admin" />;
}
