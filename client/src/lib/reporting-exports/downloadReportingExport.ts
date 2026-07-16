import { buildReportingExportWorkbook } from "./excel/buildReportingExportWorkbook";
import type { RestaurantReportingExportBundle } from "./types";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadReportingExportXlsx(
  bundle: RestaurantReportingExportBundle,
  fallbackCurrencySymbol: string,
  fallbackCurrencyCode?: string
): Promise<void> {
  const workbook = await buildReportingExportWorkbook(
    bundle,
    fallbackCurrencySymbol,
    fallbackCurrencyCode
  );
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, `${bundle.filenameStem}.xlsx`);
}

/**
 * REPORTING-PERIOD-CONSISTENCY-1 — PDF export suspended.
 * Excel is the sole executive reporting deliverable for now.
 */
export async function downloadReportingExportPdf(
  _bundle: RestaurantReportingExportBundle,
  _fallbackCurrencySymbol: string,
  _fallbackCurrencyCode?: string
): Promise<void> {
  throw new Error(
    "PDF reporting export is suspended (REPORTING-PERIOD-CONSISTENCY-1). Use Excel export."
  );
}
