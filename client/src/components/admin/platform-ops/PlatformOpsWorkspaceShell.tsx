/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * + PLATFORM-OPERATIONS-UI-ADOPTION-1
 * Shared shell for Platform Operations sections.
 * Presentation via PlatformOpsHeader only; routes/nav ownership unchanged.
 */

import type { ReactNode } from "react";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
import { PlatformOpsSectionNav } from "@/components/admin/platform-ops/PlatformOpsSectionNav";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveAdminPageShell } from "@/lib/admin/routes/adminRouteRegistry";
import {
  getPlatformOpsSection,
  type PlatformOpsSectionId,
} from "@/lib/admin/platform-ops/platformOpsSections";
import {
  PlatformOpsHeader,
  PLATFORM_OPS_UI,
  type PlatformOpsHealthStatus,
} from "@/design-system/platform-ops-ui";

type PlatformOpsWorkspaceShellProps = {
  sectionId: PlatformOpsSectionId;
  children: ReactNode;
  headerActions?: ReactNode;
  secondaryActions?: ReactNode;
  statusIndicator?: ReactNode;
  health?: PlatformOpsHealthStatus | string;
  healthLabel?: string;
  lastUpdated?: string;
  lastUpdatedLabel?: string;
};

export function PlatformOpsWorkspaceShell({
  sectionId,
  children,
  headerActions,
  secondaryActions,
  statusIndicator,
  health,
  healthLabel,
  lastUpdated,
  lastUpdatedLabel,
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
    <PlatformOpsHeader
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
      primaryActions={headerActions}
      secondaryActions={secondaryActions}
      statusIndicator={statusIndicator}
      health={health}
      healthLabel={healthLabel}
      lastUpdated={lastUpdated}
      lastUpdatedLabel={lastUpdatedLabel}
      headerFooter={<PlatformOpsSectionNav active={sectionId} />}
    >
      <div
        data-slot="platform-ops-workspace"
        className={PLATFORM_OPS_UI.sections}
      >
        {children}
      </div>
    </PlatformOpsHeader>
  );
}
