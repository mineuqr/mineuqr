import type { OperationalMetricsSnapshotDto } from "@shared/reporting-platform";
import {
  REPORTING_CONTRACT_VERSION,
  reportingBusinessTodayKey,
} from "@shared/reporting-platform";
import { getRestaurantOverview } from "../ops/restaurantOverview";
import { readOperationalKpiDay } from "./orderReadReportingAdapter";
import { ReportingValidationError } from "./BusinessMetricsService";
import { loadRestaurantWorkingHoursForReporting } from "./restaurantWorkingHoursAdapter";

/**
 * Operational KPIs — Session overview + optional Order Read P-06.
 * Not business revenue.
 * Day selection uses Business Day (REPORTING-BUSINESS-DAY-ADOPTION-1).
 */
export async function getOperationalMetricsSnapshot(
  restaurantId: number
): Promise<OperationalMetricsSnapshotDto> {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new ReportingValidationError("Invalid restaurantId");
  }

  const workingHours = await loadRestaurantWorkingHoursForReporting(restaurantId);
  const todayKey = reportingBusinessTodayKey(workingHours);

  const [overview, kpiDay] = await Promise.all([
    getRestaurantOverview(restaurantId),
    readOperationalKpiDay(restaurantId, todayKey),
  ]);

  const preparing = kpiDay?.preparingOrders ?? null;
  const ready = kpiDay?.readyOrders ?? null;
  const pendingFromKpi = kpiDay?.pendingOrders ?? null;
  const kitchenLoad =
    pendingFromKpi != null && preparing != null && ready != null
      ? pendingFromKpi + preparing + ready
      : overview.pendingOrders;

  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "OperationalMetricsSnapshot",
    generatedAt: new Date().toISOString(),
    restaurantId,
    activeSessions: overview.activeSessions,
    occupiedTables: overview.occupiedTables,
    pendingOrders: overview.pendingOrders,
    kitchenLoad,
    activeOrders: kpiDay?.activeOrders ?? null,
    preparingOrders: preparing,
    readyOrders: ready,
  };
}
