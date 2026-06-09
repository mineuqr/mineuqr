import { AlertCircle } from "lucide-react";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
import {
  CommercialOverviewExecutiveKpis,
  CommercialOverviewMetadataPanel,
  CommercialOverviewSubscriptionHealth,
} from "@/components/admin/commercial";
import { AdminEmptyState } from "@/components/admin/operations/AdminEmptyState";
import { AdminOperationsShell } from "@/components/admin/layout/AdminOperationsShell";
import { AdminSection } from "@/components/admin/layout/AdminSection";
import { useLanguage } from "@/contexts/LanguageContext";
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
    authorityVersion: t("admin.commercial.authorityVersion"),
    asOf: t("admin.commercial.asOf"),
    generatedAt: t("admin.commercial.generatedAt"),
  };

  const healthLabels = {
    active: t("subscription.status.active"),
    trial: t("subscription.status.trial"),
    canceled: t("admin.commercial.health.canceled"),
    expired: t("subscription.status.expired"),
    inactive: t("subscription.status.inactive"),
  };

  return (
    <AdminOperationsShell
      title={t("admin.nav.commercial")}
      subtitle={t("admin.commercial.pageSubtitle")}
      breadcrumbs={[
        { label: t("admin.nav.overview"), href: "/admin" },
        { label: t("admin.nav.commercial") },
      ]}
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
        </>
      )}
    </AdminOperationsShell>
  );
}
