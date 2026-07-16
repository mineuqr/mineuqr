import { buildReportingExportWorkbook } from "./excel/buildReportingExportWorkbook";
import { buildReportingExportPdfBlob } from "./pdf/buildReportingExportPdf";
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

export async function downloadReportingExportPdf(
  bundle: RestaurantReportingExportBundle,
  fallbackCurrencySymbol: string,
  fallbackCurrencyCode?: string
): Promise<void> {
  const blob = await buildReportingExportPdfBlob(
    bundle,
    fallbackCurrencySymbol,
    fallbackCurrencyCode
  );
  triggerDownload(blob, `${bundle.filenameStem}.pdf`);
}
