/**
 * PLATFORM-P0-PRODUCTION-READINESS-1
 * Canonical Reports Hub page — Commercial + Analytics destinations.
 */

import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
import { AdminReportsHubComposition } from "@/components/admin/domains/reports";
import { AdminOperationsShell } from "@/components/admin/layout/AdminOperationsShell";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveAdminPageShell } from "@/lib/admin/routes/adminRouteRegistry";

export function AdminReportsPage() {
  const { t } = useLanguage();
  const gate = useAuthGate();

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  const shell = resolveAdminPageShell("reports", t);

  return (
    <AdminOperationsShell
      title={shell.title}
      subtitle={t("admin.reportsHub.body")}
      breadcrumbs={shell.breadcrumbs}
      compact
    >
      <AdminReportsHubComposition />
    </AdminOperationsShell>
  );
}
