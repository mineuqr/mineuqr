/**
 * REPORTING-EXPORTS-1 — Excel presentation renderer.
 * Layout / formatting only. Does not calculate Revenue or other KPIs.
 */
import ExcelJS from "exceljs";
import {
  buildExcelCurrencyNumFmt,
  normalizeCurrencyCode,
} from "@/lib/currencyLocale";
import { formatInRestaurantTimezone } from "@/lib/datetime";
import {
  REPORT_ROW_HEIGHTS,
  REPORT_THEME,
  bodyFont,
  cellBorder,
  isRtl,
  reportAlignment,
  solidFill,
  titleFont,
} from "@/lib/excel/reportTheme";
import {
  formatMoneyDisplay,
  formatNullableCount,
  formatPricingMode,
  resolveExportCurrency,
} from "../format";
import { reportingExportLabels } from "../labels";
import type { RestaurantReportingExportBundle } from "../types";

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, " ").trim() || "Report";
  return cleaned.slice(0, 31);
}

function writeKvSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  rows: ReadonlyArray<readonly [string, string]>,
  language: RestaurantReportingExportBundle["language"]
) {
  const sheet = workbook.addWorksheet(sanitizeSheetName(sheetName));
  const rtl = isRtl(language);

  sheet.getCell(1, 1).value = title;
  sheet.getCell(1, 1).font = titleFont(language);
  sheet.getRow(1).height = REPORT_ROW_HEIGHTS.title;

  rows.forEach(([label, value], index) => {
    const rowIndex = index + 3;
    const row = sheet.getRow(rowIndex);
    const fill = solidFill(index % 2 === 1 ? REPORT_THEME.zebra : REPORT_THEME.white);
    const border = cellBorder(REPORT_THEME.borderLight);

    const c1 = row.getCell(1);
    c1.value = label;
    c1.font = bodyFont(language);
    c1.fill = fill;
    c1.border = border;
    c1.alignment = reportAlignment(language, rtl ? "right" : "left", 1);

    const c2 = row.getCell(2);
    c2.value = value;
    c2.font = bodyFont(language);
    c2.fill = fill;
    c2.border = border;
    c2.alignment = reportAlignment(language, rtl ? "right" : "left", 1);

    row.height = REPORT_ROW_HEIGHTS.data;
  });

  sheet.getColumn(1).width = 36;
  sheet.getColumn(2).width = 28;
  sheet.views = [{ rightToLeft: rtl, state: "frozen", ySplit: 2 }];
}

function writeTableSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  headers: string[],
  dataRows: ReadonlyArray<ReadonlyArray<string | number>>,
  language: RestaurantReportingExportBundle["language"],
  currencyNumFmt?: string
) {
  const sheet = workbook.addWorksheet(sanitizeSheetName(sheetName));
  const rtl = isRtl(language);

  sheet.getCell(1, 1).value = title;
  sheet.getCell(1, 1).font = titleFont(language);
  sheet.getRow(1).height = REPORT_ROW_HEIGHTS.title;

  const headerRow = sheet.getRow(3);
  headers.forEach((text, col) => {
    const cell = headerRow.getCell(col + 1);
    cell.value = text;
    cell.font = { ...bodyFont(language), bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = solidFill(REPORT_THEME.headerBg);
    cell.alignment = reportAlignment(language, "center");
    cell.border = cellBorder(REPORT_THEME.borderLight);
  });
  headerRow.height = REPORT_ROW_HEIGHTS.tableHeader;

  dataRows.forEach((values, index) => {
    const row = sheet.getRow(4 + index);
    const fill = solidFill(index % 2 === 1 ? REPORT_THEME.zebra : REPORT_THEME.white);
    values.forEach((value, col) => {
      const cell = row.getCell(col + 1);
      cell.value = value;
      cell.font = bodyFont(language);
      cell.fill = fill;
      cell.border = cellBorder(REPORT_THEME.borderLight);
      cell.alignment = reportAlignment(language, "center");
      if (typeof value === "number" && currencyNumFmt && col === values.length - 1) {
        cell.numFmt = currencyNumFmt;
      } else if (typeof value === "number") {
        cell.numFmt = "#,##0";
      }
    });
    row.height = REPORT_ROW_HEIGHTS.data;
  });

  headers.forEach((_, i) => {
    sheet.getColumn(i + 1).width = i === 0 ? 18 : 16;
  });
  sheet.views = [{ rightToLeft: rtl, state: "frozen", ySplit: 3 }];
}

function parseAmountForDisplay(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export async function buildReportingExportWorkbook(
  bundle: RestaurantReportingExportBundle,
  fallbackCurrencySymbol: string,
  fallbackCurrencyCode?: string
): Promise<ExcelJS.Workbook> {
  const labels = reportingExportLabels(bundle.language);
  const { currencySymbol, currencyCode } = resolveExportCurrency(
    bundle.business,
    fallbackCurrencySymbol,
    fallbackCurrencyCode
  );
  const currencyFmt = buildExcelCurrencyNumFmt({
    language: bundle.language,
    currencyCode: normalizeCurrencyCode(currencyCode, currencySymbol),
    currencySymbol,
    decimalPlaces: 2,
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MineuQR";
  workbook.lastModifiedBy = "MineuQR";
  workbook.created = new Date();
  workbook.modified = new Date();

  const generated = formatInRestaurantTimezone(
    new Date(),
    bundle.language === "ar" ? "ar-SA" : "en-GB",
    { dateStyle: "medium", timeStyle: "short" }
  );

  const money = (amount: string) => formatMoneyDisplay(amount, currencySymbol);
  const biz = bundle.business;
  const sales = bundle.orderSales;
  const ops = bundle.operational;
  const catalog = bundle.catalog;

  writeKvSheet(
    workbook,
    labels.executive,
    labels.executive,
    [
      [labels.period, bundle.periodLabel],
      [labels.generated, generated],
      [labels.revenue, money(biz.revenue)],
      [labels.orderSalesToday, money(sales.today.orderSales)],
      [labels.orderSalesMonth, money(sales.month.orderSales)],
      [labels.paidChecks, String(biz.paidCheckCount)],
      [labels.averageCheck, money(biz.averageCheck)],
      [labels.averageOrderToday, money(sales.today.averageOrder)],
      [labels.averageOrderMonth, money(sales.month.averageOrder)],
      [labels.sessionsActive, String(ops.activeSessions)],
      [labels.ordersToday, String(sales.today.totalOrders)],
      [labels.ordersMonth, String(sales.month.totalOrders)],
    ],
    bundle.language
  );

  writeKvSheet(
    workbook,
    labels.financial,
    labels.financial,
    [
      [labels.revenue, money(biz.revenue)],
      [labels.taxCollected, money(biz.taxCollected)],
      [labels.complimentaryCount, String(biz.complimentaryCount)],
      [labels.complimentaryAmount, money(biz.complimentaryAmount)],
      [labels.voidedCount, String(biz.voidedCount)],
      [labels.currency, `${currencyCode} (${currencySymbol})`],
      [labels.pricingMode, formatPricingMode(biz, bundle.language)],
    ],
    bundle.language
  );

  writeKvSheet(
    workbook,
    labels.operational,
    labels.operational,
    [
      [labels.sessionsActive, String(ops.activeSessions)],
      [labels.occupiedTables, String(ops.occupiedTables)],
      [labels.pendingOrders, String(ops.pendingOrders)],
      [labels.kitchenLoad, String(ops.kitchenLoad)],
      [labels.activeOrders, formatNullableCount(ops.activeOrders)],
      [labels.preparingOrders, formatNullableCount(ops.preparingOrders)],
      [labels.readyOrders, formatNullableCount(ops.readyOrders)],
    ],
    bundle.language
  );

  writeKvSheet(
    workbook,
    labels.catalog,
    labels.catalog,
    [
      [labels.categories, String(catalog.categoryCount)],
      [labels.items, String(catalog.itemCount)],
      [labels.menuVisits, String(catalog.menuVisits)],
      [labels.topSellersNote, ""],
    ],
    bundle.language
  );

  writeTableSheet(
    workbook,
    labels.orderSalesRollup,
    labels.orderSalesRollup,
    [
      labels.periodKey,
      labels.orderCount,
      labels.completedOrders,
      labels.orderSales,
    ],
    bundle.orderSalesRollup.periods.map((p) => [
      p.periodKey,
      p.orderCount,
      p.completedOrders,
      parseAmountForDisplay(p.orderSales),
    ]),
    bundle.language,
    currencyFmt
  );

  writeTableSheet(
    workbook,
    labels.revenueTrend,
    labels.revenueTrend,
    [
      labels.periodKey,
      labels.paidCheckCount,
      labels.revenue,
      labels.taxCollected,
    ],
    bundle.revenueTrend.points.map((p) => [
      p.periodKey,
      p.paidCheckCount,
      parseAmountForDisplay(p.revenue),
      parseAmountForDisplay(p.taxCollected),
    ]),
    bundle.language,
    currencyFmt
  );

  if (bundle.restaurantName.trim()) {
    const cover = workbook.worksheets[0];
    if (cover) {
      cover.getCell(2, 1).value = bundle.restaurantName.trim();
      cover.getCell(2, 1).font = bodyFont(bundle.language);
    }
  }

  return workbook;
}
