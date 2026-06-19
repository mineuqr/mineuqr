import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { ActiveSessionsTableSection } from "@/components/dashboard/ActiveSessionsTableSection";
import { DiningSessionWorkspaceSheet } from "@/components/dashboard/DiningSessionWorkspaceSheet";
import { OperationalActivityFeedSection } from "@/components/dashboard/OperationalActivityFeedSection";
import { RestaurantDashSection } from "@/components/dashboard/RestaurantDashSection";
import {
  RestaurantKpiCard,
  RestaurantKpiGridSkeleton,
} from "@/components/dashboard/RestaurantKpiCard";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import {
  RestaurantSectionError,
} from "@/components/dashboard/RestaurantSectionStates";
import { convertUtcToRestaurantTime, todayYmd } from "@/lib/datetime";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  opsOverviewQueryOptions,
  orderListQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { DollarSign, Grid3X3, LayoutDashboard } from "lucide-react";
import { useMemo, useState } from "react";

function orderDateYmd(value: string | Date | null | undefined): string {
  return convertUtcToRestaurantTime(value)?.ymd ?? "";
}

function parseOrderAmount(totalAmount: string | number | null | undefined): number {
  return Number.parseFloat(String(totalAmount ?? "0")) || 0;
}

function computeTodayCompletedSales(
  orders: Array<{ createdAt: string; status: string; totalAmount: string }>
): number {
  const todayKey = todayYmd();
  return orders
    .filter((order) => orderDateYmd(order.createdAt) === todayKey && order.status === "served")
    .reduce((sum, order) => sum + parseOrderAmount(order.totalAmount), 0);
}

export function SessionsWorkspacePanel({
  restaurantId,
  language,
  currencySymbol,
  tableLabel,
}: {
  restaurantId: number;
  language: string;
  currencySymbol?: string;
  tableLabel?: string;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const queriesEnabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);
  const [workspaceSessionId, setWorkspaceSessionId] = useState<number | null>(null);
  const isAr = language === "ar";
  const sym = currencySymbol || "ر.س";

  const pageTitle = isAr ? "الجلسات" : "Sessions";
  const pageSub = isAr
    ? "مساحة عمل تشغيلية للجلسات النشطة والنشاط والتسوية"
    : "Operational workspace for active sessions, activity, and settlement visibility";

  useDevQueryRuntimeLog("ops.getRestaurantOverview (sessions)", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });
  useDevQueryRuntimeLog("order.list (sessions KPIs)", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    error: overviewQueryError,
    refetch: refetchOverview,
    isFetching: overviewFetching,
  } = trpc.ops.getRestaurantOverview.useQuery(
    { restaurantId },
    opsOverviewQueryOptions(queriesEnabled)
  );

  const {
    data: orders,
    isLoading: ordersLoading,
    isError: ordersError,
    error: ordersQueryError,
    refetch: refetchOrders,
    isFetching: ordersFetching,
  } = trpc.order.list.useQuery({ restaurantId }, orderListQueryOptions(queriesEnabled));

  const todayRevenue = useMemo(
    () => computeTodayCompletedSales(orders ?? []),
    [orders]
  );

  const kpiLoading = overviewLoading || ordersLoading;
  const kpiFetching = overviewFetching || ordersFetching;
  const kpiFailed = overviewError && !overview;
  const verificationError = isEmailNotVerifiedError(overviewQueryError)
    ? overviewQueryError
    : isEmailNotVerifiedError(ordersQueryError)
      ? ordersQueryError
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
            ? "نظرة سريعة على الجلسات التشغيلية"
            : "At-a-glance operational session metrics"
        }
        ariaLabel={isAr ? "مؤشرات الجلسات" : "Session KPIs"}
      >
        {verificationError ? (
          <VerificationRequiredPanel variant="orders" compact />
        ) : kpiLoading ? (
          <RestaurantKpiGridSkeleton count={3} />
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
              void refetchOverview();
              void refetchOrders();
            }}
          />
        ) : (
          <>
            {ordersError ? (
              <p className="mb-3 rounded-lg border border-orange-500/25 bg-orange-500/5 px-3 py-2 text-xs text-orange-300">
                {isAr
                  ? "تعذر تحميل إيرادات اليوم. تم عرض مؤشرات الجلسات فقط."
                  : "Today's revenue unavailable. Showing session metrics only."}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              <RestaurantKpiCard
                label={isAr ? "جلسات نشطة" : "Active Sessions"}
                value={overview?.activeSessions ?? 0}
                icon={LayoutDashboard}
                tone="primary"
              />
              <RestaurantKpiCard
                label={isAr ? "طاولات مشغولة" : "Occupied Tables"}
                value={overview?.occupiedTables ?? 0}
                icon={Grid3X3}
                tone="accent"
              />
              <RestaurantKpiCard
                label={isAr ? "إيراد جلسات اليوم" : "Today's Session Revenue"}
                value={
                  ordersError ? "—" : `${todayRevenue.toFixed(2)} ${sym}`
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
        currencySymbol={currencySymbol}
        onOpenSession={setWorkspaceSessionId}
      />

      <OperationalActivityFeedSection
        restaurantId={restaurantId}
        language={language}
        queriesEnabled={queriesEnabled}
        onOpenSession={setWorkspaceSessionId}
        sectionTitle={isAr ? "نشاط الجلسات" : "Session Activity"}
        sectionDescription={
          isAr
            ? "أحداث الجلسات والطلبات والتسوية"
            : "Session, order, and settlement events"
        }
        feedLimit={25}
        enableExpandSheet={false}
      />

      <DiningSessionWorkspaceSheet
        open={workspaceSessionId != null}
        onOpenChange={(open) => {
          if (!open) setWorkspaceSessionId(null);
        }}
        restaurantId={restaurantId}
        sessionId={workspaceSessionId}
        currencySymbol={currencySymbol}
        tableLabel={tableLabel}
      />
    </div>
  );
}
