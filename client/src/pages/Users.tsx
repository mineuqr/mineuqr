/**
 * Legacy route `/users` — PHASE-A redirect to Operations Accounts tab.
 */
import { AdminLegacyRedirect } from "@/pages/admin/AdminLegacyRedirect";
import { operationsTabHref } from "@/pages/admin/operations/operationsTab";

export default function Users() {
  return <AdminLegacyRedirect to={operationsTabHref("accounts")} />;
}
