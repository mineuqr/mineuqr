/**
 * SUBSCRIPTION-PLATFORM-UI-FOUNDATION-1
 * Subscription Platform presentation under Platform Operations.
 * Read-only placeholders — no billing, payments, entitlement engine, tRPC, or schema.
 * UI: platform-ops-ui foundation exclusively.
 */

import { CreditCard, Layers } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  SUBSCRIPTION_ARCHITECTURE_PRINCIPLES,
  SUBSCRIPTION_DASHBOARD_HOST_PATH,
  SUBSCRIPTION_PLACEHOLDER_SECTIONS,
  SUBSCRIPTION_PLATFORM_DOES_NOT_OWN,
  SUBSCRIPTION_PLATFORM_OWNS,
  SUBSCRIPTION_PLATFORM_UI_PROGRAM,
  SUBSCRIPTION_UI_STATUS_LABELS,
  type SubscriptionPlaceholderMaturity,
} from "@shared/subscription-platform";
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

function maturityTone(
  maturity: SubscriptionPlaceholderMaturity
): "healthy" | "warning" | "degraded" | "unknown" {
  if (maturity === "architecture_certified") return "healthy";
  if (maturity === "foundation_pending") return "warning";
  return "degraded";
}

export function PlatformOpsSubscriptionComposition() {
  const { t } = useLanguage();
  const certified = SUBSCRIPTION_PLACEHOLDER_SECTIONS.filter(
    (s) => s.maturity === "architecture_certified"
  ).length;
  const foundationPending = SUBSCRIPTION_PLACEHOLDER_SECTIONS.filter(
    (s) => s.maturity === "foundation_pending"
  ).length;
  const implementationPending = SUBSCRIPTION_PLACEHOLDER_SECTIONS.filter(
    (s) => s.maturity === "implementation_pending"
  ).length;

  return (
    <div
      data-slot="platform-ops-subscription"
      data-program={SUBSCRIPTION_PLATFORM_UI_PROGRAM}
      className={PLATFORM_OPS_UI.workspace}
    >
      <PlatformOpsHeroSummary
        title={t("admin.platformOps.subscription.architectureTitle")}
        description={t("admin.platformOps.subscription.architectureBody")}
        health="unknown"
        healthLabel={t("admin.platformOps.subscription.architectureCertified")}
        columns={3}
      >
        <PlatformOpsMetricCard
          label={t("admin.platformOps.subscription.architectureCertified")}
          value={String(certified)}
          tone="info"
          domain="information"
          icon={Layers}
        />
        <PlatformOpsMetricCard
          label={t("admin.platformOps.subscription.foundationPending")}
          value={String(foundationPending)}
          tone="info"
          domain="information"
          icon={Layers}
        />
        <PlatformOpsMetricCard
          label={t("admin.platformOps.subscription.implementationPending")}
          value={String(implementationPending)}
          tone="info"
          domain="information"
          icon={CreditCard}
        />
      </PlatformOpsHeroSummary>

      <PlatformOpsSection
        title={t("admin.platformOps.subscription.statusLegend")}
        description={t("admin.platformOps.subscription.statusLegendBody")}
      >
        <div className="flex flex-wrap gap-2">
          {SUBSCRIPTION_UI_STATUS_LABELS.map((label) => (
            <PlatformOpsStatusBadge
              key={label}
              status={
                label === "Architecture Certified"
                  ? "healthy"
                  : label === "Foundation Pending"
                    ? "warning"
                    : "degraded"
              }
              label={label}
            />
          ))}
        </div>
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.subscription.placeholderSections")}
        description={t("admin.platformOps.subscription.placeholderSectionsBody")}
      >
        <PlatformOpsModuleGrid>
          {SUBSCRIPTION_PLACEHOLDER_SECTIONS.map((section) => (
            <PlatformOpsModuleTile
              key={section.id}
              href={SUBSCRIPTION_DASHBOARD_HOST_PATH}
              title={section.title}
              description={section.description}
              live={false}
              statusTone={maturityTone(section.maturity)}
              statusLabel={section.statusLabel}
            />
          ))}
        </PlatformOpsModuleGrid>
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.subscription.sectionDetail")}
        description={t("admin.platformOps.subscription.sectionDetailBody")}
      >
        <PlatformOpsEmptyState
          icon={CreditCard}
          title={t("admin.platformOps.subscription.readOnlyTitle")}
          description={t("admin.platformOps.subscription.readOnlyBody")}
        />
        <div className="mt-4 space-y-3">
          {SUBSCRIPTION_PLACEHOLDER_SECTIONS.map((section) => (
            <div
              key={`detail-${section.id}`}
              className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3 last:border-0"
            >
              <div>
                <div className="text-sm font-medium text-cyan-100">{section.title}</div>
                <p className={PLATFORM_OPS_UI.metaText}>{section.description}</p>
              </div>
              <PlatformOpsStatusBadge
                status={maturityTone(section.maturity)}
                label={section.statusLabel}
              />
            </div>
          ))}
        </div>
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.subscription.owns")}
        description={t("admin.platformOps.subscription.ownsBody")}
      >
        <PlatformOpsOwnershipList
          items={SUBSCRIPTION_PLATFORM_OWNS.map((id) => id)}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.subscription.doesNotOwn")}
        description={t("admin.platformOps.subscription.doesNotOwnBody")}
      >
        <PlatformOpsOwnershipList
          items={SUBSCRIPTION_PLATFORM_DOES_NOT_OWN.map((id) => id)}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.subscription.principles")}
        description={t("admin.platformOps.subscription.principlesBody")}
      >
        <PlatformOpsOwnershipList
          items={SUBSCRIPTION_ARCHITECTURE_PRINCIPLES.map((id) => id)}
        />
      </PlatformOpsSection>
    </div>
  );
}
