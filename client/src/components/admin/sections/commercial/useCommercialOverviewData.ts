import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CommercialPlan } from "@commercial/planTypes";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";

export function useCommercialOverviewData() {
  const { t, language } = useLanguage();
  const gate = useAuthGate();
  const locale: "ar" | "en" = language === "ar" ? "ar" : "en";
  const adminEnabled = adminQueriesEnabled(
    gate.authPending,
    gate.isAuthenticated,
    gate.user?.role === "admin"
  );

  const query = trpc.admin.getCommercialOverview.useQuery(undefined, {
    enabled: adminEnabled,
  });

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

  return {
    locale,
    query,
    kpiLabels,
    metadataLabels,
    healthLabels,
    attentionLabels,
    attentionHints,
    planLabels,
  };
}
