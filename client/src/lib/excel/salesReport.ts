import ExcelJS from "exceljs";
import {
  computeReportLayout,
  applyBrandingHeader,
  applyRestaurantName,
  applyReportTitle,
  applyPeriodBlock,
  applyHeaderSpacer,
  applyWorksheetUx,
  applyTableColumnWidths,
  styleTableHeaderCell,
  type ReportSheetLayout,
} from "./reportLayout";
import {
  buildExcelCurrencyNumFmt,
  normalizeCurrencyCode,
  type CurrencyFormatInput,
} from "../currencyLocale";
import { formatInRestaurantTimezone } from "@/lib/datetime";
import {
  REPORT_ROW_HEIGHTS,
  REPORT_THEME,
  bodyFont,
  cellBorder,
  isRtl,
  reportAlignment,
  solidFill,
  totalsFont,
  totalsRowBorder,
  type ReportLanguage,
} from "./reportTheme";

export type SalesReportDataRow = {
  label: string;
  orderCount: number;
  totalSales: number;
};

export type SalesReportExportConfig = {
  language: ReportLanguage;
  filename: string;
  sheetName: string;
  reportTitle: string;
  reportSubtitle: string;
  columnHeaders: [string, string, string];
  rows: SalesReportDataRow[];
  currencySymbol: string;
  currencyCode?: string;
  totalsLabel: string;
  restaurantName?: string;
  generatedAt?: Date;
};

function ensureXlsxFilename(filename: string): string {
  const base = filename.replace(/\.(csv|xls|xlsx)$/i, "");
  return `${base}.xlsx`;
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, " ").trim() || "Report";
  return cleaned.slice(0, 31);
}

function resolveCurrency(config: SalesReportExportConfig): CurrencyFormatInput {
  return {
    language: config.language,
    currencyCode: normalizeCurrencyCode(config.currencyCode, config.currencySymbol),
    currencySymbol: config.currencySymbol,
    decimalPlaces: 2,
  };
}

function formatGeneratedMeta(language: ReportLanguage, date: Date): string {
  const locale = language === "ar" ? "ar-SA" : "en-GB";
  const formatted = formatInRestaurantTimezone(date, locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return language === "ar" ? `تاريخ التصدير: ${formatted}` : `Exported: ${formatted}`;
}

function applyTableHeaderRow(
  sheet: ExcelJS.Worksheet,
  layout: ReportSheetLayout,
  headers: [string, string, string],
  language: ReportLanguage
) {
  const row = sheet.getRow(layout.tableHeaderRow);
  headers.forEach((text, index) => {
    styleTableHeaderCell(sheet, layout.tableHeaderRow, index + 1, text, language);
  });
  row.height = REPORT_ROW_HEIGHTS.tableHeader;
}

function applyDataRow(
  sheet: ExcelJS.Worksheet,
  rowIndex: number,
  data: SalesReportDataRow,
  language: ReportLanguage,
  currency: CurrencyFormatInput,
  zebra: boolean
) {
  const row = sheet.getRow(rowIndex);
  const fill = solidFill(zebra ? REPORT_THEME.zebra : REPORT_THEME.white);
  const border = cellBorder(REPORT_THEME.borderLight);
  const labelAlign = isRtl(language) ? "right" : "left";
  const labelIndent = 1;

  const labelCell = row.getCell(1);
  labelCell.value = data.label;
  labelCell.font = bodyFont(language);
  labelCell.fill = fill;
  labelCell.alignment = reportAlignment(language, labelAlign, labelIndent);
  labelCell.border = border;

  const countCell = row.getCell(2);
  countCell.value = data.orderCount;
  countCell.numFmt = "#,##0";
  countCell.font = bodyFont(language);
  countCell.fill = fill;
  countCell.alignment = reportAlignment(language, "center");
  countCell.border = border;

  const salesCell = row.getCell(3);
  salesCell.value = data.totalSales;
  salesCell.numFmt = buildExcelCurrencyNumFmt(currency);
  salesCell.font = bodyFont(language);
  salesCell.fill = fill;
  salesCell.alignment = reportAlignment(language, "center");
  salesCell.border = border;

  row.height = REPORT_ROW_HEIGHTS.data;
}

function applyTotalsRow(
  sheet: ExcelJS.Worksheet,
  rowIndex: number,
  totalsLabel: string,
  totalOrders: number,
  totalSales: number,
  language: ReportLanguage,
  currency: CurrencyFormatInput
) {
  const row = sheet.getRow(rowIndex);
  const fill = solidFill(REPORT_THEME.totalsBg);
  const font = totalsFont(language);
  const border = totalsRowBorder();
  const labelAlign = isRtl(language) ? "right" : "left";

  const c1 = row.getCell(1);
  c1.value = totalsLabel;
  c1.font = font;
  c1.fill = fill;
  c1.alignment = reportAlignment(language, labelAlign, 1);
  c1.border = border;

  const c2 = row.getCell(2);
  c2.value = totalOrders;
  c2.numFmt = "#,##0";
  c2.font = font;
  c2.fill = fill;
  c2.alignment = reportAlignment(language, "center");
  c2.border = border;

  const c3 = row.getCell(3);
  c3.value = totalSales;
  c3.numFmt = buildExcelCurrencyNumFmt(currency);
  c3.font = font;
  c3.fill = fill;
  c3.alignment = reportAlignment(language, "center");
  c3.border = border;

  row.height = REPORT_ROW_HEIGHTS.totals;
}

export async function buildSalesReportWorkbook(config: SalesReportExportConfig): Promise<ExcelJS.Workbook> {
  const {
    language,
    sheetName,
    reportTitle,
    reportSubtitle,
    columnHeaders,
    rows,
    totalsLabel,
    restaurantName,
    generatedAt = new Date(),
  } = config;

  const currency = resolveCurrency(config);
  const layout = computeReportLayout(Boolean(restaurantName?.trim()));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MineuQR";
  workbook.lastModifiedBy = "MineuQR";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet(sanitizeSheetName(sheetName), {
    properties: { defaultRowHeight: 18 },
  });

  applyBrandingHeader(sheet, layout, language);
  if (restaurantName?.trim()) {
    applyRestaurantName(sheet, layout, language, restaurantName.trim());
  }
  applyReportTitle(sheet, layout, language, reportTitle);
  applyPeriodBlock(sheet, layout, language, reportSubtitle, formatGeneratedMeta(language, generatedAt));
  applyHeaderSpacer(sheet, layout);

  applyTableHeaderRow(sheet, layout, columnHeaders, language);

  rows.forEach((row, index) => {
    applyDataRow(sheet, layout.dataStartRow + index, row, language, currency, index % 2 === 1);
  });

  const totalOrders = rows.reduce((sum, r) => sum + r.orderCount, 0);
  const totalSales = rows.reduce((sum, r) => sum + r.totalSales, 0);
  const totalsRowIndex = layout.dataStartRow + rows.length;
  applyTotalsRow(sheet, totalsRowIndex, totalsLabel, totalOrders, totalSales, language, currency);

  applyTableColumnWidths(sheet, layout, totalsRowIndex);
  applyWorksheetUx(sheet, language, layout);

  return workbook;
}

export async function downloadSalesReportXlsx(config: SalesReportExportConfig): Promise<void> {
  const workbook = await buildSalesReportWorkbook(config);
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = ensureXlsxFilename(config.filename);
  anchor.click();
  URL.revokeObjectURL(url);
}
