import type {
  CommercialExportFormat,
  CommercialExportFile,
  CommercialExportPackage,
} from "./reportContracts";
import {
  commercialCsvFilename,
  renderCommercialCsv,
} from "./adapters/CommercialCsvAdapter";
import {
  commercialExcelFilename,
  renderCommercialExcel,
} from "./adapters/CommercialExcelAdapter";
import {
  commercialPdfFilename,
  renderCommercialPdf,
} from "./adapters/CommercialPdfAdapter";

export async function renderCommercialExport(
  pkg: CommercialExportPackage,
  format: CommercialExportFormat,
  locale?: "en" | "ar"
): Promise<CommercialExportFile> {
  const asOf = pkg.envelope.dataAsOf;

  if (format === "csv") {
    const csv = renderCommercialCsv(pkg, { locale });
    return {
      filename: commercialCsvFilename(asOf),
      mimeType: "text/csv;charset=utf-8",
      dataBase64: Buffer.from(csv, "utf-8").toString("base64"),
    };
  }

  if (format === "xlsx") {
    const buffer = await renderCommercialExcel(pkg, { locale });
    return {
      filename: commercialExcelFilename(asOf),
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dataBase64: buffer.toString("base64"),
    };
  }

  const buffer = await renderCommercialPdf(pkg, { locale });
  return {
    filename: commercialPdfFilename(asOf),
    mimeType: "application/pdf",
    dataBase64: buffer.toString("base64"),
  };
}
