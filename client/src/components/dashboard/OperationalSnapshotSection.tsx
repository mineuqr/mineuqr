import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  reportingOperationalSnapshotQueryOptions,
  reportingOrderSalesQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { kpiDisplayName } from "@/lib/reporting/kpiDisplay";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import {
  ClipboardList,
  Clock3,
  DollarSign,
  Grid3X3,
  LayoutDashboard,
} from "lucide-react";
import { RestaurantDashSection } from "./RestaurantDashSection";
import { SemanticKpiCard, SemanticKpiSkeleton } from "@/design-system/semantic-card";
import { RestaurantSectionError } from "./RestaurantSectionStates";
import { restaurantDash } from "./restaurantDashStyles";

/**
 * REPORTING-DASHBOARD-ADOPTION-1 — Home operational snapshot.
 * Consumes reporting.* DTOs only — no local KPI aggregation.
 */
export function OperationalSnapshotSection({
  restaurantId,
  language,
  queriesEnabled,
  currencySymbol,
}: {
  restaurantId: number;
  language: string;
  queriesEnabled: boolean;
  currencySymbol?: string;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const sym = currencySymbol || "ر.س";

  useDevQueryRuntimeLog("reporting.getOperationalMetricsSnapshot", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });
  useDevQueryRuntimeLog("reporting.getOrderSalesSummary (home)", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
  });

  const {
    data: ops,
    isLoading: opsLoading,
    isError: opsError,
    error: opsQueryError,
    refetch: refetchOps,
    isFetching: opsFetching,
  } = trpc.reporting.getOperationalMetricsSnapshot.useQuery(
    { restaurantId },
    reportingOperationalSnapshotQueryOptions(queriesEnabled)
  );

  const {
    data: orderSales,
    isLoading: salesLoading,
    isError: salesError,
    error: salesQueryError,
    refetch: refetchSales,
    isFetching: salesFetching,
  } = trpc.reporting.getOrderSalesSummary.useQuery(
    { restaurantId },
    reportingOrderSalesQueryOptions(queriesEnabled)
  );

  const lang = language === "ar" ? "ar" : "en";
  const isAr = lang === "ar";
  const sectionTitle = isAr ? "لمحة تشغيلية" : "Operational Snapshot";
  const sectionSub = isAr
    ? "ما يحدث الآن في المطعم"
    : "What is happening in your restaurant right now";
  const ariaLabel = sectionTitle;
  const isLoading = opsLoading || salesLoading;
  const isFetching = opsFetching || salesFetching;
  const opsFailed = Boolean(opsError && !ops);
  const salesFailed = Boolean(salesError && !orderSales);
  const verificationError = isEmailNotVerifiedError(opsQueryError)
    ? opsQueryError
    : isEmailNotVerifiedError(salesQueryError)
      ? salesQueryError
      : null;

  if (verificationError) {
    return (
      <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
        <VerificationRequiredPanel variant="orders" compact />
      </RestaurantDashSection>
    );
  }

  const todayOrderSales = `${orderSales?.today.orderSales ?? "0.00"} ${sym}`;

  return (
    <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
      {isLoading ? (
        <SemanticKpiSkeleton count={5} />
      ) : opsFailed && salesFailed ? (
        <RestaurantSectionError
          message={
            isAr
              ? "تعذر تحميل المؤشرات التشغيلية. حاول مرة أخرى."
              : "Could not load operational metrics. Please try again."
          }
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          isFetching={isFetching}
          onRetry={() => {
            void refetchOps();
            void refetchSales();
          }}
        />
      ) : (
        <>
          {salesFailed ? (
            <p className="rounded-lg border border-orange-500/25 bg-orange-500/5 px-3 py-2 text-xs text-orange-300">
              {isAr
                ? "تعذر تحميل مبيعات الطلبات. تم عرض المؤشرات التشغيلية فقط."
                : "Order sales unavailable. Showing operational metrics only."}
            </p>
          ) : null}
          <div className={restaurantDash.kpiGrid}>
            <SemanticKpiCard
              label={kpiDisplayName("activeSessions", lang)}
              value={ops?.activeSessions ?? 0}
              icon={LayoutDashboard}
              tone="primary"
            />
            <SemanticKpiCard
              label={kpiDisplayName("occupiedTables", lang)}
              value={ops?.occupiedTables ?? 0}
              icon={Grid3X3}
              tone="accent"
            />
            <SemanticKpiCard
              label={kpiDisplayName("pendingOrders", lang)}
              value={opsFailed ? "—" : (ops?.pendingOrders ?? 0)}
              icon={ClipboardList}
              tone="warning"
            />
            <SemanticKpiCard
              label={isAr ? "قيد التحضير" : "Preparing"}
              value={opsFailed ? "—" : (ops?.preparingOrders ?? "—")}
              icon={Clock3}
              tone="neutral"
            />
            <SemanticKpiCard
              label={
                isAr
                  ? "مبيعات طلبات اليوم"
                  : `Today's ${kpiDisplayName("orderSales", "en")}`
              }
              value={salesFailed ? "—" : todayOrderSales}
              icon={DollarSign}
              tone="success"
              valueVariant="revenue"
            />
          </div>
        </>
      )}
    </RestaurantDashSection>
  );
}
