/**
 * REPORTING-EXCEL-UX-POLISH-1 — Executive Financial Report (Excel).
 * Preserves REPORTING-PERIOD-CONSISTENCY-1 scoped totals (scopedOrderSalesFromRollup).
 * Presentation only. Does not calculate Revenue or other KPIs.
 *
 * Full-width page composition, large KPI blocks, mandatory trend charts.
 * Order Sales period KPIs from scoped OrderSalesRollup.
 * Western digits as text (@).
 */
import ExcelJS from "exceljs";
import {
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
  formatPricingMode,
  formatTaxPolicySummary,
  parseDtoAmountForDisplay,
  resolveExportCurrency,
  toWesternDigits,
} from "../format";
import { reportingExportLabels, type ReportingExportLabels } from "../labels";
import {
  formatReportScopeLabel,
  formatTrendAxisLabel,
  hasRenderableTrend,
} from "../periodPresentation";
import { scopedOrderSalesFromRollup } from "../scopeTotals";
import type { RestaurantReportingExportBundle } from "../types";

const EX = {
  navy: "FF0B1F33",
  navyMid: "FF16324F",
  gold: "FFB8943F",
  goldSoft: "FFF7F1E1",
  ink: "FF0F172A",
  slate: "FF475569",
  mist: "FFF1F5F9",
  white: "FFFFFFFF",
  line: "FFD6DEE8",
  zebra: "FFF8FAFC",
} as const;

/** Landscape executive canvas — 12 columns, full printable width. */
const COLS = 12;
const COL_WIDTH = 11.5;

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, " ").trim() || "Report";
  return cleaned.slice(0, 31);
}

function setWesternText(
  cell: ExcelJS.Cell,
  value: string,
  language: RestaurantReportingExportBundle["language"],
  options?: {
    bold?: boolean;
    size?: number;
    color?: string;
    fill?: string;
    italic?: boolean;
  }
) {
  cell.value = toWesternDigits(value);
  cell.numFmt = "@";
  cell.font = {
    name: language === "ar" ? "Arial" : "Calibri",
    size: options?.size ?? 12,
    bold: options?.bold ?? false,
    italic: options?.italic ?? false,
    color: { argb: options?.color ?? EX.ink },
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

function paintRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  cols: number,
  fill: string,
  height?: number
) {
  if (height) sheet.getRow(row).height = height;
  for (let c = 1; c <= cols; c++) {
    sheet.getCell(row, c).fill = solidFill(fill);
  }
}

function setColWidths(sheet: ExcelJS.Worksheet, cols = COLS) {
  for (let c = 1; c <= cols; c++) sheet.getColumn(c).width = COL_WIDTH;
}

function applyPrintSetup(
  sheet: ExcelJS.Worksheet,
  language: RestaurantReportingExportBundle["language"],
  options?: { landscape?: boolean; freezeAt?: number }
) {
  sheet.views = [
    {
      rightToLeft: false,
      state: options?.freezeAt === 0 ? "normal" : "frozen",
      ySplit: options?.freezeAt === 0 ? undefined : options?.freezeAt ?? 4,
      showGridLines: false,
    },
  ];
  sheet.pageSetup = {
    orientation: options?.landscape === false ? "portrait" : "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    horizontalCentered: true,
    margins: {
      left: 0.45,
      right: 0.45,
      top: 0.5,
      bottom: 0.5,
      header: 0.25,
      footer: 0.3,
    },
  };
  sheet.headerFooter = {
    oddFooter:
      language === "ar"
        ? `&RMineuQR&L&P / &N`
        : `&LMineuQR Executive Report&RPage &P of &N`,
  };
}

function writeSheetHeader(
  sheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  language: RestaurantReportingExportBundle["language"]
) {
  paintRow(sheet, 1, COLS, EX.navy, 10);
  paintRow(sheet, 2, COLS, EX.navy, 34);
  sheet.mergeCells(2, 1, 2, COLS);
  setWesternText(sheet.getCell(2, 1), title, language, {
    bold: true,
    size: 22,
    color: EX.white,
    fill: EX.navy,
  });
  sheet.getCell(2, 1).alignment = reportAlignment(
    language,
    isRtl(language) ? "right" : "left",
    1
  );
  paintRow(sheet, 3, COLS, EX.navyMid, 26);
  sheet.mergeCells(3, 1, 3, COLS);
  setWesternText(sheet.getCell(3, 1), subtitle, language, {
    size: 12,
    color: EX.goldSoft,
    fill: EX.navyMid,
  });
  sheet.getCell(3, 1).alignment = reportAlignment(
    language,
    isRtl(language) ? "right" : "left",
    1
  );
  paintRow(sheet, 4, COLS, EX.gold, 5);
}

function writeSectionBand(
  sheet: ExcelJS.Worksheet,
  row: number,
  title: string,
  language: RestaurantReportingExportBundle["language"]
) {
  sheet.mergeCells(row, 1, row, COLS);
  setWesternText(sheet.getCell(row, 1), title, language, {
    bold: true,
    size: 13,
    color: EX.white,
    fill: EX.navyMid,
  });
  sheet.getCell(row, 1).alignment = reportAlignment(
    language,
    isRtl(language) ? "right" : "left",
    1
  );
  sheet.getRow(row).height = 30;
}

/** Full-width two-column financial statement. */
function writeStatementTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  headers: readonly [string, string],
  dataRows: ReadonlyArray<readonly [string, string]>,
  language: RestaurantReportingExportBundle["language"]
): number {
  const rtl = isRtl(language);
  sheet.mergeCells(startRow, 1, startRow, 7);
  sheet.mergeCells(startRow, 8, startRow, COLS);
  setWesternText(sheet.getCell(startRow, 1), headers[0], language, {
    bold: true,
    size: 12,
    color: EX.white,
    fill: EX.navy,
  });
  setWesternText(sheet.getCell(startRow, 8), headers[1], language, {
    bold: true,
    size: 12,
    color: EX.white,
    fill: EX.navy,
  });
  sheet.getCell(startRow, 1).alignment = reportAlignment(
    language,
    rtl ? "right" : "left",
    1
  );
  sheet.getCell(startRow, 8).alignment = reportAlignment(
    language,
    rtl ? "left" : "right",
    1
  );
  sheet.getRow(startRow).height = 32;

  dataRows.forEach(([label, value], index) => {
    const r = startRow + 1 + index;
    const fill = index % 2 === 1 ? EX.zebra : EX.white;
    sheet.mergeCells(r, 1, r, 7);
    sheet.mergeCells(r, 8, r, COLS);
    setWesternText(sheet.getCell(r, 1), label, language, {
      size: 13,
      color: EX.ink,
      fill,
    });
    setWesternText(sheet.getCell(r, 8), value, language, {
      bold: true,
      size: 14,
      color: EX.navy,
      fill,
    });
    sheet.getCell(r, 1).alignment = reportAlignment(
      language,
      rtl ? "right" : "left",
      1
    );
    sheet.getCell(r, 8).alignment = reportAlignment(
      language,
      rtl ? "left" : "right",
      1
    );
    sheet.getCell(r, 1).border = cellBorder(EX.line);
    sheet.getCell(r, 8).border = cellBorder(EX.line);
    sheet.getRow(r).height = 32;
  });

  return startRow + 1 + dataRows.length;
}

/** Large 3-column KPI card grid spanning full width. */
function writeKpiCards(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  cards: ReadonlyArray<readonly [string, string]>,
  language: RestaurantReportingExportBundle["language"]
): number {
  const rtl = isRtl(language);
  const perRow = 3;
  let row = startRow;
  for (let i = 0; i < cards.length; i += perRow) {
    for (let c = 0; c < perRow; c++) {
      const card = cards[i + c];
      if (!card) continue;
      const col = c * 4 + 1;
      sheet.mergeCells(row, col, row, col + 3);
      sheet.mergeCells(row + 1, col, row + 1, col + 3);
      sheet.mergeCells(row + 2, col, row + 2, col + 3);

      setWesternText(sheet.getCell(row, col), card[0], language, {
        size: 11,
        color: EX.slate,
        fill: EX.goldSoft,
      });
      sheet.getCell(row, col).alignment = reportAlignment(
        language,
        rtl ? "right" : "left",
        1
      );
      sheet.getCell(row, col).border = cellBorder(EX.gold);

      setWesternText(sheet.getCell(row + 1, col), card[1], language, {
        bold: true,
        size: 22,
        color: EX.navy,
        fill: EX.white,
      });
      sheet.getCell(row + 1, col).alignment = reportAlignment(
        language,
        rtl ? "right" : "left",
        1
      );
      sheet.getCell(row + 1, col).border = cellBorder(EX.line);

      setWesternText(sheet.getCell(row + 2, col), " ", language, {
        size: 6,
        fill: EX.mist,
      });
      sheet.getCell(row + 2, col).border = cellBorder(EX.line);
    }
    sheet.getRow(row).height = 26;
    sheet.getRow(row + 1).height = 44;
    sheet.getRow(row + 2).height = 12;
    row += 4;
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
  series: ReadonlyArray<{ label: string; values: readonly number[] }>,
  size: { width: number; height: number }
): Promise<boolean> {
  if (!hasRenderableTrend(categories.length)) return false;
  const png = await renderTrendChartPng({
    title,
    categories: categories.map((c) => toWesternDigits(c)),
    series,
    width: Math.round(size.width * 1.35),
    height: Math.round(size.height * 1.35),
  });
  if (!png) return false;
  const imageId = workbook.addImage({
    buffer: png as unknown as ExcelJS.Buffer,
    extension: "png",
  });
  sheet.addImage(imageId, {
    tl: { col: anchorCol, row: anchorRow },
    ext: { width: size.width, height: size.height },
  });
  return true;
}

function resolveReportTitle(
  bundle: RestaurantReportingExportBundle,
  labels: ReportingExportLabels
): string {
  if (bundle.reportTitle?.trim()) return bundle.reportTitle.trim();
  return bundle.scope === "month"
    ? labels.reportTitleMonthly
    : labels.reportTitleAnnual;
}

function writeInsufficientPanel(
  sheet: ExcelJS.Worksheet,
  row: number,
  message: string,
  language: RestaurantReportingExportBundle["language"]
) {
  sheet.mergeCells(row, 1, row + 4, COLS);
  setWesternText(sheet.getCell(row, 1), message, language, {
    size: 14,
    color: EX.slate,
    fill: EX.goldSoft,
    italic: true,
  });
  sheet.getCell(row, 1).alignment = {
    ...reportAlignment(language, "center"),
    wrapText: true,
    vertical: "middle",
  };
  for (let r = row; r <= row + 4; r++) {
    sheet.getRow(r).height = 28;
    for (let c = 1; c <= COLS; c++) {
      sheet.getCell(r, c).fill = solidFill(EX.goldSoft);
      sheet.getCell(r, c).border = cellBorder(EX.gold);
    }
  }
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
  const reportTitle = resolveReportTitle(bundle, labels);
  workbook.title = reportTitle;
  workbook.subject = labels.coverSubtitle;

  const generated = formatExportDateTime(new Date(), bundle.language);
  const periodLabel = toWesternDigits(bundle.periodLabel);
  const money = (amount: string) =>
    toWesternDigits(formatMoneyDisplay(amount, currencySymbol));
  const businessName = (bundle.businessName || bundle.restaurantName || "").trim();
  const logo = await resolveExportLogoAsset(bundle.logoUrl);
  const scopeLabel = formatReportScopeLabel(bundle.scope, bundle.language);
  const orderPeriod = scopedOrderSalesFromRollup(bundle.orderSalesRollup);

  buildCoverSheet(workbook, {
    bundle,
    labels,
    reportTitle,
    scopeLabel,
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
    scopeLabel,
    orderPeriod,
  });
  buildFinancialSheet(workbook, {
    bundle,
    labels,
    money,
    currencyCode,
    currencySymbol,
    periodLabel,
    scopeLabel,
    orderPeriod,
  });
  await buildOrderSalesSheet(workbook, {
    bundle,
    labels,
    currencySymbol,
    periodLabel,
    scopeLabel,
    orderPeriod,
  });
  await buildRevenueTrendSheet(workbook, {
    bundle,
    labels,
    currencySymbol,
    periodLabel,
    scopeLabel,
  });

  return workbook;
}

function buildCoverSheet(
  workbook: ExcelJS.Workbook,
  ctx: {
    bundle: RestaurantReportingExportBundle;
    labels: ReportingExportLabels;
    reportTitle: string;
    scopeLabel: string;
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
    scopeLabel,
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
  setColWidths(sheet);

  paintRow(sheet, 1, COLS, EX.navy, 12);
  paintRow(sheet, 2, COLS, EX.navy, 20);
  sheet.mergeCells(2, 1, 2, COLS);
  setWesternText(sheet.getCell(2, 1), labels.brand.toUpperCase(), lang, {
    bold: true,
    size: 12,
    color: EX.gold,
    fill: EX.navy,
  });
  sheet.getCell(2, 1).alignment = reportAlignment(lang, "center");

  for (let r = 3; r <= 8; r++) paintRow(sheet, r, COLS, EX.white, 16);

  if (logo) {
    const imageId = workbook.addImage({
      buffer: logo.buffer as unknown as ExcelJS.Buffer,
      extension: logo.extension,
    });
    sheet.addImage(imageId, {
      tl: { col: 5.2, row: 2.8 },
      ext: { width: 130, height: 130 },
    });
  }

  sheet.mergeCells(10, 1, 10, COLS);
  setWesternText(sheet.getCell(10, 1), bundle.restaurantName || "—", lang, {
    bold: true,
    size: 32,
    color: EX.navy,
  });
  sheet.getCell(10, 1).alignment = reportAlignment(lang, "center");
  sheet.getRow(10).height = 42;

  sheet.mergeCells(11, 1, 11, COLS);
  setWesternText(sheet.getCell(11, 1), businessName || "—", lang, {
    size: 14,
    color: EX.slate,
  });
  sheet.getCell(11, 1).alignment = reportAlignment(lang, "center");
  sheet.getRow(11).height = 24;

  paintRow(sheet, 13, COLS, EX.gold, 6);

  sheet.mergeCells(15, 1, 15, COLS);
  setWesternText(sheet.getCell(15, 1), scopeLabel.toUpperCase(), lang, {
    bold: true,
    size: 12,
    color: EX.gold,
  });
  sheet.getCell(15, 1).alignment = reportAlignment(lang, "center");

  sheet.mergeCells(16, 1, 16, COLS);
  setWesternText(sheet.getCell(16, 1), reportTitle, lang, {
    bold: true,
    size: 22,
    color: EX.navy,
  });
  sheet.getCell(16, 1).alignment = reportAlignment(lang, "center");
  sheet.getRow(16).height = 32;

  sheet.mergeCells(18, 1, 18, COLS);
  setWesternText(sheet.getCell(18, 1), periodLabel, lang, {
    bold: true,
    size: 36,
    color: EX.ink,
  });
  sheet.getCell(18, 1).alignment = reportAlignment(lang, "center");
  sheet.getRow(18).height = 48;

  sheet.mergeCells(19, 1, 19, COLS);
  setWesternText(sheet.getCell(19, 1), labels.coverSubtitle, lang, {
    size: 12,
    color: EX.slate,
    italic: true,
  });
  sheet.getCell(19, 1).alignment = reportAlignment(lang, "center");

  const metaStart = 21;
  const meta: Array<readonly [string, string]> = [
    [labels.currency, `${currencyCode}  ·  ${currencySymbol}`],
    [labels.pricingMode, formatPricingMode(bundle.business, lang)],
    [labels.taxPolicy, formatTaxPolicySummary(bundle.business, lang)],
    [labels.generated, generated],
  ];
  meta.forEach(([label, value], index) => {
    const r = metaStart + index;
    sheet.mergeCells(r, 2, r, 5);
    sheet.mergeCells(r, 6, r, 11);
    setWesternText(sheet.getCell(r, 2), label, lang, {
      size: 12,
      color: EX.slate,
      fill: index % 2 === 0 ? EX.mist : EX.white,
    });
    setWesternText(sheet.getCell(r, 6), value, lang, {
      bold: true,
      size: 13,
      color: EX.navy,
      fill: index % 2 === 0 ? EX.mist : EX.white,
    });
    sheet.getCell(r, 2).alignment = reportAlignment(lang, rtl ? "right" : "left", 1);
    sheet.getCell(r, 6).alignment = reportAlignment(lang, rtl ? "right" : "left", 1);
    sheet.getRow(r).height = 28;
  });

  const contentsRow = metaStart + meta.length + 2;
  sheet.mergeCells(contentsRow, 1, contentsRow, COLS);
  setWesternText(
    sheet.getCell(contentsRow, 1),
    `${labels.contents}:  ${labels.executive}  ·  ${labels.financial}  ·  ${labels.orderSalesRollup}  ·  ${labels.revenueTrend}`,
    lang,
    { size: 11, color: EX.slate }
  );
  sheet.getCell(contentsRow, 1).alignment = reportAlignment(lang, "center");

  paintRow(sheet, contentsRow + 2, COLS, EX.navy, 12);
  sheet.mergeCells(contentsRow + 3, 1, contentsRow + 3, COLS);
  setWesternText(
    sheet.getCell(contentsRow + 3, 1),
    `${labels.confidential}  ·  ${labels.generatedBy}`,
    lang,
    { size: 10, color: EX.slate }
  );
  sheet.getCell(contentsRow + 3, 1).alignment = reportAlignment(lang, "center");

  applyPrintSetup(sheet, lang, { freezeAt: 0, landscape: true });
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
    scopeLabel: string;
    orderPeriod: ReturnType<typeof scopedOrderSalesFromRollup>;
  }
) {
  const { bundle, labels, money, generated, periodLabel, scopeLabel, orderPeriod } =
    ctx;
  const sheet = workbook.addWorksheet(sanitizeSheetName(labels.executive));
  const lang = bundle.language;
  const biz = bundle.business;
  setColWidths(sheet);

  writeSheetHeader(
    sheet,
    labels.executive,
    `${scopeLabel}  ·  ${periodLabel}  ·  ${generated}`,
    lang
  );

  writeSectionBand(sheet, 6, labels.performanceSection, lang);
  writeKpiCards(
    sheet,
    8,
    [
      [labels.revenue, money(biz.revenue)],
      [labels.taxCollected, money(biz.taxCollected)],
      [labels.paidChecks, formatWesternCount(biz.paidCheckCount)],
      [labels.averageCheck, money(biz.averageCheck)],
      [labels.orderSalesPeriod, money(orderPeriod.orderSales)],
      [labels.averageOrderPeriod, money(orderPeriod.averageOrder)],
      [labels.ordersPeriod, formatWesternCount(orderPeriod.orderCount)],
      [labels.complimentaryCount, formatWesternCount(biz.complimentaryCount)],
      [labels.voidedCount, formatWesternCount(biz.voidedCount)],
    ],
    lang
  );

  applyPrintSetup(sheet, lang, { freezeAt: 4 });
}

function buildFinancialSheet(
  workbook: ExcelJS.Workbook,
  ctx: {
    bundle: RestaurantReportingExportBundle;
    labels: ReportingExportLabels;
    money: (amount: string) => string;
    currencyCode: string;
    currencySymbol: string;
    periodLabel: string;
    scopeLabel: string;
    orderPeriod: ReturnType<typeof scopedOrderSalesFromRollup>;
  }
) {
  const {
    bundle,
    labels,
    money,
    currencyCode,
    currencySymbol,
    periodLabel,
    scopeLabel,
    orderPeriod,
  } = ctx;
  const sheet = workbook.addWorksheet(sanitizeSheetName(labels.financial));
  const lang = bundle.language;
  const biz = bundle.business;
  setColWidths(sheet);

  writeSheetHeader(
    sheet,
    labels.financial,
    `${scopeLabel}  ·  ${periodLabel}`,
    lang
  );

  let row = 6;
  writeSectionBand(sheet, row, labels.performanceSection, lang);
  row = writeStatementTable(
    sheet,
    row + 1,
    [labels.metric, labels.value],
    [
      [labels.revenue, money(biz.revenue)],
      [labels.taxCollected, money(biz.taxCollected)],
      [labels.paidChecks, formatWesternCount(biz.paidCheckCount)],
      [labels.averageCheck, money(biz.averageCheck)],
    ],
    lang
  );

  row += 2;
  writeSectionBand(sheet, row, labels.orderSalesSection, lang);
  row = writeStatementTable(
    sheet,
    row + 1,
    [labels.metric, labels.value],
    [
      [labels.orderSalesPeriod, money(orderPeriod.orderSales)],
      [labels.averageOrderPeriod, money(orderPeriod.averageOrder)],
      [labels.ordersPeriod, formatWesternCount(orderPeriod.orderCount)],
      [labels.completedOrders, formatWesternCount(orderPeriod.completedOrders)],
    ],
    lang
  );

  row += 2;
  writeSectionBand(sheet, row, labels.adjustmentsSection, lang);
  row = writeStatementTable(
    sheet,
    row + 1,
    [labels.metric, labels.value],
    [
      [labels.complimentaryCount, formatWesternCount(biz.complimentaryCount)],
      [labels.complimentaryAmount, money(biz.complimentaryAmount)],
      [labels.voidedCount, formatWesternCount(biz.voidedCount)],
    ],
    lang
  );

  row += 2;
  writeSectionBand(sheet, row, labels.reportingBasisSection, lang);
  writeStatementTable(
    sheet,
    row + 1,
    [labels.metric, labels.value],
    [
      [labels.currency, `${currencyCode} (${currencySymbol})`],
      [labels.pricingMode, formatPricingMode(biz, lang)],
      [labels.taxPolicy, formatTaxPolicySummary(biz, lang)],
    ],
    lang
  );

  applyPrintSetup(sheet, lang, { freezeAt: 4 });
}

async function buildOrderSalesSheet(
  workbook: ExcelJS.Workbook,
  ctx: {
    bundle: RestaurantReportingExportBundle;
    labels: ReportingExportLabels;
    currencySymbol: string;
    periodLabel: string;
    scopeLabel: string;
    orderPeriod: ReturnType<typeof scopedOrderSalesFromRollup>;
  }
) {
  const { bundle, labels, currencySymbol, periodLabel, scopeLabel, orderPeriod } =
    ctx;
  const sheet = workbook.addWorksheet(sanitizeSheetName(labels.orderSalesRollup));
  const lang = bundle.language;
  const periods = bundle.orderSalesRollup.periods;
  setColWidths(sheet);

  const seriesTitle =
    bundle.scope === "month"
      ? `${labels.dailyOrderSalesTitle} — ${periodLabel}`
      : `${labels.monthlyOrderSalesTitle} — ${periodLabel}`;

  writeSheetHeader(
    sheet,
    labels.orderSalesRollup,
    `${scopeLabel}  ·  ${seriesTitle}`,
    lang
  );

  const axis = periods.map((p) =>
    formatTrendAxisLabel(p.periodKey, bundle.scope, lang)
  );

  if (!hasRenderableTrend(periods.length)) {
    writeInsufficientPanel(sheet, 6, labels.trendInsufficient, lang);
    applyPrintSetup(sheet, lang, { freezeAt: 4 });
    return;
  }

  // Chart first — dominant visual
  writeSectionBand(sheet, 6, labels.chartOrderTrend, lang);
  const chartPlaced = await maybeAddChartImage(
    workbook,
    sheet,
    0.3,
    6.9,
    labels.chartOrderTrend,
    axis,
    [
      {
        label: labels.orderSales,
        values: periods.map((p) => parseDtoAmountForDisplay(p.orderSales)),
      },
    ],
    { width: 1100, height: 340 }
  );
  // Reserve vertical space for the floating chart (tight — avoid empty cavern)
  let row = chartPlaced ? 24 : 8;
  for (let r = 7; r < row; r++) {
    sheet.getRow(r).height = 16;
    paintRow(sheet, r, COLS, EX.white);
  }

  writeSectionBand(sheet, row, labels.orderSalesSection, lang);
  row += 1;

  sheet.mergeCells(row, 1, row, 3);
  sheet.mergeCells(row, 4, row, 6);
  sheet.mergeCells(row, 7, row, 9);
  sheet.mergeCells(row, 10, row, COLS);
  setWesternText(sheet.getCell(row, 1), labels.periodKey, lang, {
    bold: true,
    size: 12,
    color: EX.white,
    fill: EX.navy,
  });
  setWesternText(sheet.getCell(row, 4), labels.orderCount, lang, {
    bold: true,
    size: 12,
    color: EX.white,
    fill: EX.navy,
  });
  setWesternText(sheet.getCell(row, 7), labels.completedOrders, lang, {
    bold: true,
    size: 12,
    color: EX.white,
    fill: EX.navy,
  });
  setWesternText(sheet.getCell(row, 10), labels.orderSales, lang, {
    bold: true,
    size: 12,
    color: EX.white,
    fill: EX.navy,
  });
  sheet.getRow(row).height = 30;

  periods.forEach((p, index) => {
    const r = row + 1 + index;
    const fill = index % 2 === 1 ? EX.zebra : EX.white;
    sheet.mergeCells(r, 1, r, 3);
    sheet.mergeCells(r, 4, r, 6);
    sheet.mergeCells(r, 7, r, 9);
    sheet.mergeCells(r, 10, r, COLS);
    setWesternText(sheet.getCell(r, 1), axis[index]!, lang, { size: 12, fill });
    setWesternText(sheet.getCell(r, 4), formatWesternCount(p.orderCount), lang, {
      size: 12,
      fill,
    });
    setWesternText(
      sheet.getCell(r, 7),
      formatWesternCount(p.completedOrders),
      lang,
      { size: 12, fill }
    );
    setWesternText(
      sheet.getCell(r, 10),
      `${formatWesternAmount(p.orderSales)} ${currencySymbol}`,
      lang,
      { bold: true, size: 13, fill }
    );
    sheet.getCell(r, 10).alignment = reportAlignment(
      lang,
      isRtl(lang) ? "left" : "right",
      1
    );
    sheet.getRow(r).height = 28;
  });

  const totalRow = row + 1 + periods.length;
  sheet.mergeCells(totalRow, 1, totalRow, 3);
  sheet.mergeCells(totalRow, 4, totalRow, 6);
  sheet.mergeCells(totalRow, 7, totalRow, 9);
  sheet.mergeCells(totalRow, 10, totalRow, COLS);
  setWesternText(sheet.getCell(totalRow, 1), periodLabel, lang, {
    bold: true,
    size: 13,
    color: EX.white,
    fill: EX.navy,
  });
  setWesternText(
    sheet.getCell(totalRow, 4),
    formatWesternCount(orderPeriod.orderCount),
    lang,
    { bold: true, size: 13, color: EX.white, fill: EX.navy }
  );
  setWesternText(
    sheet.getCell(totalRow, 7),
    formatWesternCount(orderPeriod.completedOrders),
    lang,
    { bold: true, size: 13, color: EX.white, fill: EX.navy }
  );
  setWesternText(
    sheet.getCell(totalRow, 10),
    `${formatWesternAmount(orderPeriod.orderSales)} ${currencySymbol}`,
    lang,
    { bold: true, size: 14, color: EX.white, fill: EX.navy }
  );
  sheet.getRow(totalRow).height = 34;

  applyPrintSetup(sheet, lang, { freezeAt: 4 });
}

async function buildRevenueTrendSheet(
  workbook: ExcelJS.Workbook,
  ctx: {
    bundle: RestaurantReportingExportBundle;
    labels: ReportingExportLabels;
    currencySymbol: string;
    periodLabel: string;
    scopeLabel: string;
  }
) {
  const { bundle, labels, currencySymbol, periodLabel, scopeLabel } = ctx;
  const sheet = workbook.addWorksheet(sanitizeSheetName(labels.revenueTrend));
  const lang = bundle.language;
  const points = bundle.revenueTrend.points;
  setColWidths(sheet);

  const seriesTitle =
    bundle.scope === "month"
      ? `${labels.dailyRevenueTitle} — ${periodLabel}`
      : `${labels.monthlyRevenueTitle} — ${periodLabel}`;

  writeSheetHeader(
    sheet,
    labels.revenueTrend,
    `${scopeLabel}  ·  ${seriesTitle}`,
    lang
  );

  const axis = points.map((p) =>
    formatTrendAxisLabel(p.periodKey, bundle.scope, lang)
  );

  if (!hasRenderableTrend(points.length)) {
    writeInsufficientPanel(sheet, 6, labels.trendInsufficient, lang);
    applyPrintSetup(sheet, lang, { freezeAt: 4 });
    return;
  }

  // 1) Large chart at top (mandatory)
  writeSectionBand(sheet, 6, labels.chartRevenueTrend, lang);
  const chartPlaced = await maybeAddChartImage(
    workbook,
    sheet,
    0.3,
    6.9,
    labels.chartRevenueTrend,
    axis,
    [
      {
        label: labels.revenue,
        values: points.map((p) => parseDtoAmountForDisplay(p.revenue)),
      },
    ],
    { width: 1100, height: 360 }
  );
  let row = chartPlaced ? 25 : 8;
  for (let r = 7; r < row; r++) {
    sheet.getRow(r).height = 16;
    paintRow(sheet, r, COLS, EX.white);
  }

  // 2) Full-width detail table
  writeSectionBand(sheet, row, labels.performanceSection, lang);
  row += 1;

  sheet.mergeCells(row, 1, row, 4);
  sheet.mergeCells(row, 5, row, 8);
  sheet.mergeCells(row, 9, row, COLS);
  setWesternText(sheet.getCell(row, 1), labels.periodKey, lang, {
    bold: true,
    size: 12,
    color: EX.white,
    fill: EX.navy,
  });
  setWesternText(sheet.getCell(row, 5), labels.revenue, lang, {
    bold: true,
    size: 12,
    color: EX.white,
    fill: EX.navy,
  });
  setWesternText(sheet.getCell(row, 9), labels.paidCheckCount, lang, {
    bold: true,
    size: 12,
    color: EX.white,
    fill: EX.navy,
  });
  sheet.getRow(row).height = 30;

  points.forEach((p, index) => {
    const r = row + 1 + index;
    const fill = index % 2 === 1 ? EX.zebra : EX.white;
    sheet.mergeCells(r, 1, r, 4);
    sheet.mergeCells(r, 5, r, 8);
    sheet.mergeCells(r, 9, r, COLS);
    setWesternText(sheet.getCell(r, 1), axis[index]!, lang, { size: 12, fill });
    setWesternText(
      sheet.getCell(r, 5),
      `${formatWesternAmount(p.revenue)} ${currencySymbol}`,
      lang,
      { bold: true, size: 13, fill }
    );
    setWesternText(
      sheet.getCell(r, 9),
      formatWesternCount(p.paidCheckCount),
      lang,
      { size: 12, fill }
    );
    sheet.getCell(r, 5).alignment = reportAlignment(
      lang,
      isRtl(lang) ? "left" : "right",
      1
    );
    sheet.getRow(r).height = 28;
  });

  // 3) Period totals (same BusinessMetricsSummary as Executive / Financial)
  const biz = bundle.business;
  const totalRow = row + 1 + points.length;
  sheet.mergeCells(totalRow, 1, totalRow, 4);
  sheet.mergeCells(totalRow, 5, totalRow, 8);
  sheet.mergeCells(totalRow, 9, totalRow, COLS);
  setWesternText(sheet.getCell(totalRow, 1), periodLabel, lang, {
    bold: true,
    size: 13,
    color: EX.white,
    fill: EX.navy,
  });
  setWesternText(
    sheet.getCell(totalRow, 5),
    `${formatWesternAmount(biz.revenue)} ${currencySymbol}`,
    lang,
    { bold: true, size: 14, color: EX.white, fill: EX.navy }
  );
  setWesternText(
    sheet.getCell(totalRow, 9),
    formatWesternCount(biz.paidCheckCount),
    lang,
    { bold: true, size: 13, color: EX.white, fill: EX.navy }
  );
  sheet.getRow(totalRow).height = 34;

  applyPrintSetup(sheet, lang, { freezeAt: 4 });
}
