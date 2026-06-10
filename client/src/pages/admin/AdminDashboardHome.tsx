import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
import {
  ReportsStatusIndicator,
} from "@/components/admin/domains/reports";
import { AdminOperationsShell } from "@/components/admin/layout/AdminOperationsShell";
import { OverviewDashboardSections } from "@/components/admin/sections";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveAdminPageShell } from "@/lib/admin/routes/adminRouteRegistry";

export default function AdminDashboardHome() {
  const { t } = useLanguage();
  const gate = useAuthGate();

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  const shell = resolveAdminPageShell("overview", t);

  return (
    <AdminOperationsShell
      title={shell.title}
      breadcrumbs={shell.breadcrumbs}
      compact
      headerActions={<ReportsStatusIndicator compact />}
    >
      <OverviewDashboardSections />
    </AdminOperationsShell>
  );
}
