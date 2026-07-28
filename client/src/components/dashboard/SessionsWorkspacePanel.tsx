import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { ActiveSessionsTableSection } from "@/components/dashboard/ActiveSessionsTableSection";
import { DiningSessionWorkspaceSheet } from "@/components/dashboard/DiningSessionWorkspaceSheet";
import { OperationalActivityFeedSection } from "@/components/dashboard/OperationalActivityFeedSection";
import { RestaurantDashSection } from "@/components/dashboard/RestaurantDashSection";
import { SemanticKpiCard, SemanticKpiSkeleton } from "@/design-system/semantic-card";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import {
  RestaurantSectionError,
} from "@/components/dashboard/RestaurantSectionStates";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  reportingBusinessSummaryQueryOptions,
  reportingOperationalSnapshotQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { kpiDisplayName } from "@/lib/reporting/kpiDisplay";
import { resolveReportingCurrencySymbol } from "@/lib/settlementOverviewDisplay";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import {
  businessDayTodayReportingBounds,
  reportingWorkingHours,
} from "@shared/reporting-platform";
import { DollarSign, Grid3X3, LayoutDashboard } from "lucide-react";
import { useMemo, useState } from "react";

export function SessionsWorkspacePanel({
  restaurantId,
  language,
  currencySymbol,
  tableLabel,
  workingHoursRaw,
}: {
  restaurantId: number;
  language: string;
  currencySymbol?: string;
  tableLabel?: string;
  /** Restaurant workingHours JSON / object for Business Day bounds. */
  workingHoursRaw?: unknown;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const queriesEnabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);
  const [workspaceSessionId, setWorkspaceSessionId] = useState<number | null>(null);
  const lang = language === "ar" ? "ar" : "en";
  const isAr = lang === "ar";
  const todayBounds = useMemo(() => {
    const hours = reportingWorkingHours(workingHoursRaw ?? null);
    return businessDayTodayReportingBounds(hours);
  }, [workingHoursRaw]);

  const pageTitle = isAr ? "الجلسات" : "Sessions";
  const pageSub = isAr
    ? "مساحة عمل تشغيلية للجلسات النشطة والنشاط والتسوية"
    : "Operational workspace for active sessions, activity, and settlement visibility";

  useDevQueryRuntimeLog("reporting.getOperationalMetricsSnapshot (sessions)", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });
  useDevQueryRuntimeLog("reporting.getBusinessMetricsSummary (sessions today)", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
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
    data: businessToday,
    isLoading: businessLoading,
    isError: businessError,
    error: businessQueryError,
    refetch: refetchBusiness,
    isFetching: businessFetching,
  } = trpc.reporting.getBusinessMetricsSummary.useQuery(
    {
      restaurantId,
      from: todayBounds.from ?? undefined,
      to: todayBounds.to ?? undefined,
    },
    reportingBusinessSummaryQueryOptions(queriesEnabled)
  );

  const sym = resolveReportingCurrencySymbol(businessToday, currencySymbol || "ر.س");
  const kpiLoading = opsLoading || businessLoading;
  const kpiFetching = opsFetching || businessFetching;
  const kpiFailed = opsError && !ops;
  const verificationError = isEmailNotVerifiedError(opsQueryError)
    ? opsQueryError
    : isEmailNotVerifiedError(businessQueryError)
      ? businessQueryError
      : null;

  return (
    <div className={restaurantDash.stack}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{pageTitle}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">{pageSub}</p>
      </div>

      <RestaurantDashSection
        title={isAr ? "مؤشرات الجلسات" : "Session KPIs"}
        description={
          isAr
            ? "نظرة سريعة على الجلسات التشغيلية وإيرادات اليوم"
            : "At-a-glance operational session metrics and today's revenue"
        }
        ariaLabel={isAr ? "مؤشرات الجلسات" : "Session KPIs"}
      >
        {verificationError ? (
          <VerificationRequiredPanel variant="orders" compact />
        ) : kpiLoading ? (
          <SemanticKpiSkeleton count={3} />
        ) : kpiFailed ? (
          <RestaurantSectionError
            message={
              isAr
                ? "تعذر تحميل مؤشرات الجلسات. حاول مرة أخرى."
                : "Could not load session metrics. Please try again."
            }
            retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
            isFetching={kpiFetching}
            onRetry={() => {
              void refetchOps();
              void refetchBusiness();
            }}
          />
        ) : (
          <>
            {businessError ? (
              <p className="mb-3 rounded-lg border border-orange-500/25 bg-orange-500/5 px-3 py-2 text-xs text-orange-300">
                {isAr
                  ? "تعذر تحميل إيرادات اليوم. تم عرض مؤشرات الجلسات فقط."
                  : "Today's revenue unavailable. Showing session metrics only."}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
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
                label={
                  isAr
                    ? "إيرادات الشيكات اليوم"
                    : `Today's ${kpiDisplayName("revenue", "en")}`
                }
                value={
                  businessError ? "—" : `${businessToday?.revenue ?? "0.00"} ${sym}`
                }
                icon={DollarSign}
                tone="success"
                valueVariant="revenue"
              />
            </div>
          </>
        )}
      </RestaurantDashSection>

      <ActiveSessionsTableSection
        restaurantId={restaurantId}
        language={language}
        queriesEnabled={queriesEnabled}
        currencySymbol={sym}
        onOpenSession={setWorkspaceSessionId}
      />

      <OperationalActivityFeedSection
        restaurantId={restaurantId}
        language={language}
        queriesEnabled={queriesEnabled}
        onOpenSession={setWorkspaceSessionId}
      />

      <DiningSessionWorkspaceSheet
        open={workspaceSessionId != null}
        onOpenChange={(open) => {
          if (!open) setWorkspaceSessionId(null);
        }}
        restaurantId={restaurantId}
        sessionId={workspaceSessionId}
        currencySymbol={sym}
        tableLabel={tableLabel}
      />
    </div>
  );
}
