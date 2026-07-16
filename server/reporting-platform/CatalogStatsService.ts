import type { CatalogStatsSummaryDto } from "@shared/reporting-platform";
import { REPORTING_CONTRACT_VERSION } from "@shared/reporting-platform";
import { getRestaurantStats } from "../db";
import { ReportingValidationError } from "./BusinessMetricsService";

/** Catalog / visit stats — not sales or revenue. */
export async function getCatalogStatsSummary(
  restaurantId: number
): Promise<CatalogStatsSummaryDto> {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new ReportingValidationError("Invalid restaurantId");
  }
  const stats = await getRestaurantStats(restaurantId);
  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "CatalogStatsSummary",
    generatedAt: new Date().toISOString(),
    restaurantId,
    categoryCount: stats?.totalCategories ?? 0,
    itemCount: stats?.totalItems ?? 0,
    menuVisits: stats?.viewCount ?? 0,
  };
}
