/**
 * REPORTING-EXPORTS presentation bundle.
 * Assembled from reporting.* DTOs. Renderers must not invent KPIs.
 */
import type {
  BusinessMetricsSummaryDto,
  BusinessMetricsTrendDto,
  OrderSalesRollupDto,
  OrderSalesSummaryDto,
} from "@shared/reporting-platform";

export type ReportingExportLanguage = "ar" | "en";

export type ReportingExportScope = "month" | "year";

export type RestaurantReportingExportBundle = Readonly<{
  restaurantName: string;
  /** Optional distinct business / trade name; defaults to restaurantName. */
  businessName?: string;
  /** Optional restaurant logo URL for branded cover. */
  logoUrl?: string | null;
  /** Report title override; defaults to monthly/annual financial title. */
  reportTitle?: string;
  language: ReportingExportLanguage;
  scope: ReportingExportScope;
  /** Human period label — month: "July 2026"; year: "2026". */
  periodLabel: string;
  /** Filename stem without extension. */
  filenameStem: string;
  /** Check-domain business KPIs for the export period. */
  business: BusinessMetricsSummaryDto;
  /** Order Sales today/month — same contract as Dashboard cards. */
  orderSales: OrderSalesSummaryDto;
  /** Order Sales rollup periods for the selected calendar scope. */
  orderSalesRollup: OrderSalesRollupDto;
  /** Revenue trend points for the selected calendar scope. */
  revenueTrend: BusinessMetricsTrendDto;
}>;
