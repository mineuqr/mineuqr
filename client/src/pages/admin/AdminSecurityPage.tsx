import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
import {
  SecurityCenterComposition,
  SecurityWarningsBanner,
} from "@/components/admin/domains/security";
import { AdminOperationsShell } from "@/components/admin/layout/AdminOperationsShell";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveAdminPageShell } from "@/lib/admin/routes/adminRouteRegistry";

export default function AdminSecurityPage() {
  const { t } = useLanguage();
  const gate = useAuthGate();

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  const shell = resolveAdminPageShell("security", t);

  return (
    <AdminOperationsShell
      title={shell.title}
      subtitle={t("admin.security.pageSubtitle")}
      breadcrumbs={shell.breadcrumbs}
      compact
      narrowContent
      statusIndicator={<SecurityWarningsBanner />}
    >
      <SecurityCenterComposition />
    </AdminOperationsShell>
  );
}
