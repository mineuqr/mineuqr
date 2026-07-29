/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Device Management Platform architecture presentation under Platform Operations.
 * No provisioning, remote management, updates, tRPC, or runtime mutation.
 * UI: platform-ops-ui foundation exclusively.
 */

import { MonitorSmartphone, Radio, Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DEVICE_ASSIGNMENT_ARCHITECTURE,
  DEVICE_CONNECTIVITY_ARCHITECTURE,
  DEVICE_DASHBOARD_ARCHITECTURE,
  DEVICE_DIAGNOSTICS_ARCHITECTURE,
  DEVICE_HEALTH_STATUSES,
  DEVICE_IDENTITY_ARCHITECTURE,
  DEVICE_INVENTORY_ARCHITECTURE,
  DEVICE_LIFECYCLE_ARCHITECTURE,
  DEVICE_MANAGEMENT_PLATFORM_PROGRAM,
  DEVICE_PLATFORM_DOES_NOT_OWN,
  DEVICE_PLATFORM_DOMAIN_DEFINITIONS,
  DEVICE_PROVISIONING_ARCHITECTURE,
  DEVICE_SECURITY_ARCHITECTURE,
  DEVICE_TYPE_ARCHITECTURE,
  DEVICE_UPDATE_ARCHITECTURE,
} from "@shared/device-management-platform";
import {
  PlatformOpsEmptyState,
  PlatformOpsHeroSummary,
  PlatformOpsMetricCard,
  PlatformOpsModuleGrid,
  PlatformOpsModuleTile,
  PlatformOpsOwnershipList,
  PlatformOpsSection,
  PlatformOpsStatusBadge,
  PLATFORM_OPS_UI,
} from "@/design-system/platform-ops-ui";

function mapDeviceHealthTone(
  status: (typeof DEVICE_HEALTH_STATUSES)[number]
): "healthy" | "warning" | "degraded" | "unavailable" | "unknown" {
  if (status === "healthy") return "healthy";
  if (status === "warning" || status === "maintenance" || status === "updating") {
    return "warning";
  }
  if (
    status === "offline" ||
    status === "disconnected" ||
    status === "retired"
  ) {
    return "unavailable";
  }
  if (status === "provisioning") return "degraded";
  return "unknown";
}

export function PlatformOpsDevicesComposition() {
  const { t } = useLanguage();
  const domains = DEVICE_PLATFORM_DOMAIN_DEFINITIONS;
  const architectureCount = domains.filter((d) =>
    ["architecture", "ssot_consumer"].includes(d.maturity)
  ).length;
  const reservedCount = domains.filter(
    (d) => d.maturity === "reserved" || d.maturity === "deferred"
  ).length;

  return (
    <div
      data-slot="platform-ops-devices"
      data-program={DEVICE_MANAGEMENT_PLATFORM_PROGRAM}
      className={PLATFORM_OPS_UI.workspace}
    >
      <PlatformOpsHeroSummary
        title={t("admin.platformOps.devices.architectureTitle")}
        description={t("admin.platformOps.devices.architectureBody")}
        health="unknown"
        healthLabel={t("admin.platformOps.devices.architectureOnly")}
        columns={2}
      >
        <PlatformOpsMetricCard
          label={t("admin.platformOps.devices.domainsDefined")}
          value={String(architectureCount)}
          tone="info"
          domain="information"
          icon={MonitorSmartphone}
        />
        <PlatformOpsMetricCard
          label={t("admin.platformOps.devices.domainsReserved")}
          value={String(reservedCount)}
          tone="info"
          domain="information"
          icon={MonitorSmartphone}
        />
      </PlatformOpsHeroSummary>

      <PlatformOpsSection
        title={t("admin.platformOps.devices.dashboardSections")}
        description={t("admin.platformOps.devices.dashboardSectionsBody")}
      >
        <PlatformOpsModuleGrid>
          {DEVICE_DASHBOARD_ARCHITECTURE.map((section) => (
            <PlatformOpsModuleTile
              key={section.id}
              href="/admin/platform/devices"
              title={section.title}
              description={section.maturity}
              live={section.maturity === "architecture"}
              statusLabel={
                section.maturity === "reserved"
                  ? t("admin.platformOps.reserved")
                  : t("admin.platformOps.devices.architectureOnly")
              }
            />
          ))}
        </PlatformOpsModuleGrid>
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.devices.domainOwnership")}
        description={t("admin.platformOps.devices.domainOwnershipBody")}
      >
        <PlatformOpsOwnershipList
          items={domains.map(
            (d) => `${d.title} — ${d.maturity} (${d.ownership})`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.devices.deviceTypes")}
        description={t("admin.platformOps.devices.deviceTypesBody")}
      >
        <PlatformOpsOwnershipList
          items={DEVICE_TYPE_ARCHITECTURE.map(
            (d) => `${d.title} — ${d.category} / ${d.maturity}`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.devices.identity")}
        description={t("admin.platformOps.devices.identityBody")}
      >
        <PlatformOpsOwnershipList
          items={DEVICE_IDENTITY_ARCHITECTURE.map(
            (f) => `${f.title} — ${f.notes}`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.devices.lifecycle")}
        description={t("admin.platformOps.devices.lifecycleBody")}
      >
        <PlatformOpsOwnershipList
          items={DEVICE_LIFECYCLE_ARCHITECTURE.map(
            (s) => `${s.title} — ${s.notes}`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.devices.provisioning")}
        description={t("admin.platformOps.devices.provisioningBody")}
      >
        <PlatformOpsEmptyState
          icon={Shield}
          title={t("admin.platformOps.devices.reservationOnly")}
          description={t("admin.platformOps.devices.provisioningBody")}
        />
        <PlatformOpsOwnershipList
          items={DEVICE_PROVISIONING_ARCHITECTURE.map(
            (p) => `${p.title} — ${p.maturity}`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.devices.assignments")}
        description={t("admin.platformOps.devices.assignmentsBody")}
      >
        <PlatformOpsOwnershipList
          items={DEVICE_ASSIGNMENT_ARCHITECTURE.map(
            (a) => `${a.title} — ${a.notes}`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.devices.inventory")}
        description={t("admin.platformOps.devices.inventoryBody")}
      >
        <PlatformOpsOwnershipList
          items={DEVICE_INVENTORY_ARCHITECTURE.map(
            (f) => `${f.title} — ${f.notes}`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.devices.connectivity")}
        description={t("admin.platformOps.devices.connectivityBody")}
        icon={Radio}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <PlatformOpsStatusBadge
            status="healthy"
            label={t("admin.platformOps.devices.ssotConsumer")}
          />
          <span className={PLATFORM_OPS_UI.metaText}>
            {t("admin.platformOps.devices.noDuplicateCollectors")}
          </span>
        </div>
        <PlatformOpsOwnershipList
          items={DEVICE_CONNECTIVITY_ARCHITECTURE.map(
            (c) => `${c.title} — ${c.mode}`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.devices.healthModel")}
        description={t("admin.platformOps.devices.healthModelBody")}
      >
        <div className="flex flex-wrap gap-2">
          {DEVICE_HEALTH_STATUSES.map((status) => (
            <PlatformOpsStatusBadge
              key={status}
              status={mapDeviceHealthTone(status)}
              label={status}
            />
          ))}
        </div>
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.devices.diagnostics")}
        description={t("admin.platformOps.devices.diagnosticsBody")}
      >
        <div className="mb-2">
          <PlatformOpsStatusBadge
            status="healthy"
            label={t("admin.platformOps.devices.readOnly")}
          />
        </div>
        <PlatformOpsOwnershipList
          items={DEVICE_DIAGNOSTICS_ARCHITECTURE.map(
            (d) => `${d.title} — mutationAllowed: false`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.devices.security")}
        description={t("admin.platformOps.devices.securityBody")}
      >
        <PlatformOpsOwnershipList
          items={DEVICE_SECURITY_ARCHITECTURE.map(
            (s) => `${s.title} — ${s.maturity}`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.devices.updates")}
        description={t("admin.platformOps.devices.updatesBody")}
      >
        <PlatformOpsEmptyState
          icon={Shield}
          title={t("admin.platformOps.devices.reservationOnly")}
          description={t("admin.platformOps.devices.updatesBody")}
        />
        <PlatformOpsOwnershipList
          items={DEVICE_UPDATE_ARCHITECTURE.map(
            (u) => `${u.title} — ${u.maturity}`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.devices.doesNotOwn")}
        description={t("admin.platformOps.devices.doesNotOwnBody")}
      >
        <PlatformOpsOwnershipList
          items={DEVICE_PLATFORM_DOES_NOT_OWN.map((id) => id)}
        />
      </PlatformOpsSection>
    </div>
  );
}
