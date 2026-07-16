/**
 * REPORTING-EXPORTS-1 / REPORTING-EXPORT-TEMPLATES-1 — Presentation export bundle.
 * Assembled exclusively from reporting.* DTOs. Renderers must not invent KPIs.
 */
import type {
  BusinessMetricsSummaryDto,
  BusinessMetricsTrendDto,
  CatalogStatsSummaryDto,
  OperationalMetricsSnapshotDto,
  OrderSalesRollupDto,
  OrderSalesSummaryDto,
} from "@shared/reporting-platform";

export type ReportingExportLanguage = "ar" | "en";

export type ReportingExportScope = "month" | "year";

export type RestaurantReportingExportBundle = Readonly<{
  restaurantName: string;
  /** Optional restaurant logo URL for branded cover headers. */
  logoUrl?: string | null;
  /** Report title override; defaults to localized Business Performance Report. */
  reportTitle?: string;
  language: ReportingExportLanguage;
  scope: ReportingExportScope;
  /** Human period label (presentation only). */
  periodLabel: string;
  /** Filename stem without extension. */
  filenameStem: string;
  /** Check-domain business KPIs for the export period (or platform default). */
  business: BusinessMetricsSummaryDto;
  /** Order Sales today/month — same contract as Dashboard cards. */
  orderSales: OrderSalesSummaryDto;
  /** Point-in-time operational snapshot — same contract as Dashboard. */
  operational: OperationalMetricsSnapshotDto;
  /** Catalog counts — same contract as Dashboard. */
  catalog: CatalogStatsSummaryDto;
  /** Order Sales rollup periods for the selected calendar scope. */
  orderSalesRollup: OrderSalesRollupDto;
  /** Revenue trend points for the selected calendar scope. */
  revenueTrend: BusinessMetricsTrendDto;
}>;
