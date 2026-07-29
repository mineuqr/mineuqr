/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * + PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Shared shell for Platform Operations sections.
 * Presentation: shared workspace + section density tokens only.
 * Does not alter routing, permissions, or section navigation ownership.
 */

import type { ReactNode } from "react";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
import { AdminOperationsShell } from "@/components/admin/layout/AdminOperationsShell";
import { PlatformOpsSectionNav } from "@/components/admin/platform-ops/PlatformOpsSectionNav";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveAdminPageShell } from "@/lib/admin/routes/adminRouteRegistry";
import {
  getPlatformOpsSection,
  type PlatformOpsSectionId,
} from "@/lib/admin/platform-ops/platformOpsSections";
import { PLATFORM_OPS_UI } from "@/design-system/platform-ops-ui";

type PlatformOpsWorkspaceShellProps = {
  sectionId: PlatformOpsSectionId;
  children: ReactNode;
  headerActions?: ReactNode;
  statusIndicator?: ReactNode;
};

export function PlatformOpsWorkspaceShell({
  sectionId,
  children,
  headerActions,
  statusIndicator,
}: PlatformOpsWorkspaceShellProps) {
  const { t } = useLanguage();
  const gate = useAuthGate();
  const section = getPlatformOpsSection(sectionId);

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  const shell = resolveAdminPageShell("platform-operations", t);
  const sectionLabel = t(section.labelKey);

  return (
    <AdminOperationsShell
      title={shell.title}
      subtitle={t(section.descriptionKey)}
      breadcrumbs={[
        ...shell.breadcrumbs.slice(0, -1),
        {
          label: shell.title,
          href: "/admin/platform",
        },
        { label: sectionLabel },
      ]}
      compact
      narrowContent={false}
      headerActions={headerActions}
      statusIndicator={statusIndicator}
      headerFooter={<PlatformOpsSectionNav active={sectionId} />}
    >
      <div
        data-slot="platform-ops-workspace"
        className={PLATFORM_OPS_UI.sections}
      >
        {children}
      </div>
    </AdminOperationsShell>
  );
}
