import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
import { AdminOperationsShell } from "@/components/admin/layout/AdminOperationsShell";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveAdminPageShell } from "@/lib/admin/routes/adminRouteRegistry";
import { StatisticsPanel } from "./StatisticsPanel";

export default function AdminAnalyticsPage() {
  const { t } = useLanguage();
  const gate = useAuthGate();

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  const shell = resolveAdminPageShell("analytics", t);

  return (
    <AdminOperationsShell
      title={shell.title}
      subtitle={shell.subtitle}
      breadcrumbs={shell.breadcrumbs}
    >
      <StatisticsPanel />
    </AdminOperationsShell>
  );
}
