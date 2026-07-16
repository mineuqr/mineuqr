/**
 * REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1 — Executive Excel presentation.
 * Presentation only. Does not calculate Revenue or other KPIs.
 *
 * Western digits are written as text (@) so Excel Arabic locales cannot
 * re-render them as Eastern Arabic numerals.
 */
import ExcelJS from "exceljs";
import {
  REPORT_THEME,
  cellBorder,
  isRtl,
  reportAlignment,
  solidFill,
} from "@/lib/excel/reportTheme";
import { resolveExportLogoAsset } from "../branding";
import { renderTrendChartPng } from "../charts/renderTrendChartPng";
import {
  formatExportDateTime,
  formatMoneyDisplay,
  formatNullableCount,
  formatPricingMode,
  formatTaxPolicySummary,
  parseDtoAmountForDisplay,
  resolveExportCurrency,
  toWesternDigits,
} from "../format";
import { reportingExportLabels, type ReportingExportLabels } from "../labels";
import type { RestaurantReportingExportBundle } from "../types";

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, " ").trim() || "Report";
  return cleaned.slice(0, 31);
}

/** Force Western digit text so Excel cannot substitute Eastern numerals. */
function setWesternText(
  cell: ExcelJS.Cell,
  value: string,
  language: RestaurantReportingExportBundle["language"],
  options?: { bold?: boolean; size?: number; color?: string; fill?: string }
) {
  cell.value = toWesternDigits(value);
  cell.numFmt = "@";
  cell.font = {
    name: language === "ar" ? "Arial" : "Calibri",
    size: options?.size ?? 11,
    bold: options?.bold ?? false,
    color: { argb: options?.color ?? REPORT_THEME.bodyText },
  };
  if (options?.fill) cell.fill = solidFill(options.fill);
}

function formatWesternCount(value: number): string {
  return toWesternDigits(
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)
  );
}

function formatWesternAmount(value: string | number): string {
  const n =
    typeof value === "number" ? value : parseDtoAmountForDisplay(String(value));
  return toWesternDigits(
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  );
}

function applyPrintSetup(
  sheet: ExcelJS.Worksheet,
  language: RestaurantReportingExportBundle["language"],
  options?: { landscape?: boolean; freezeAt?: number }
) {
  const rtl = isRtl(language);
  sheet.views = [
    {
      // Keep sheet LTR for numeral stability; RTL via cell readingOrder/alignment.
      rightToLeft: false,
      state: "frozen",
      ySplit: options?.freezeAt ?? 3,
      showGridLines: false,
    },
  ];
  sheet.pageSetup = {
    orientation: options?.landscape ? "landscape" : "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    horizontalCentered: true,
    margins: {
      left: 0.55,
      right: 0.55,
      top: 0.55,
      bottom: 0.55,
      header: 0.25,
      footer: 0.3,
    },
    printTitlesRow: "1:3",
  };
  sheet.headerFooter = {
    oddFooter: rtl
      ? `&R${toWesternDigits("MineuQR")}&L&P / &N`
      : `&LMineuQR&RPage &P of &N`,
  };
  void rtl;
}

function writeStyledTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  headers: string[],
  dataRows: ReadonlyArray<ReadonlyArray<string>>,
  language: RestaurantReportingExportBundle["language"]
): number {
  const headerRow = sheet.getRow(startRow);
  headers.forEach((text, col) => {
    const cell = headerRow.getCell(col + 1);
    setWesternText(cell, text, language, {
      bold: true,
      color: REPORT_THEME.headerText,
      fill: REPORT_THEME.headerBg,
    });
    cell.alignment = reportAlignment(language, "center");
    cell.border = cellBorder(REPORT_THEME.border);
  });
  headerRow.height = 28;

  dataRows.forEach((values, index) => {
    const row = sheet.getRow(startRow + 1 + index);
    const fill = index % 2 === 1 ? REPORT_THEME.zebra : REPORT_THEME.white;
    values.forEach((value, col) => {
      const cell = row.getCell(col + 1);
      setWesternText(cell, value, language, { fill });
      cell.alignment = reportAlignment(language, "center");
      cell.border = cellBorder(REPORT_THEME.borderLight);
    });
    row.height = 24;
  });

  headers.forEach((_, i) => {
    const col = sheet.getColumn(i + 1);
    let maxLen = String(headers[i] ?? "").length;
    for (const row of dataRows) {
      const len = String(row[i] ?? "").length;
      if (len > maxLen) maxLen = len;
    }
    col.width = Math.min(36, Math.max(14, maxLen + 3));
  });

  return startRow + 1 + dataRows.length;
}

function writeKpiCards(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  cards: ReadonlyArray<readonly [string, string]>,
  language: RestaurantReportingExportBundle["language"]
): number {
  const rtl = isRtl(language);
  const cols = 3;
  let row = startRow;
  for (let i = 0; i < cards.length; i += cols) {
    for (let c = 0; c < cols; c++) {
      const card = cards[i + c];
      if (!card) continue;
      const col = c * 2 + 1;
      sheet.mergeCells(row, col, row, col + 1);
      sheet.mergeCells(row + 1, col, row + 1, col + 1);

      const labelCell = sheet.getCell(row, col);
      setWesternText(labelCell, card[0], language, {
        size: 9,
        color: REPORT_THEME.subtitle,
        fill: REPORT_THEME.brandBanner,
      });
      labelCell.alignment = reportAlignment(language, rtl ? "right" : "left", 1);
      labelCell.border = cellBorder(REPORT_THEME.borderLight);

      const valueCell = sheet.getCell(row + 1, col);
      setWesternText(valueCell, card[1], language, {
        bold: true,
        size: 16,
        color: REPORT_THEME.brandDark,
        fill: REPORT_THEME.white,
      });
      valueCell.alignment = reportAlignment(language, rtl ? "right" : "left", 1);
      valueCell.border = cellBorder(REPORT_THEME.border);
    }
    sheet.getRow(row).height = 20;
    sheet.getRow(row + 1).height = 32;
    row += 3;
  }
  return row;
}

async function maybeAddChartImage(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  anchorCol: number,
  anchorRow: number,
  title: string,
  categories: readonly string[],
  series: ReadonlyArray<{ label: string; values: readonly number[] }>
) {
  if (categories.length === 0) return;
  const png = await renderTrendChartPng({
    title,
    categories: categories.map((c) => toWesternDigits(c)),
    series,
  });
  if (!png) return;
  const imageId = workbook.addImage({
    buffer: png as unknown as ExcelJS.Buffer,
    extension: "png",
  });
  sheet.addImage(imageId, {
    tl: { col: anchorCol, row: anchorRow },
    ext: { width: 680, height: 300 },
  });
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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MineuQR";
  workbook.lastModifiedBy = "MineuQR";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.title = bundle.reportTitle || labels.reportTitleDefault;
  workbook.subject = labels.coverSubtitle;

  const generated = formatExportDateTime(new Date(), bundle.language);
  const periodLabel = toWesternDigits(bundle.periodLabel);
  const money = (amount: string) =>
    toWesternDigits(formatMoneyDisplay(amount, currencySymbol));
  const reportTitle = bundle.reportTitle?.trim() || labels.reportTitleDefault;
  const businessName = (bundle.businessName || bundle.restaurantName || "").trim();
  const logo = await resolveExportLogoAsset(bundle.logoUrl);

  buildCoverSheet(workbook, {
    bundle,
    labels,
    reportTitle,
    generated,
    periodLabel,
    currencyCode,
    currencySymbol,
    businessName,
    logo,
  });
  buildExecutiveSheet(workbook, {
    bundle,
    labels,
    money,
    generated,
    periodLabel,
  });
  buildFinancialSheet(workbook, {
    bundle,
    labels,
    money,
    currencyCode,
    currencySymbol,
  });
  buildOperationalSheet(workbook, { bundle, labels });
  buildCatalogSheet(workbook, { bundle, labels });
  await buildRevenueTrendSheet(workbook, { bundle, labels, currencySymbol });
  await buildOrderSalesSheet(workbook, { bundle, labels, currencySymbol });

  return workbook;
}

function buildCoverSheet(
  workbook: ExcelJS.Workbook,
  ctx: {
    bundle: RestaurantReportingExportBundle;
    labels: ReportingExportLabels;
    reportTitle: string;
    generated: string;
    periodLabel: string;
    currencyCode: string;
    currencySymbol: string;
    businessName: string;
    logo: Awaited<ReturnType<typeof resolveExportLogoAsset>>;
  }
) {
  const {
    bundle,
    labels,
    reportTitle,
    generated,
    periodLabel,
    currencyCode,
    currencySymbol,
    businessName,
    logo,
  } = ctx;
  const sheet = workbook.addWorksheet(sanitizeSheetName(labels.cover));
  const lang = bundle.language;
  const rtl = isRtl(lang);

  for (let c = 1; c <= 6; c++) sheet.getColumn(c).width = 16;

  // Full-bleed brand banner (rows 1–5)
  for (let r = 1; r <= 5; r++) {
    sheet.getRow(r).height = 20;
    for (let c = 1; c <= 6; c++) {
      sheet.getCell(r, c).fill = solidFill(REPORT_THEME.brandDark);
    }
  }
  sheet.getRow(1).height = 12;
  sheet.getRow(5).height = 12;

  // Text columns leave col 1 for logo
  sheet.mergeCells(2, 2, 2, 6);
  setWesternText(sheet.getCell(2, 2), bundle.restaurantName || "—", lang, {
    bold: true,
    size: 22,
    color: "FFFFFFFF",
    fill: REPORT_THEME.brandDark,
  });
  sheet.getCell(2, 2).alignment = reportAlignment(lang, rtl ? "right" : "left", 1);
  sheet.getRow(2).height = 28;

  sheet.mergeCells(3, 2, 3, 6);
  setWesternText(
    sheet.getCell(3, 2),
    `${labels.businessName}: ${businessName || "—"}`,
    lang,
    { size: 11, color: "FFCCFBF1", fill: REPORT_THEME.brandDark }
  );
  sheet.getCell(3, 2).alignment = reportAlignment(lang, rtl ? "right" : "left", 1);

  sheet.mergeCells(4, 2, 4, 6);
  setWesternText(sheet.getCell(4, 2), reportTitle, lang, {
    bold: true,
    size: 13,
    color: "FFFFFFFF",
    fill: REPORT_THEME.brandDark,
  });
  sheet.getCell(4, 2).alignment = reportAlignment(lang, rtl ? "right" : "left", 1);

  if (logo) {
    const imageId = workbook.addImage({
      buffer: logo.buffer as unknown as ExcelJS.Buffer,
      extension: logo.extension,
    });
    sheet.addImage(imageId, {
      tl: { col: rtl ? 4.55 : 0.2, row: 0.9 },
      ext: { width: 68, height: 68 },
    });
  }

  // Accent bar
  sheet.mergeCells(6, 1, 6, 6);
  sheet.getCell(6, 1).fill = solidFill(REPORT_THEME.brand);
  sheet.getRow(6).height = 8;

  sheet.mergeCells(8, 1, 8, 6);
  setWesternText(sheet.getCell(8, 1), labels.coverSubtitle, lang, {
    size: 12,
    color: REPORT_THEME.subtitle,
  });
  sheet.getCell(8, 1).alignment = reportAlignment(lang, rtl ? "right" : "left", 1);

  const metaStart = 10;
  const meta: Array<readonly [string, string]> = [
    [labels.restaurantName, bundle.restaurantName || "—"],
    [labels.businessName, businessName || "—"],
    [labels.period, periodLabel],
    [labels.generated, generated],
    [labels.currency, `${currencyCode} (${currencySymbol})`],
    [labels.pricingMode, formatPricingMode(bundle.business, lang)],
    [labels.taxPolicy, formatTaxPolicySummary(bundle.business, lang)],
  ];

  meta.forEach(([label, value], index) => {
    const r = metaStart + index;
    sheet.mergeCells(r, 1, r, 2);
    sheet.mergeCells(r, 3, r, 6);
    setWesternText(sheet.getCell(r, 1), label, lang, {
      size: 10,
      color: REPORT_THEME.subtitle,
      fill: index % 2 === 0 ? REPORT_THEME.brandBanner : REPORT_THEME.white,
    });
    setWesternText(sheet.getCell(r, 3), value, lang, {
      bold: true,
      size: 12,
      fill: index % 2 === 0 ? REPORT_THEME.brandBanner : REPORT_THEME.white,
    });
    sheet.getCell(r, 1).alignment = reportAlignment(lang, rtl ? "right" : "left", 1);
    sheet.getCell(r, 3).alignment = reportAlignment(lang, rtl ? "right" : "left", 1);
    sheet.getCell(r, 1).border = cellBorder(REPORT_THEME.borderLight);
    sheet.getCell(r, 3).border = cellBorder(REPORT_THEME.borderLight);
    sheet.getRow(r).height = 24;
  });

  sheet.mergeCells(metaStart + meta.length + 1, 1, metaStart + meta.length + 1, 6);
  setWesternText(
    sheet.getCell(metaStart + meta.length + 1, 1),
    `${labels.confidential} · ${labels.generatedBy}`,
    lang,
    { size: 9, color: REPORT_THEME.meta }
  );

  applyPrintSetup(sheet, lang, { freezeAt: 0 });
  sheet.views = [{ rightToLeft: false, showGridLines: false }];
}

function buildExecutiveSheet(
  workbook: ExcelJS.Workbook,
  ctx: {
    bundle: RestaurantReportingExportBundle;
    labels: ReportingExportLabels;
    money: (amount: string) => string;
    generated: string;
    periodLabel: string;
  }
) {
  const { bundle, labels, money, generated, periodLabel } = ctx;
  const sheet = workbook.addWorksheet(sanitizeSheetName(labels.executive));
  const lang = bundle.language;
  const biz = bundle.business;
  const sales = bundle.orderSales;
  const ops = bundle.operational;

  sheet.mergeCells(1, 1, 1, 6);
  setWesternText(sheet.getCell(1, 1), labels.executive, lang, {
    bold: true,
    size: 20,
    color: REPORT_THEME.title,
  });
  sheet.getRow(1).height = 30;

  setWesternText(
    sheet.getCell(2, 1),
    `${labels.period}: ${periodLabel}`,
    lang,
    { size: 10, color: REPORT_THEME.subtitle }
  );
  setWesternText(
    sheet.getCell(3, 1),
    `${labels.generated}: ${generated}`,
    lang,
    { size: 10, color: REPORT_THEME.meta }
  );

  writeKpiCards(
    sheet,
    5,
    [
      [labels.revenue, money(biz.revenue)],
      [labels.orderSalesMonth, money(sales.month.orderSales)],
      [labels.paidChecks, formatWesternCount(biz.paidCheckCount)],
      [labels.averageCheck, money(biz.averageCheck)],
      [labels.averageOrderMonth, money(sales.month.averageOrder)],
      [labels.sessionsActive, formatWesternCount(ops.activeSessions)],
      [labels.ordersMonth, formatWesternCount(sales.month.totalOrders)],
      [labels.orderSalesToday, money(sales.today.orderSales)],
      [labels.ordersToday, formatWesternCount(sales.today.totalOrders)],
    ],
    lang
  );

  for (let c = 1; c <= 6; c++) sheet.getColumn(c).width = 15;
  applyPrintSetup(sheet, lang, { landscape: true, freezeAt: 4 });
}

function buildFinancialSheet(
  workbook: ExcelJS.Workbook,
  ctx: {
    bundle: RestaurantReportingExportBundle;
    labels: ReportingExportLabels;
    money: (amount: string) => string;
    currencyCode: string;
    currencySymbol: string;
  }
) {
  const { bundle, labels, money, currencyCode, currencySymbol } = ctx;
  const sheet = workbook.addWorksheet(sanitizeSheetName(labels.financial));
  const lang = bundle.language;
  const biz = bundle.business;
  const sales = bundle.orderSales;

  sheet.mergeCells(1, 1, 1, 2);
  setWesternText(sheet.getCell(1, 1), labels.financial, lang, {
    bold: true,
    size: 18,
    color: REPORT_THEME.title,
  });
  sheet.getRow(1).height = 28;

  writeStyledTable(
    sheet,
    3,
    [labels.metric, labels.value],
    [
      [labels.revenue, money(biz.revenue)],
      [labels.taxCollected, money(biz.taxCollected)],
      [labels.complimentaryCount, formatWesternCount(biz.complimentaryCount)],
      [labels.complimentaryAmount, money(biz.complimentaryAmount)],
      [labels.voidedCount, formatWesternCount(biz.voidedCount)],
      [labels.currency, `${currencyCode} (${currencySymbol})`],
      [labels.pricingMode, formatPricingMode(biz, lang)],
      [labels.taxPolicy, formatTaxPolicySummary(biz, lang)],
      [labels.orderSalesMonth, money(sales.month.orderSales)],
      [labels.orderSalesToday, money(sales.today.orderSales)],
    ],
    lang
  );
  applyPrintSetup(sheet, lang, { freezeAt: 3 });
}

function buildOperationalSheet(
  workbook: ExcelJS.Workbook,
  ctx: {
    bundle: RestaurantReportingExportBundle;
    labels: ReportingExportLabels;
  }
) {
  const { bundle, labels } = ctx;
  const sheet = workbook.addWorksheet(sanitizeSheetName(labels.operational));
  const lang = bundle.language;
  const ops = bundle.operational;

  sheet.mergeCells(1, 1, 1, 2);
  setWesternText(sheet.getCell(1, 1), labels.operational, lang, {
    bold: true,
    size: 18,
    color: REPORT_THEME.title,
  });

  writeStyledTable(
    sheet,
    3,
    [labels.metric, labels.value],
    [
      [labels.sessionsActive, formatWesternCount(ops.activeSessions)],
      [labels.occupiedTables, formatWesternCount(ops.occupiedTables)],
      [labels.pendingOrders, formatWesternCount(ops.pendingOrders)],
      [labels.kitchenLoad, formatWesternCount(ops.kitchenLoad)],
      [labels.activeOrders, formatNullableCount(ops.activeOrders)],
      [labels.preparingOrders, formatNullableCount(ops.preparingOrders)],
      [labels.readyOrders, formatNullableCount(ops.readyOrders)],
    ],
    lang
  );
  applyPrintSetup(sheet, lang, { freezeAt: 3 });
}

function buildCatalogSheet(
  workbook: ExcelJS.Workbook,
  ctx: {
    bundle: RestaurantReportingExportBundle;
    labels: ReportingExportLabels;
  }
) {
  const { bundle, labels } = ctx;
  const sheet = workbook.addWorksheet(sanitizeSheetName(labels.catalog));
  const lang = bundle.language;
  const catalog = bundle.catalog;

  sheet.mergeCells(1, 1, 1, 2);
  setWesternText(sheet.getCell(1, 1), labels.catalog, lang, {
    bold: true,
    size: 18,
    color: REPORT_THEME.title,
  });

  writeStyledTable(
    sheet,
    3,
    [labels.metric, labels.value],
    [
      [labels.categories, formatWesternCount(catalog.categoryCount)],
      [labels.items, formatWesternCount(catalog.itemCount)],
      [labels.menuVisits, formatWesternCount(catalog.menuVisits)],
    ],
    lang
  );

  sheet.mergeCells(8, 1, 8, 2);
  setWesternText(sheet.getCell(8, 1), labels.catalogPlaceholderTitle, lang, {
    bold: true,
    size: 12,
    color: REPORT_THEME.brandDark,
  });
  sheet.mergeCells(9, 1, 10, 2);
  setWesternText(sheet.getCell(9, 1), labels.catalogPlaceholderBody, lang, {
    size: 10,
    color: REPORT_THEME.subtitle,
    fill: REPORT_THEME.brandBanner,
  });
  sheet.getCell(9, 1).alignment = {
    ...reportAlignment(lang, isRtl(lang) ? "right" : "left", 1),
    wrapText: true,
    vertical: "top",
  };
  sheet.getRow(9).height = 40;

  applyPrintSetup(sheet, lang, { freezeAt: 3 });
}

async function buildRevenueTrendSheet(
  workbook: ExcelJS.Workbook,
  ctx: {
    bundle: RestaurantReportingExportBundle;
    labels: ReportingExportLabels;
    currencySymbol: string;
  }
) {
  const { bundle, labels, currencySymbol } = ctx;
  const sheet = workbook.addWorksheet(sanitizeSheetName(labels.revenueTrend));
  const lang = bundle.language;
  const points = bundle.revenueTrend.points;

  sheet.mergeCells(1, 1, 1, 4);
  setWesternText(sheet.getCell(1, 1), labels.revenueTrend, lang, {
    bold: true,
    size: 18,
    color: REPORT_THEME.title,
  });

  const end = writeStyledTable(
    sheet,
    3,
    [
      labels.periodKey,
      labels.paidCheckCount,
      labels.revenue,
      labels.taxCollected,
    ],
    points.map((p) => [
      toWesternDigits(p.periodKey),
      formatWesternCount(p.paidCheckCount),
      `${formatWesternAmount(p.revenue)} ${currencySymbol}`,
      `${formatWesternAmount(p.taxCollected)} ${currencySymbol}`,
    ]),
    lang
  );

  await maybeAddChartImage(
    workbook,
    sheet,
    0,
    end + 1,
    labels.chartRevenueTrend,
    points.map((p) => p.periodKey),
    [
      {
        label: labels.revenue,
        values: points.map((p) => parseDtoAmountForDisplay(p.revenue)),
      },
    ]
  );

  applyPrintSetup(sheet, lang, { landscape: true, freezeAt: 3 });
}

async function buildOrderSalesSheet(
  workbook: ExcelJS.Workbook,
  ctx: {
    bundle: RestaurantReportingExportBundle;
    labels: ReportingExportLabels;
    currencySymbol: string;
  }
) {
  const { bundle, labels, currencySymbol } = ctx;
  const sheet = workbook.addWorksheet(sanitizeSheetName(labels.orderSalesRollup));
  const lang = bundle.language;
  const periods = bundle.orderSalesRollup.periods;

  sheet.mergeCells(1, 1, 1, 4);
  setWesternText(sheet.getCell(1, 1), labels.orderSalesRollup, lang, {
    bold: true,
    size: 18,
    color: REPORT_THEME.title,
  });

  const end = writeStyledTable(
    sheet,
    3,
    [
      labels.periodKey,
      labels.orderCount,
      labels.completedOrders,
      labels.orderSales,
    ],
    periods.map((p) => [
      toWesternDigits(p.periodKey),
      formatWesternCount(p.orderCount),
      formatWesternCount(p.completedOrders),
      `${formatWesternAmount(p.orderSales)} ${currencySymbol}`,
    ]),
    lang
  );

  await maybeAddChartImage(
    workbook,
    sheet,
    0,
    end + 1,
    labels.chartOrderTrend,
    periods.map((p) => p.periodKey),
    [
      {
        label: labels.orderSales,
        values: periods.map((p) => parseDtoAmountForDisplay(p.orderSales)),
      },
    ]
  );

  applyPrintSetup(sheet, lang, { landscape: true, freezeAt: 3 });
}
