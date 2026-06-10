import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
import { AdminOperationsShell } from "@/components/admin/layout/AdminOperationsShell";
import {
  AdminRoutePlaceholderSection,
  PlaceholderComingSoonIndicator,
} from "@/components/admin/sections";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveAdminPageShell } from "@/lib/admin/routes/adminRouteRegistry";
import type { AdminRouteId } from "@/lib/admin/routes/adminRouteTypes";

type AdminSectionPlaceholderProps = {
  routeId: AdminRouteId;
};

export function AdminSectionPlaceholder({ routeId }: AdminSectionPlaceholderProps) {
  const { t } = useLanguage();
  const gate = useAuthGate();

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  const shell = resolveAdminPageShell(routeId, t);

  return (
    <AdminOperationsShell
      title={shell.title}
      subtitle={shell.subtitle}
      breadcrumbs={shell.breadcrumbs}
      statusIndicator={<PlaceholderComingSoonIndicator />}
    >
      <AdminRoutePlaceholderSection routeId={routeId} />
    </AdminOperationsShell>
  );
}
