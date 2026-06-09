import type { CommercialExportPackage } from "../reportContracts";
import { csvRow } from "./csvEscape";

export type CsvAdapterOptions = {
  locale?: "en" | "ar";
};

function formatStatusLabel(
  row: CommercialExportPackage["subscriberReport"]["rows"][number]
): string {
  if (row.trialEndsAt && row.subscriptionStatus === "trial") return "trial";
  return row.subscriptionStatus ?? "inactive";
}

function formatPlanLabel(
  row: CommercialExportPackage["subscriberReport"]["rows"][number]
): string {
  if (row.planName) return row.planName;
  if (row.planCode !== "NONE") return row.planCode;
  return "-";
}

/** Presentation-only — no metric derivation. */
export function renderCommercialCsv(
  pkg: CommercialExportPackage,
  _options: CsvAdapterOptions = {}
): string {
  const { envelope, overviewReport, subscriberReport, operationalReport } = pkg;
  const lines: string[] = [];

  lines.push(`# Report: ${envelope.reportName}`);
  lines.push(`# Report Version: ${envelope.reportVersion}`);
  lines.push(`# Generated At: ${envelope.generatedAt}`);
  lines.push(`# Data As Of: ${envelope.dataAsOf}`);
  lines.push(`# Authority: ${envelope.authority.source}`);
  lines.push(`# Metrics Source: ${envelope.authority.metricsSource}`);
  lines.push(`# Definitions: ${envelope.definitionsRef}`);
  lines.push("");

  lines.push("Section,Metric,Value");
  const exec = overviewReport.executive;
  const summaryRows: Array<[string, string, string | number]> = [
    ["Executive", "MRR (USD)", exec.mrr],
    ["Executive", "ARR (USD)", exec.arr],
    ["Executive", "Commercial Subscribers", exec.commercialSubscribers],
    ["Executive", "Active Subscriptions", exec.activeSubscriptions],
    ["Executive", "Active Trials", exec.activeTrials],
    ["Executive", "Active Restaurants", exec.activeRestaurants],
    ["Executive", "Total Users", exec.totalUsers],
    ["Health", "Active", overviewReport.subscriptionHealth.active],
    ["Health", "Trial", overviewReport.subscriptionHealth.trial],
    ["Health", "Canceled", overviewReport.subscriptionHealth.canceled],
    ["Health", "Expired", overviewReport.subscriptionHealth.expired],
    ["Health", "Inactive", overviewReport.subscriptionHealth.inactive],
    ["Attention", "Expiring Within 30 Days", overviewReport.needsAttention.expiringWithin30Days],
    ["Attention", "Canceled Accounts", overviewReport.needsAttention.canceledAccounts],
    ["Attention", "Expired Accounts", overviewReport.needsAttention.expiredAccounts],
    ["Operational", "Total Restaurants", operationalReport.counts.totalRestaurants],
    ["Operational", "Total Menu Items", operationalReport.counts.totalMenuItems],
    ["Operational", "Total Categories", operationalReport.counts.totalCategories],
    ["Operational", "Total Offers", operationalReport.counts.totalOffers],
  ];

  for (const [section, metric, value] of summaryRows) {
    lines.push(csvRow([section, metric, value]));
  }

  for (const entry of overviewReport.planDistribution.entries) {
    lines.push(csvRow(["Plan Distribution", entry.planCode, entry.ownerCount]));
  }

  lines.push("");
  lines.push(
    csvRow([
      "Owner Email",
      "Owner Name",
      "Plan",
      "Status",
      "Billing Cycle",
      "Period End",
      "Entitled",
      "Counts In MRR",
    ])
  );

  for (const row of subscriberReport.rows) {
    lines.push(
      csvRow([
        row.ownerEmail ?? "",
        row.ownerName ?? "",
        formatPlanLabel(row),
        formatStatusLabel(row),
        row.billingCycle ?? "",
        row.currentPeriodEnd ?? "",
        row.isEntitled ? "yes" : "no",
        row.countsInMrr ? "yes" : "no",
      ])
    );
  }

  return lines.join("\n");
}

export function commercialCsvFilename(asOf: string): string {
  const day = asOf.slice(0, 10);
  return `commercial-overview-${day}.csv`;
}
