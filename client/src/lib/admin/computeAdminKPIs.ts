/** Days window for "expiring soon" KPI (presentation-only). */
export const ADMIN_EXPIRING_SOON_DAYS = 30;

type RestaurantWithSubscription = {
  subscription?: {
    status?: string;
    currentPeriodEnd?: string | null;
  } | null;
};

type AdminStatistics = {
  activeSubscribers?: number;
  totalRevenue?: number;
} | null | undefined;

type ExtendedAdminStats = {
  totalUsers?: number;
} | null | undefined;

export type AdminKPIValues = {
  activeRestaurants: number;
  activeSubscriptions: number;
  expiringSoon: number;
  estimatedMrr: number;
  totalUsers: number;
};

export function computeAdminKPIs(
  restaurants: RestaurantWithSubscription[] | undefined,
  stats: AdminStatistics,
  extendedStats: ExtendedAdminStats
): AdminKPIValues {
  const list = restaurants ?? [];
  const now = Date.now();
  const threshold = now + ADMIN_EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000;

  const activeRestaurants = list.filter((r) => {
    const status = r.subscription?.status;
    return status === "active" || status === "trial";
  }).length;

  const expiringSoon = list.filter((r) => {
    const sub = r.subscription;
    if (!sub?.currentPeriodEnd) return false;
    if (sub.status !== "active" && sub.status !== "trial") return false;
    const end = new Date(sub.currentPeriodEnd).getTime();
    if (Number.isNaN(end)) return false;
    return end >= now && end <= threshold;
  }).length;

  return {
    activeRestaurants,
    activeSubscriptions: stats?.activeSubscribers ?? 0,
    expiringSoon,
    estimatedMrr: stats?.totalRevenue ?? 0,
    totalUsers: extendedStats?.totalUsers ?? 0,
  };
}
