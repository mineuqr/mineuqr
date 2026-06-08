/** EXEC-5 — map canonical dashboard summary to KPI strip (no client derivation). */

export const ADMIN_EXPIRING_SOON_DAYS = 30;

export type AdminKPIValues = {
  activeRestaurants: number;
  activeSubscriptions: number;
  expiringSoon: number;
  estimatedMrr: number;
  totalUsers: number;
};

type DashboardSummary = {
  activeRestaurants?: number;
  activeSubscriptions?: number;
  expiringAccounts?: number;
  mrr?: number;
  totalUsers?: number;
} | null | undefined;

export function mapDashboardSummaryToKPIs(
  summary: DashboardSummary
): AdminKPIValues {
  return {
    activeRestaurants: summary?.activeRestaurants ?? 0,
    activeSubscriptions: summary?.activeSubscriptions ?? 0,
    expiringSoon: summary?.expiringAccounts ?? 0,
    estimatedMrr: summary?.mrr ?? 0,
    totalUsers: summary?.totalUsers ?? 0,
  };
}
