/**
 * REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-2 — Executive Financial Report (Excel).
 * Presentation only. Does not calculate Revenue or other KPIs.
 *
 * Western digits are written as text (@) so Excel Arabic locales cannot
 * re-render them as Eastern Arabic numerals.
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
import type { RestaurantReportingExportBundle } from "../types";

/** Premium corporate palette — navy / gold / slate (not SaaS teal grid). */
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
  success: "FF0F766E",
} as const;

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
    size: options?.size ?? 11,
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
    orientation: options?.landscape ? "landscape" : "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    horizontalCentered: true,
    margins: {
      left: 0.6,
      right: 0.6,
      top: 0.65,
      bottom: 0.65,
      header: 0.3,
      footer: 0.35,
    },
  };
  sheet.headerFooter = {
    oddFooter:
      language === "ar"
        ? `&RMineuQR&L&P / &N`
        : `&LMineuQR Executive Report&RPage &P of &N`,
  };
}

function writeSectionBand(
  sheet: ExcelJS.Worksheet,
  row: number,
  title: string,
  language: RestaurantReportingExportBundle["language"],
  cols = 6
) {
  sheet.mergeCells(row, 1, row, cols);
  setWesternText(sheet.getCell(row, 1), title, language, {
    bold: true,
    size: 11,
    color: EX.white,
    fill: EX.navyMid,
  });
  sheet.getCell(row, 1).alignment = reportAlignment(
    language,
    isRtl(language) ? "right" : "left",
    1
  );
  sheet.getRow(row).height = 26;
}

function writeStatementTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  headers: readonly [string, string],
  dataRows: ReadonlyArray<readonly [string, string]>,
  language: RestaurantReportingExportBundle["language"]
): number {
  const rtl = isRtl(language);
  sheet.mergeCells(startRow, 1, startRow, 4);
  sheet.mergeCells(startRow, 5, startRow, 6);
  setWesternText(sheet.getCell(startRow, 1), headers[0], language, {
    bold: true,
    size: 10,
    color: EX.white,
    fill: EX.navy,
  });
  setWesternText(sheet.getCell(startRow, 5), headers[1], language, {
    bold: true,
    size: 10,
    color: EX.white,
    fill: EX.navy,
  });
  sheet.getCell(startRow, 1).alignment = reportAlignment(
    language,
    rtl ? "right" : "left",
    1
  );
  sheet.getCell(startRow, 5).alignment = reportAlignment(
    language,
    rtl ? "left" : "right",
    1
  );
  sheet.getRow(startRow).height = 28;

  dataRows.forEach(([label, value], index) => {
    const r = startRow + 1 + index;
    const fill = index % 2 === 1 ? EX.zebra : EX.white;
    sheet.mergeCells(r, 1, r, 4);
    sheet.mergeCells(r, 5, r, 6);
    setWesternText(sheet.getCell(r, 1), label, language, {
      size: 11,
      color: EX.ink,
      fill,
    });
    setWesternText(sheet.getCell(r, 5), value, language, {
      bold: true,
      size: 11,
      color: EX.ink,
      fill,
    });
    sheet.getCell(r, 1).alignment = reportAlignment(
      language,
      rtl ? "right" : "left",
      1
    );
    sheet.getCell(r, 5).alignment = reportAlignment(
      language,
      rtl ? "left" : "right",
      1
    );
    sheet.getCell(r, 1).border = cellBorder(EX.line);
    sheet.getCell(r, 5).border = cellBorder(EX.line);
    sheet.getRow(r).height = 26;
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
      sheet.mergeCells(row + 2, col, row + 2, col + 1);

      paintRow(sheet, row, 0, EX.white);
      setWesternText(sheet.getCell(row, col), card[0], language, {
        size: 9,
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
        size: 18,
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
        size: 4,
        fill: EX.white,
      });
      sheet.getCell(row + 2, col).border = cellBorder(EX.line);
    }
    sheet.getRow(row).height = 22;
    sheet.getRow(row + 1).height = 36;
    sheet.getRow(row + 2).height = 8;
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
  series: ReadonlyArray<{ label: string; values: readonly number[] }>
) {
  if (!hasRenderableTrend(categories.length)) return;
  const png = await renderTrendChartPng({
    title,
    categories: categories.map((c) => toWesternDigits(c)),
    series,
    width: 860,
    height: 340,
  });
  if (!png) return;
  const imageId = workbook.addImage({
    buffer: png as unknown as ExcelJS.Buffer,
    extension: "png",
  });
  sheet.addImage(imageId, {
    tl: { col: anchorCol, row: anchorRow },
    ext: { width: 780, height: 300 },
  });
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
    reportTitle,
  });
  buildFinancialSheet(workbook, {
    bundle,
    labels,
    money,
    currencyCode,
    currencySymbol,
    periodLabel,
    scopeLabel,
  });
  await buildOrderSalesSheet(workbook, {
    bundle,
    labels,
    currencySymbol,
    periodLabel,
    scopeLabel,
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
  const COLS = 8;

  for (let c = 1; c <= COLS; c++) sheet.getColumn(c).width = 12;

  // Top navy masthead
  for (let r = 1; r <= 2; r++) paintRow(sheet, r, COLS, EX.navy, r === 1 ? 10 : 14);
  sheet.mergeCells(2, 1, 2, COLS);
  setWesternText(sheet.getCell(2, 1), labels.brand.toUpperCase(), lang, {
    bold: true,
    size: 10,
    color: EX.gold,
    fill: EX.navy,
  });
  sheet.getCell(2, 1).alignment = reportAlignment(lang, "center");

  // Breathing room + large logo
  for (let r = 3; r <= 6; r++) paintRow(sheet, r, COLS, EX.white, 18);

  if (logo) {
    const imageId = workbook.addImage({
      buffer: logo.buffer as unknown as ExcelJS.Buffer,
      extension: logo.extension,
    });
    sheet.addImage(imageId, {
      tl: { col: 3.15, row: 2.6 },
      ext: { width: 120, height: 120 },
    });
  }

  for (let r = 7; r <= 9; r++) paintRow(sheet, r, COLS, EX.white, 16);

  // Identity
  sheet.mergeCells(10, 1, 10, COLS);
  setWesternText(sheet.getCell(10, 1), bundle.restaurantName || "—", lang, {
    bold: true,
    size: 28,
    color: EX.navy,
  });
  sheet.getCell(10, 1).alignment = reportAlignment(lang, "center");
  sheet.getRow(10).height = 38;

  sheet.mergeCells(11, 1, 11, COLS);
  setWesternText(sheet.getCell(11, 1), businessName || "—", lang, {
    size: 13,
    color: EX.slate,
  });
  sheet.getCell(11, 1).alignment = reportAlignment(lang, "center");
  sheet.getRow(11).height = 22;

  // Gold rule
  paintRow(sheet, 13, COLS, EX.gold, 5);

  sheet.mergeCells(15, 1, 15, COLS);
  setWesternText(sheet.getCell(15, 1), scopeLabel.toUpperCase(), lang, {
    bold: true,
    size: 11,
    color: EX.gold,
  });
  sheet.getCell(15, 1).alignment = reportAlignment(lang, "center");

  sheet.mergeCells(16, 1, 16, COLS);
  setWesternText(sheet.getCell(16, 1), reportTitle, lang, {
    bold: true,
    size: 20,
    color: EX.navy,
  });
  sheet.getCell(16, 1).alignment = reportAlignment(lang, "center");
  sheet.getRow(16).height = 30;

  sheet.mergeCells(18, 1, 18, COLS);
  setWesternText(sheet.getCell(18, 1), periodLabel, lang, {
    bold: true,
    size: 32,
    color: EX.ink,
  });
  sheet.getCell(18, 1).alignment = reportAlignment(lang, "center");
  sheet.getRow(18).height = 44;

  sheet.mergeCells(19, 1, 19, COLS);
  setWesternText(sheet.getCell(19, 1), labels.coverSubtitle, lang, {
    size: 11,
    color: EX.slate,
    italic: true,
  });
  sheet.getCell(19, 1).alignment = reportAlignment(lang, "center");

  // Meta dossier
  const metaStart = 22;
  const meta: Array<readonly [string, string]> = [
    [labels.currency, `${currencyCode}  ·  ${currencySymbol}`],
    [labels.pricingMode, formatPricingMode(bundle.business, lang)],
    [labels.taxPolicy, formatTaxPolicySummary(bundle.business, lang)],
    [labels.generated, generated],
  ];

  meta.forEach(([label, value], index) => {
    const r = metaStart + index;
    sheet.mergeCells(r, 2, r, 3);
    sheet.mergeCells(r, 4, r, 7);
    setWesternText(sheet.getCell(r, 2), label, lang, {
      size: 10,
      color: EX.slate,
      fill: index % 2 === 0 ? EX.mist : EX.white,
    });
    setWesternText(sheet.getCell(r, 4), value, lang, {
      bold: true,
      size: 11,
      color: EX.navy,
      fill: index % 2 === 0 ? EX.mist : EX.white,
    });
    sheet.getCell(r, 2).alignment = reportAlignment(lang, rtl ? "right" : "left", 1);
    sheet.getCell(r, 4).alignment = reportAlignment(lang, rtl ? "right" : "left", 1);
    sheet.getRow(r).height = 24;
  });

  // Contents strip
  const contentsRow = metaStart + meta.length + 2;
  sheet.mergeCells(contentsRow, 1, contentsRow, COLS);
  setWesternText(
    sheet.getCell(contentsRow, 1),
    `${labels.contents}:  ${labels.executive}  ·  ${labels.financial}  ·  ${labels.orderSalesRollup}  ·  ${labels.revenueTrend}`,
    lang,
    { size: 9, color: EX.slate }
  );
  sheet.getCell(contentsRow, 1).alignment = reportAlignment(lang, "center");

  paintRow(sheet, contentsRow + 2, COLS, EX.navy, 10);
  sheet.mergeCells(contentsRow + 3, 1, contentsRow + 3, COLS);
  setWesternText(
    sheet.getCell(contentsRow + 3, 1),
    `${labels.confidential}  ·  ${labels.generatedBy}`,
    lang,
    { size: 9, color: EX.slate }
  );
  sheet.getCell(contentsRow + 3, 1).alignment = reportAlignment(lang, "center");

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
    scopeLabel: string;
    reportTitle: string;
  }
) {
  const { bundle, labels, money, generated, periodLabel, scopeLabel } = ctx;
  const sheet = workbook.addWorksheet(sanitizeSheetName(labels.executive));
  const lang = bundle.language;
  const biz = bundle.business;
  const sales = bundle.orderSales;
  const COLS = 6;

  for (let c = 1; c <= COLS; c++) sheet.getColumn(c).width = 14;

  paintRow(sheet, 1, COLS, EX.navy, 12);
  paintRow(sheet, 2, COLS, EX.navy, 28);
  sheet.mergeCells(2, 1, 2, COLS);
  setWesternText(sheet.getCell(2, 1), labels.executive, lang, {
    bold: true,
    size: 18,
    color: EX.white,
    fill: EX.navy,
  });
  sheet.getCell(2, 1).alignment = reportAlignment(
    lang,
    isRtl(lang) ? "right" : "left",
    1
  );

  paintRow(sheet, 3, COLS, EX.navyMid, 22);
  sheet.mergeCells(3, 1, 3, COLS);
  setWesternText(
    sheet.getCell(3, 1),
    `${scopeLabel}  ·  ${periodLabel}  ·  ${generated}`,
    lang,
    { size: 10, color: EX.goldSoft, fill: EX.navyMid }
  );
  sheet.getCell(3, 1).alignment = reportAlignment(
    lang,
    isRtl(lang) ? "right" : "left",
    1
  );

  writeSectionBand(sheet, 5, labels.performanceSection, lang, COLS);
  writeKpiCards(
    sheet,
    7,
    [
      [labels.revenue, money(biz.revenue)],
      [labels.taxCollected, money(biz.taxCollected)],
      [labels.paidChecks, formatWesternCount(biz.paidCheckCount)],
      [labels.averageCheck, money(biz.averageCheck)],
      [labels.orderSalesPeriod, money(sales.month.orderSales)],
      [labels.averageOrderPeriod, money(sales.month.averageOrder)],
      [labels.ordersPeriod, formatWesternCount(sales.month.totalOrders)],
      [labels.complimentaryCount, formatWesternCount(biz.complimentaryCount)],
      [labels.voidedCount, formatWesternCount(biz.voidedCount)],
    ],
    lang
  );

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
    periodLabel: string;
    scopeLabel: string;
  }
) {
  const { bundle, labels, money, currencyCode, currencySymbol, periodLabel, scopeLabel } =
    ctx;
  const sheet = workbook.addWorksheet(sanitizeSheetName(labels.financial));
  const lang = bundle.language;
  const biz = bundle.business;
  const sales = bundle.orderSales;
  const COLS = 6;

  for (let c = 1; c <= COLS; c++) sheet.getColumn(c).width = 14;

  paintRow(sheet, 1, COLS, EX.navy, 12);
  paintRow(sheet, 2, COLS, EX.navy, 28);
  sheet.mergeCells(2, 1, 2, COLS);
  setWesternText(sheet.getCell(2, 1), labels.financial, lang, {
    bold: true,
    size: 18,
    color: EX.white,
    fill: EX.navy,
  });
  sheet.getCell(2, 1).alignment = reportAlignment(
    lang,
    isRtl(lang) ? "right" : "left",
    1
  );

  paintRow(sheet, 3, COLS, EX.navyMid, 22);
  sheet.mergeCells(3, 1, 3, COLS);
  setWesternText(
    sheet.getCell(3, 1),
    `${scopeLabel}  ·  ${periodLabel}`,
    lang,
    { size: 10, color: EX.goldSoft, fill: EX.navyMid }
  );

  let row = 5;
  writeSectionBand(sheet, row, labels.performanceSection, lang, COLS);
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
  writeSectionBand(sheet, row, labels.orderSalesSection, lang, COLS);
  row = writeStatementTable(
    sheet,
    row + 1,
    [labels.metric, labels.value],
    [
      [labels.orderSalesPeriod, money(sales.month.orderSales)],
      [labels.averageOrderPeriod, money(sales.month.averageOrder)],
      [labels.ordersPeriod, formatWesternCount(sales.month.totalOrders)],
    ],
    lang
  );

  row += 2;
  writeSectionBand(sheet, row, labels.adjustmentsSection, lang, COLS);
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
  writeSectionBand(sheet, row, labels.reportingBasisSection, lang, COLS);
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
  }
) {
  const { bundle, labels, currencySymbol, periodLabel, scopeLabel } = ctx;
  const sheet = workbook.addWorksheet(sanitizeSheetName(labels.orderSalesRollup));
  const lang = bundle.language;
  const periods = bundle.orderSalesRollup.periods;
  const COLS = 6;
  for (let c = 1; c <= COLS; c++) sheet.getColumn(c).width = 14;

  const seriesTitle =
    bundle.scope === "month"
      ? `${labels.dailyOrderSalesTitle} — ${periodLabel}`
      : `${labels.monthlyOrderSalesTitle} — ${periodLabel}`;

  paintRow(sheet, 1, COLS, EX.navy, 12);
  paintRow(sheet, 2, COLS, EX.navy, 28);
  sheet.mergeCells(2, 1, 2, COLS);
  setWesternText(sheet.getCell(2, 1), labels.orderSalesRollup, lang, {
    bold: true,
    size: 18,
    color: EX.white,
    fill: EX.navy,
  });
  paintRow(sheet, 3, COLS, EX.navyMid, 22);
  sheet.mergeCells(3, 1, 3, COLS);
  setWesternText(
    sheet.getCell(3, 1),
    `${scopeLabel}  ·  ${seriesTitle}`,
    lang,
    { size: 10, color: EX.goldSoft, fill: EX.navyMid }
  );

  const axis = periods.map((p) =>
    formatTrendAxisLabel(p.periodKey, bundle.scope, lang)
  );

  if (!hasRenderableTrend(periods.length)) {
    sheet.mergeCells(6, 1, 8, COLS);
    setWesternText(sheet.getCell(6, 1), labels.trendInsufficient, lang, {
      size: 12,
      color: EX.slate,
      fill: EX.goldSoft,
      italic: true,
    });
    sheet.getCell(6, 1).alignment = {
      ...reportAlignment(lang, "center"),
      wrapText: true,
      vertical: "middle",
    };
    applyPrintSetup(sheet, lang, { landscape: true, freezeAt: 4 });
    return;
  }

  let row = 5;
  sheet.mergeCells(row, 1, row, 2);
  sheet.mergeCells(row, 3, row, 3);
  sheet.mergeCells(row, 4, row, 4);
  sheet.mergeCells(row, 5, row, 6);
  setWesternText(sheet.getCell(row, 1), labels.periodKey, lang, {
    bold: true,
    color: EX.white,
    fill: EX.navy,
  });
  setWesternText(sheet.getCell(row, 3), labels.orderCount, lang, {
    bold: true,
    color: EX.white,
    fill: EX.navy,
  });
  setWesternText(sheet.getCell(row, 4), labels.completedOrders, lang, {
    bold: true,
    color: EX.white,
    fill: EX.navy,
  });
  setWesternText(sheet.getCell(row, 5), labels.orderSales, lang, {
    bold: true,
    color: EX.white,
    fill: EX.navy,
  });
  sheet.getRow(row).height = 26;

  periods.forEach((p, index) => {
    const r = row + 1 + index;
    const fill = index % 2 === 1 ? EX.zebra : EX.white;
    sheet.mergeCells(r, 1, r, 2);
    sheet.mergeCells(r, 5, r, 6);
    setWesternText(sheet.getCell(r, 1), axis[index]!, lang, { fill });
    setWesternText(sheet.getCell(r, 3), formatWesternCount(p.orderCount), lang, {
      fill,
    });
    setWesternText(
      sheet.getCell(r, 4),
      formatWesternCount(p.completedOrders),
      lang,
      { fill }
    );
    setWesternText(
      sheet.getCell(r, 5),
      `${formatWesternAmount(p.orderSales)} ${currencySymbol}`,
      lang,
      { bold: true, fill }
    );
    sheet.getRow(r).height = 24;
  });

  await maybeAddChartImage(
    workbook,
    sheet,
    0,
    row + periods.length + 3,
    labels.chartOrderTrend,
    axis,
    [
      {
        label: labels.orderSales,
        values: periods.map((p) => parseDtoAmountForDisplay(p.orderSales)),
      },
    ]
  );

  applyPrintSetup(sheet, lang, { landscape: true, freezeAt: 4 });
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
  const COLS = 6;
  for (let c = 1; c <= COLS; c++) sheet.getColumn(c).width = 14;

  const seriesTitle =
    bundle.scope === "month"
      ? `${labels.dailyRevenueTitle} — ${periodLabel}`
      : `${labels.monthlyRevenueTitle} — ${periodLabel}`;

  paintRow(sheet, 1, COLS, EX.navy, 12);
  paintRow(sheet, 2, COLS, EX.navy, 28);
  sheet.mergeCells(2, 1, 2, COLS);
  setWesternText(sheet.getCell(2, 1), labels.revenueTrend, lang, {
    bold: true,
    size: 18,
    color: EX.white,
    fill: EX.navy,
  });
  paintRow(sheet, 3, COLS, EX.navyMid, 22);
  sheet.mergeCells(3, 1, 3, COLS);
  setWesternText(
    sheet.getCell(3, 1),
    `${scopeLabel}  ·  ${seriesTitle}`,
    lang,
    { size: 10, color: EX.goldSoft, fill: EX.navyMid }
  );

  const axis = points.map((p) =>
    formatTrendAxisLabel(p.periodKey, bundle.scope, lang)
  );

  if (!hasRenderableTrend(points.length)) {
    sheet.mergeCells(6, 1, 8, COLS);
    setWesternText(sheet.getCell(6, 1), labels.trendInsufficient, lang, {
      size: 12,
      color: EX.slate,
      fill: EX.goldSoft,
      italic: true,
    });
    sheet.getCell(6, 1).alignment = {
      ...reportAlignment(lang, "center"),
      wrapText: true,
      vertical: "middle",
    };
    applyPrintSetup(sheet, lang, { landscape: true, freezeAt: 4 });
    return;
  }

  // Compact amount table
  let row = 5;
  sheet.mergeCells(row, 1, row, 2);
  sheet.mergeCells(row, 3, row, 4);
  sheet.mergeCells(row, 5, row, 6);
  setWesternText(sheet.getCell(row, 1), labels.periodKey, lang, {
    bold: true,
    color: EX.white,
    fill: EX.navy,
  });
  setWesternText(sheet.getCell(row, 3), labels.revenue, lang, {
    bold: true,
    color: EX.white,
    fill: EX.navy,
  });
  setWesternText(sheet.getCell(row, 5), labels.paidCheckCount, lang, {
    bold: true,
    color: EX.white,
    fill: EX.navy,
  });
  sheet.getRow(row).height = 26;

  points.forEach((p, index) => {
    const r = row + 1 + index;
    const fill = index % 2 === 1 ? EX.zebra : EX.white;
    sheet.mergeCells(r, 1, r, 2);
    sheet.mergeCells(r, 3, r, 4);
    sheet.mergeCells(r, 5, r, 6);
    setWesternText(sheet.getCell(r, 1), axis[index]!, lang, { fill });
    setWesternText(
      sheet.getCell(r, 3),
      `${formatWesternAmount(p.revenue)} ${currencySymbol}`,
      lang,
      { bold: true, fill }
    );
    setWesternText(
      sheet.getCell(r, 5),
      formatWesternCount(p.paidCheckCount),
      lang,
      { fill }
    );
    sheet.getRow(r).height = 24;
  });

  await maybeAddChartImage(
    workbook,
    sheet,
    0,
    row + points.length + 3,
    labels.chartRevenueTrend,
    axis,
    [
      {
        label: labels.revenue,
        values: points.map((p) => parseDtoAmountForDisplay(p.revenue)),
      },
    ]
  );

  applyPrintSetup(sheet, lang, { landscape: true, freezeAt: 4 });
}
