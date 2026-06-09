import ExcelJS from "exceljs";
import type { CommercialExportPackage } from "../reportContracts";

export type ExcelAdapterOptions = {
  locale?: "en" | "ar";
};

/** Presentation-only — no metric derivation. */
export async function renderCommercialExcel(
  pkg: CommercialExportPackage,
  _options: ExcelAdapterOptions = {}
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "mineuqr";
  workbook.created = new Date(pkg.envelope.generatedAt);

  const overviewSheet = workbook.addWorksheet("Commercial Overview");
  overviewSheet.addRow(["Commercial Overview Report"]);
  overviewSheet.addRow(["Report Version", pkg.envelope.reportVersion]);
  overviewSheet.addRow(["Generated At", pkg.envelope.generatedAt]);
  overviewSheet.addRow(["Data As Of", pkg.envelope.dataAsOf]);
  overviewSheet.addRow(["Authority", pkg.envelope.authority.source]);
  overviewSheet.addRow(["Metrics Source", pkg.envelope.authority.metricsSource]);
  overviewSheet.addRow(["Definitions", pkg.envelope.definitionsRef]);
  overviewSheet.addRow([]);
  overviewSheet.addRow(["Section", "Metric", "Value"]);

  const exec = pkg.overviewReport.executive;
  const addMetric = (section: string, metric: string, value: string | number) => {
    overviewSheet.addRow([section, metric, value]);
  };

  addMetric("Executive", "MRR (USD)", exec.mrr);
  addMetric("Executive", "ARR (USD)", exec.arr);
  addMetric("Executive", "Commercial Subscribers", exec.commercialSubscribers);
  addMetric("Executive", "Active Subscriptions", exec.activeSubscriptions);
  addMetric("Executive", "Active Trials", exec.activeTrials);
  addMetric("Executive", "Active Restaurants", exec.activeRestaurants);
  addMetric("Executive", "Total Users", exec.totalUsers);

  const health = pkg.overviewReport.subscriptionHealth;
  addMetric("Health", "Active", health.active);
  addMetric("Health", "Trial", health.trial);
  addMetric("Health", "Canceled", health.canceled);
  addMetric("Health", "Expired", health.expired);
  addMetric("Health", "Inactive", health.inactive);

  const attention = pkg.overviewReport.needsAttention;
  addMetric("Attention", "Expiring Within 30 Days", attention.expiringWithin30Days);
  addMetric("Attention", "Canceled Accounts", attention.canceledAccounts);
  addMetric("Attention", "Expired Accounts", attention.expiredAccounts);

  for (const entry of pkg.overviewReport.planDistribution.entries) {
    addMetric("Plan Distribution", entry.planCode, entry.ownerCount);
  }

  overviewSheet.getColumn(1).width = 22;
  overviewSheet.getColumn(2).width = 28;
  overviewSheet.getColumn(3).width = 16;

  const subscribersSheet = workbook.addWorksheet("Subscribers");
  subscribersSheet.addRow([
    "Owner Email",
    "Owner Name",
    "Role",
    "Plan Code",
    "Plan Name",
    "Status",
    "Billing Cycle",
    "Period End",
    "Trial Ends",
    "Entitled",
    "Counts In MRR",
  ]);
  for (const row of pkg.subscriberReport.rows) {
    subscribersSheet.addRow([
      row.ownerEmail ?? "",
      row.ownerName ?? "",
      row.ownerRole,
      row.planCode,
      row.planName ?? "",
      row.subscriptionStatus ?? "",
      row.billingCycle ?? "",
      row.currentPeriodEnd ?? "",
      row.trialEndsAt ?? "",
      row.isEntitled,
      row.countsInMrr,
    ]);
  }

  const operationalSheet = workbook.addWorksheet("Operational Summary");
  operationalSheet.addRow(["Metric", "Value"]);
  const counts = pkg.operationalReport.counts;
  operationalSheet.addRow(["Total Users", counts.totalUsers]);
  operationalSheet.addRow(["Total Restaurants", counts.totalRestaurants]);
  operationalSheet.addRow(["Active Restaurants", counts.activeRestaurants]);
  operationalSheet.addRow(["Total Menu Items", counts.totalMenuItems]);
  operationalSheet.addRow(["Total Categories", counts.totalCategories]);
  operationalSheet.addRow(["Total Offers", counts.totalOffers]);
  operationalSheet.addRow([]);
  operationalSheet.addRow([
    "Owner ID",
    "Owner Email",
    "Restaurant Count",
    "Active Restaurant Count",
  ]);
  for (const row of pkg.operationalReport.restaurantDistribution) {
    operationalSheet.addRow([
      row.ownerId,
      row.ownerEmail ?? "",
      row.restaurantCount,
      row.activeRestaurantCount,
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function commercialExcelFilename(asOf: string): string {
  const day = asOf.slice(0, 10);
  return `commercial-overview-${day}.xlsx`;
}
