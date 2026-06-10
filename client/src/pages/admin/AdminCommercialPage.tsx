import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
import {
  ReportsCommercialBody,
  ReportsExportActions,
} from "@/components/admin/domains/reports";
import { AdminOperationsShell } from "@/components/admin/layout/AdminOperationsShell";
import { CommercialCustomerSuccessSections } from "@/components/admin/sections/commercial/CommercialCustomerSuccessSections";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveAdminPageShell } from "@/lib/admin/routes/adminRouteRegistry";

export default function AdminCommercialPage() {
  const { t } = useLanguage();
  const gate = useAuthGate();

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  const shell = resolveAdminPageShell("commercial", t);

  return (
    <AdminOperationsShell
      title={shell.title}
      subtitle={shell.subtitle}
      breadcrumbs={shell.breadcrumbs}
      headerActions={<ReportsExportActions />}
    >
      <ReportsCommercialBody betweenMetadataAndPlan={<CommercialCustomerSuccessSections />} />
    </AdminOperationsShell>
  );
}
