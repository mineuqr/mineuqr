/**
 * REPORTING-PERIOD-CONSISTENCY-1 — Presentation export bundle.
 * Every worksheet must consume the identical selected reporting scope.
 * Assembled from reporting.* DTOs. Renderers must not invent KPIs.
 */
import type {
  BusinessMetricsSummaryDto,
  BusinessMetricsTrendDto,
  OrderSalesRollupDto,
  PaymentMethodAnalyticsDto,
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
  /**
   * Check-domain business KPIs for the selected export period only
   * (BusinessMetricsSummary with explicit from/to).
   */
  business: BusinessMetricsSummaryDto;
  /**
   * Order Sales rollup for the selected calendar scope only
   * (day grain for month export, month grain for year export).
   * Period Order Sales KPIs on Executive/Financial are derived from this DTO.
   */
  orderSalesRollup: OrderSalesRollupDto;
  /** Revenue trend points for the selected calendar scope only. */
  revenueTrend: BusinessMetricsTrendDto;
  /**
   * Payment-method analytics for the selected scope (Settlement Record payment
   * snapshots — canonical financial reporting source).
   * Not a substitute for business.revenue (Gross Sales).
   */
  paymentMethodAnalytics: PaymentMethodAnalyticsDto;
}>;
