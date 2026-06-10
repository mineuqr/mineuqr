import { AlertCircle } from "lucide-react";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
import {
  CommercialOverviewExecutiveKpis,
  CommercialOverviewMetadataPanel,
  CommercialOverviewNeedsAttention,
  CommercialOverviewPlanDistribution,
  CommercialOverviewSubscriptionHealth,
  CommercialExportButtons,
} from "@/components/admin/commercial";
import type { CommercialPlan } from "@commercial/planTypes";
import { AdminEmptyState } from "@/components/admin/operations/AdminEmptyState";
import { AdminOperationsShell } from "@/components/admin/layout/AdminOperationsShell";
import { AdminSection } from "@/components/admin/layout/AdminSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveAdminPageShell } from "@/lib/admin/routes/adminRouteRegistry";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";

export default function AdminCommercialPage() {
  const { t, language } = useLanguage();
  const gate = useAuthGate();
  const locale = language === "ar" ? "ar" : "en";
  const adminEnabled = adminQueriesEnabled(
    gate.authPending,
    gate.isAuthenticated,
    gate.user?.role === "admin"
  );

  const { data: snapshot, isLoading, isError } = trpc.admin.getCommercialOverview.useQuery(
    undefined,
    { enabled: adminEnabled }
  );

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  const kpiLabels = {
    commercialSubscribers: t("admin.commercial.commercialSubscribers"),
    commercialSubscribersHint: t("admin.commercial.commercialSubscribersHint"),
    activeRestaurants: t("admin.activeRestaurants"),
    activeRestaurantsHint: t("admin.nav.statOperational"),
    mrr: t("admin.commercial.mrr"),
    mrrHint: t("admin.commercial.mrrHint"),
    arr: t("admin.commercial.arr"),
    arrHint: t("admin.commercial.arrHint"),
  };

  const metadataLabels = {
    title: t("admin.commercial.metadataTitle"),
    commercialAuthority: t("admin.commercial.commercialAuthority"),
    reportGenerated: t("admin.commercial.reportGenerated"),
    dataAsOf: t("admin.commercial.dataAsOf"),
    schemaVersion: t("admin.commercial.schemaVersion"),
    metricsSource: t("admin.commercial.metricsSource"),
    unavailable: t("admin.commercial.metadataUnavailable"),
  };

  const healthLabels = {
    active: t("subscription.status.active"),
    trial: t("subscription.status.trial"),
    canceled: t("admin.commercial.health.canceled"),
    expired: t("subscription.status.expired"),
    inactive: t("subscription.status.inactive"),
  };

  const attentionLabels = {
    expiringWithin30Days: t("admin.commercial.attention.expiringWithin30Days"),
    canceledAccounts: t("admin.commercial.attention.canceledAccounts"),
    expiredAccounts: t("admin.commercial.attention.expiredAccounts"),
  };

  const attentionHints = {
    expiringWithin30Days: t("admin.expiringSoonHint"),
  };

  const planLabels = {
    NONE: t("admin.commercial.plans.NONE"),
    TRIAL: t("admin.commercial.plans.TRIAL"),
    BASIC: t("admin.commercial.plans.BASIC"),
    PROFESSIONAL: t("admin.commercial.plans.PROFESSIONAL"),
    ENTERPRISE: t("admin.commercial.plans.ENTERPRISE"),
    ADMIN: t("admin.commercial.plans.ADMIN"),
  } satisfies Record<CommercialPlan, string>;

  const shell = resolveAdminPageShell("commercial", t);

  return (
    <AdminOperationsShell
      title={shell.title}
      subtitle={shell.subtitle}
      breadcrumbs={shell.breadcrumbs}
      headerActions={
        <CommercialExportButtons
          locale={locale}
          disabled={isLoading || isError}
        />
      }
    >
      {isError ? (
        <AdminEmptyState
          icon={AlertCircle}
          title={t("admin.commercial.loadError")}
          description={t("admin.commercial.loadErrorDesc")}
        />
      ) : (
        <>
          <AdminSection title={t("admin.commercial.executiveTitle")}>
            <CommercialOverviewExecutiveKpis
              executive={snapshot?.executive}
              loading={isLoading}
              locale={locale}
              labels={kpiLabels}
            />
          </AdminSection>

          <AdminSection title={metadataLabels.title}>
            <CommercialOverviewMetadataPanel
              metadata={snapshot?.metadata}
              loading={isLoading}
              locale={locale}
              labels={metadataLabels}
            />
          </AdminSection>

          <AdminSection
            title={t("admin.commercial.healthTitle")}
            description={t("admin.commercial.healthDesc")}
          >
            <CommercialOverviewSubscriptionHealth
              subscriptionHealth={snapshot?.subscriptionHealth}
              loading={isLoading}
              labels={healthLabels}
            />
          </AdminSection>

          <AdminSection
            title={t("admin.commercial.attentionTitle")}
            description={t("admin.commercial.attentionDesc")}
          >
            <CommercialOverviewNeedsAttention
              needsAttention={snapshot?.needsAttention}
              loading={isLoading}
              labels={attentionLabels}
              hints={attentionHints}
            />
          </AdminSection>

          <AdminSection
            title={t("admin.commercial.planDistributionTitle")}
            description={t("admin.commercial.planDistributionDesc")}
          >
            <CommercialOverviewPlanDistribution
              entries={snapshot?.planDistribution.entries}
              loading={isLoading}
              planLabels={planLabels}
            />
          </AdminSection>
        </>
      )}
    </AdminOperationsShell>
  );
}
