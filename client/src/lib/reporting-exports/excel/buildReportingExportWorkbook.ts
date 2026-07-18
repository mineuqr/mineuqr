/**
 * REPORTING-DESIGN-LANGUAGE-1 — MineuQR Official Excel Design Language.
 * REPORTING-EXECUTIVE-SUMMARY-RATIONALIZATION-1 — Executive = management snapshot.
 * REPORTING-EXECUTIVE-SUMMARY-UX-1 — owner-readable grouping + captions.
 * REPORTING-EXECUTIVE-SUMMARY-SIMPLIFICATION-1 — operational Executive KPIs only.
 * Preserves REPORTING-PERIOD-CONSISTENCY-1 scoped totals (scopedOrderSalesFromRollup).
 * Presentation only. Does not calculate Revenue or other KPIs.
 *
 * Sheets: Cover · Executive · Financial · Payment Methods · Order Sales · Revenue Trends
 * Western digits as Excel text (@). Values from reporting.* DTOs only.
 * REPORTING-PAYMENT-METHOD-ANALYTICS-1 — Payment Method Analysis from SettlementTransactions.
 * REPORTING-PAYMENT-METHOD-PRESENTATION-ADOPTION-1 — full catalog via shared view model.
 */
import ExcelJS from "exceljs";
import {
  cellBorder,
  isRtl,
  reportAlignment,
  reportFont,
  solidFill,
} from "@/lib/excel/reportTheme";
import { resolveExportLogoAsset } from "../branding";
import { renderTrendChartPng } from "../charts/renderTrendChartPng";
import { buildExecutiveSummaryViewModel } from "../executiveSummaryPresentation";
import { buildPaymentMethodAnalysisViewModel } from "../paymentMethodAnalysisPresentation";
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

/** Official MineuQR Executive Design Language tokens (ARGB). */
const DL = {
  ink: "FF0C1222",
  inkSoft: "FF1E293B",
  muted: "FF64748B",
  faint: "FF94A3B8",
  canvas: "FFF7F8FA",
  surface: "FFFFFFFF",
  brand: "FF0D9488",
  brandDark: "FF0F766E",
  brandDeep: "FF0B3B45",
  brandSoft: "FFCCFBF1",
  brandWash: "FFF0FDFA",
  line: "FFE2E8F0",
  lineStrong: "FFCBD5E1",
  zebra: "FFF8FAFC",
  white: "FFFFFFFF",
} as const;

/** Landscape executive canvas — 14 columns. */
const COLS = 14;
const COL_WIDTH = 10.2;

type Lang = RestaurantReportingExportBundle["language"];

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, " ").trim() || "Report";
  return cleaned.slice(0, 31);
}

function setWesternText(
  cell: ExcelJS.Cell,
  value: string,
  language: Lang,
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
    name: reportFont(language),
    size: options?.size ?? 11,
    bold: options?.bold ?? false,
    italic: options?.italic ?? false,
    color: { argb: options?.color ?? DL.ink },
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

function setColWidths(sheet: ExcelJS.Worksheet) {
  for (let c = 1; c <= COLS; c++) sheet.getColumn(c).width = COL_WIDTH;
}

function applyPrintSetup(
  sheet: ExcelJS.Worksheet,
  language: Lang,
  options?: { freezeAt?: number }
) {
  const freeze = options?.freezeAt ?? 3;
  sheet.views = [
    {
      rightToLeft: isRtl(language),
      state: freeze === 0 ? "normal" : "frozen",
      ySplit: freeze === 0 ? undefined : freeze,
      showGridLines: false,
    },
  ];
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    horizontalCentered: true,
    margins: {
      left: 0.5,
      right: 0.5,
      top: 0.55,
      bottom: 0.55,
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

/** Thin brand accent rule under sheet chrome. */
function writeAccentRule(sheet: ExcelJS.Worksheet, row: number) {
  paintRow(sheet, row, COLS, DL.brand, 4);
}

function writeSheetChrome(
  sheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  language: Lang
) {
  paintRow(sheet, 1, COLS, DL.brandDeep, 36);
  sheet.mergeCells(1, 1, 1, COLS);
  setWesternText(sheet.getCell(1, 1), title, language, {
    bold: true,
    size: 20,
    color: DL.white,
    fill: DL.brandDeep,
  });
  sheet.getCell(1, 1).alignment = reportAlignment(
    language,
    isRtl(language) ? "right" : "left",
    1
  );

  paintRow(sheet, 2, COLS, DL.canvas, 22);
  sheet.mergeCells(2, 1, 2, COLS);
  setWesternText(sheet.getCell(2, 1), subtitle, language, {
    size: 11,
    color: DL.muted,
    fill: DL.canvas,
  });
  sheet.getCell(2, 1).alignment = reportAlignment(
    language,
    isRtl(language) ? "right" : "left",
    1
  );

  writeAccentRule(sheet, 3);
}

function writeSectionLabel(
  sheet: ExcelJS.Worksheet,
  row: number,
  title: string,
  language: Lang
) {
  sheet.mergeCells(row, 1, row, COLS);
  setWesternText(sheet.getCell(row, 1), title.toUpperCase(), language, {
    bold: true,
    size: 10,
    color: DL.brandDark,
    fill: DL.brandWash,
  });
  sheet.getCell(row, 1).alignment = reportAlignment(
    language,
    isRtl(language) ? "right" : "left",
    1
  );
  sheet.getRow(row).height = 26;
}

type ExecutiveCardTuple =
  | readonly [string, string]
  | readonly [string, string, string];

/** Executive dashboard KPI cards — not spreadsheet tables. */
function writeKpiCards(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  cards: ReadonlyArray<ExecutiveCardTuple>,
  language: Lang
): number {
  const rtl = isRtl(language);
  const perRow = 3;
  let row = startRow;
  for (let i = 0; i < cards.length; i += perRow) {
    for (let c = 0; c < perRow; c++) {
      const card = cards[i + c];
      if (!card) continue;
      const col = c * 5 + 1;
      const end = col + 3;
      const caption = card[2];
      sheet.mergeCells(row, col, row, end);
      sheet.mergeCells(row + 1, col, row + 1, end);
      sheet.mergeCells(row + 2, col, row + 2, end);
      sheet.mergeCells(row + 3, col, row + 3, end);

      setWesternText(sheet.getCell(row, col), card[0], language, {
        size: 10,
        color: DL.muted,
        fill: DL.brandWash,
      });
      sheet.getCell(row, col).alignment = reportAlignment(
        language,
        rtl ? "right" : "left",
        1
      );
      sheet.getCell(row, col).border = cellBorder(DL.line);

      setWesternText(sheet.getCell(row + 1, col), card[1], language, {
        bold: true,
        size: 20,
        color: DL.ink,
        fill: DL.surface,
      });
      sheet.getCell(row + 1, col).alignment = reportAlignment(
        language,
        rtl ? "right" : "left",
        1
      );
      sheet.getCell(row + 1, col).border = cellBorder(DL.line);

      setWesternText(sheet.getCell(row + 2, col), caption ?? "", language, {
        size: 9,
        color: DL.faint,
        fill: DL.surface,
      });
      sheet.getCell(row + 2, col).alignment = reportAlignment(
        language,
        rtl ? "right" : "left",
        1
      );
      sheet.getCell(row + 2, col).border = cellBorder(DL.line);

      for (let x = col; x <= end; x++) {
        sheet.getCell(row + 3, x).fill = solidFill(DL.brand);
      }
      sheet.getRow(row + 3).height = 5;
    }
    sheet.getRow(row).height = 22;
    sheet.getRow(row + 1).height = 36;
    sheet.getRow(row + 2).height = 28;
    row += 5;
  }
  return row;
}

/** Financial statement lines — not a default Excel table. */
function writeStatementBlock(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  sectionTitle: string,
  rows: ReadonlyArray<readonly [string, string]>,
  language: Lang
): number {
  const rtl = isRtl(language);
  writeSectionLabel(sheet, startRow, sectionTitle, language);
  let r = startRow + 1;
  rows.forEach(([label, value], index) => {
    const fill = index % 2 === 1 ? DL.zebra : DL.surface;
    sheet.mergeCells(r, 1, r, 8);
    sheet.mergeCells(r, 9, r, COLS);
    setWesternText(sheet.getCell(r, 1), label, language, {
      size: 12,
      color: DL.inkSoft,
      fill,
    });
    setWesternText(sheet.getCell(r, 9), value, language, {
      bold: true,
      size: 16,
      color: DL.ink,
      fill,
    });
    sheet.getCell(r, 1).alignment = reportAlignment(
      language,
      rtl ? "right" : "left",
      1
    );
    sheet.getCell(r, 9).alignment = reportAlignment(
      language,
      rtl ? "left" : "right",
      1
    );
    sheet.getCell(r, 1).border = {
      bottom: { style: "thin", color: { argb: DL.line } },
    };
    sheet.getCell(r, 9).border = {
      bottom: { style: "thin", color: { argb: DL.line } },
    };
    sheet.getRow(r).height = 30;
    r += 1;
  });
  return r + 1;
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
    width: Math.round(size.width * 1.25),
    height: Math.round(size.height * 1.25),
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

function writeInsufficientPanel(
  sheet: ExcelJS.Worksheet,
  row: number,
  message: string,
  language: Lang
) {
  sheet.mergeCells(row, 1, row + 5, COLS);
  paintRow(sheet, row, COLS, DL.brandWash, 28);
  for (let r = row; r <= row + 5; r++) {
    paintRow(sheet, r, COLS, DL.brandWash, 28);
    for (let c = 1; c <= COLS; c++) {
      sheet.getCell(r, c).border = cellBorder(DL.brandSoft);
    }
  }
  setWesternText(sheet.getCell(row, 1), message, language, {
    size: 13,
    color: DL.muted,
    fill: DL.brandWash,
    italic: true,
  });
  sheet.getCell(row, 1).alignment = {
    ...reportAlignment(language, "center"),
    wrapText: true,
    vertical: "middle",
  };
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

function writeDataTableHeader(
  sheet: ExcelJS.Worksheet,
  row: number,
  columns: ReadonlyArray<{ start: number; end: number; label: string }>,
  language: Lang
) {
  const rtl = isRtl(language);
  for (const col of columns) {
    sheet.mergeCells(row, col.start, row, col.end);
    setWesternText(sheet.getCell(row, col.start), col.label, language, {
      bold: true,
      size: 11,
      color: DL.white,
      fill: DL.brandDeep,
    });
    sheet.getCell(row, col.start).alignment = reportAlignment(
      language,
      rtl && col.start === 1 ? "right" : col.start === 1 ? "left" : "right",
      1
    );
  }
  sheet.getRow(row).height = 28;
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
  buildPaymentMethodSheet(workbook, {
    bundle,
    labels,
    money,
    periodLabel,
    scopeLabel,
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

  // Hero band
  for (let r = 1; r <= 8; r++) paintRow(sheet, r, COLS, DL.brandDeep, 18);
  sheet.mergeCells(2, 1, 2, COLS);
  setWesternText(sheet.getCell(2, 1), labels.brand.toUpperCase(), lang, {
    bold: true,
    size: 11,
    color: DL.brandSoft,
    fill: DL.brandDeep,
  });
  sheet.getCell(2, 1).alignment = reportAlignment(lang, "center");

  if (logo) {
    const imageId = workbook.addImage({
      buffer: logo.buffer as unknown as ExcelJS.Buffer,
      extension: logo.extension,
    });
    sheet.addImage(imageId, {
      tl: { col: 5.8, row: 2.6 },
      ext: { width: 120, height: 120 },
    });
  }

  paintRow(sheet, 9, COLS, DL.brand, 5);

  // Identity
  paintRow(sheet, 11, COLS, DL.surface, 10);
  sheet.mergeCells(12, 1, 12, COLS);
  setWesternText(sheet.getCell(12, 1), bundle.restaurantName || "—", lang, {
    bold: true,
    size: 28,
    color: DL.ink,
  });
  sheet.getCell(12, 1).alignment = reportAlignment(lang, "center");
  sheet.getRow(12).height = 38;

  sheet.mergeCells(13, 1, 13, COLS);
  setWesternText(sheet.getCell(13, 1), businessName || "—", lang, {
    size: 13,
    color: DL.muted,
  });
  sheet.getCell(13, 1).alignment = reportAlignment(lang, "center");
  sheet.getRow(13).height = 22;

  // Scope badge
  sheet.mergeCells(15, 5, 15, 10);
  setWesternText(sheet.getCell(15, 5), scopeLabel.toUpperCase(), lang, {
    bold: true,
    size: 11,
    color: DL.brandDark,
    fill: DL.brandSoft,
  });
  sheet.getCell(15, 5).alignment = reportAlignment(lang, "center");
  sheet.getRow(15).height = 26;

  sheet.mergeCells(16, 1, 16, COLS);
  setWesternText(sheet.getCell(16, 1), reportTitle, lang, {
    bold: true,
    size: 18,
    color: DL.inkSoft,
  });
  sheet.getCell(16, 1).alignment = reportAlignment(lang, "center");
  sheet.getRow(16).height = 28;

  sheet.mergeCells(18, 1, 18, COLS);
  setWesternText(sheet.getCell(18, 1), periodLabel, lang, {
    bold: true,
    size: 40,
    color: DL.ink,
  });
  sheet.getCell(18, 1).alignment = reportAlignment(lang, "center");
  sheet.getRow(18).height = 52;

  sheet.mergeCells(19, 1, 19, COLS);
  setWesternText(sheet.getCell(19, 1), labels.coverSubtitle, lang, {
    size: 11,
    color: DL.faint,
    italic: true,
  });
  sheet.getCell(19, 1).alignment = reportAlignment(lang, "center");

  // Meta strip
  const meta: Array<readonly [string, string]> = [
    [labels.currency, `${currencyCode}  ·  ${currencySymbol}`],
    [labels.pricingMode, formatPricingMode(bundle.business, lang)],
    [labels.taxPolicy, formatTaxPolicySummary(bundle.business, lang)],
    [labels.generated, generated],
  ];
  let metaRow = 21;
  meta.forEach(([label, value], index) => {
    const fill = index % 2 === 0 ? DL.canvas : DL.surface;
    sheet.mergeCells(metaRow, 3, metaRow, 6);
    sheet.mergeCells(metaRow, 7, metaRow, 12);
    setWesternText(sheet.getCell(metaRow, 3), label, lang, {
      size: 11,
      color: DL.muted,
      fill,
    });
    setWesternText(sheet.getCell(metaRow, 7), value, lang, {
      bold: true,
      size: 12,
      color: DL.ink,
      fill,
    });
    sheet.getCell(metaRow, 3).alignment = reportAlignment(
      lang,
      rtl ? "right" : "left",
      1
    );
    sheet.getCell(metaRow, 7).alignment = reportAlignment(
      lang,
      rtl ? "right" : "left",
      1
    );
    sheet.getRow(metaRow).height = 26;
    metaRow += 1;
  });

  const contentsRow = metaRow + 2;
  sheet.mergeCells(contentsRow, 1, contentsRow, COLS);
  setWesternText(
    sheet.getCell(contentsRow, 1),
    `${labels.contents}:  ${labels.executive}  ·  ${labels.financial}  ·  ${labels.paymentMethodAnalysis}  ·  ${labels.orderSalesRollup}  ·  ${labels.revenueTrend}`,
    lang,
    { size: 10, color: DL.muted }
  );
  sheet.getCell(contentsRow, 1).alignment = reportAlignment(lang, "center");

  paintRow(sheet, contentsRow + 2, COLS, DL.brandDeep, 10);
  sheet.mergeCells(contentsRow + 3, 1, contentsRow + 3, COLS);
  setWesternText(
    sheet.getCell(contentsRow + 3, 1),
    `${labels.confidential}  ·  ${labels.generatedBy}`,
    lang,
    { size: 10, color: DL.faint }
  );
  sheet.getCell(contentsRow + 3, 1).alignment = reportAlignment(lang, "center");

  applyPrintSetup(sheet, lang, { freezeAt: 0 });
  sheet.views = [{ rightToLeft: isRtl(lang), showGridLines: false }];
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
  setColWidths(sheet);

  writeSheetChrome(
    sheet,
    labels.executive,
    `${scopeLabel}  ·  ${periodLabel}  ·  ${generated}`,
    lang
  );

  paintRow(sheet, 4, COLS, DL.canvas, 12);
  const vm = buildExecutiveSummaryViewModel({
    language: lang,
    business: bundle.business,
    orderPeriod,
    formatMoney: money,
  });

  writeSectionLabel(sheet, 5, vm.sectionTitle, lang);
  sheet.mergeCells(6, 1, 6, COLS);
  setWesternText(sheet.getCell(6, 1), vm.primaryQuestion, lang, {
    bold: true,
    size: 12,
    color: DL.inkSoft,
    fill: DL.canvas,
  });
  sheet.getCell(6, 1).alignment = reportAlignment(
    lang,
    isRtl(lang) ? "right" : "left",
    1
  );

  let row = 8;
  for (const group of vm.groups) {
    writeSectionLabel(sheet, row, group.title, lang);
    row += 1;
    sheet.mergeCells(row, 1, row, COLS);
    setWesternText(sheet.getCell(row, 1), group.hint, lang, {
      size: 10,
      color: DL.muted,
      fill: DL.canvas,
    });
    sheet.getCell(row, 1).alignment = reportAlignment(
      lang,
      isRtl(lang) ? "right" : "left",
      1
    );
    row += 1;
    const tuples = group.cards.map(
      (c) => [c.label, c.value, c.caption] as const
    );
    row = writeKpiCards(sheet, row, tuples, lang);
    row += 1;
  }

  sheet.mergeCells(row, 1, row, COLS);
  setWesternText(sheet.getCell(row, 1), vm.footerNote, lang, {
    size: 9,
    color: DL.muted,
    fill: DL.brandWash,
  });
  sheet.getCell(row, 1).alignment = reportAlignment(
    lang,
    isRtl(lang) ? "right" : "left",
    1
  );
  sheet.getCell(row, 1).border = cellBorder(DL.line);
  sheet.getRow(row).height = 36;

  applyPrintSetup(sheet, lang, { freezeAt: 3 });
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

  writeSheetChrome(
    sheet,
    labels.financial,
    `${scopeLabel}  ·  ${periodLabel}`,
    lang
  );

  paintRow(sheet, 4, COLS, DL.canvas, 10);
  let row = 5;
  // Money Collected (relocated from Executive — SIMPLIFICATION-1)
  writeSectionLabel(sheet, row, labels.moneyCollectedSection, lang);
  row += 1;
  sheet.mergeCells(row, 1, row, COLS);
  setWesternText(sheet.getCell(row, 1), labels.moneyCollectedHint, lang, {
    size: 10,
    color: DL.muted,
    fill: DL.canvas,
  });
  sheet.getCell(row, 1).alignment = reportAlignment(
    lang,
    isRtl(lang) ? "right" : "left",
    1
  );
  row += 1;
  row = writeStatementBlock(
    sheet,
    row,
    labels.performanceSection,
    [
      [labels.revenue, money(biz.revenue)],
      [labels.paidChecks, formatWesternCount(biz.paidCheckCount)],
      [labels.averageCheck, money(biz.averageCheck)],
    ],
    lang
  );
  writeSectionLabel(sheet, row, labels.taxAnalysisSection, lang);
  row += 1;
  sheet.mergeCells(row, 1, row, COLS);
  setWesternText(sheet.getCell(row, 1), labels.taxAnalysisPeriodNote, lang, {
    size: 10,
    color: DL.muted,
    fill: DL.canvas,
  });
  sheet.getCell(row, 1).alignment = reportAlignment(
    lang,
    isRtl(lang) ? "right" : "left",
    1
  );
  row += 1;
  // Tax value row (section title already written above with period note)
  {
    const fill = DL.surface;
    const rtl = isRtl(lang);
    sheet.mergeCells(row, 1, row, 8);
    sheet.mergeCells(row, 9, row, COLS);
    setWesternText(sheet.getCell(row, 1), labels.taxCollected, lang, {
      size: 12,
      color: DL.inkSoft,
      fill,
    });
    setWesternText(sheet.getCell(row, 9), money(biz.taxCollected), lang, {
      bold: true,
      size: 16,
      color: DL.ink,
      fill,
    });
    sheet.getCell(row, 1).alignment = reportAlignment(
      lang,
      rtl ? "right" : "left",
      1
    );
    sheet.getCell(row, 9).alignment = reportAlignment(
      lang,
      rtl ? "left" : "right",
      1
    );
    sheet.getRow(row).height = 30;
    row += 2;
  }
  row = writeStatementBlock(
    sheet,
    row,
    labels.orderSalesSection,
    [
      [labels.orderSales, money(orderPeriod.orderSales)],
      [labels.averageOrder, money(orderPeriod.averageOrder)],
      [labels.orders, formatWesternCount(orderPeriod.orderCount)],
      [labels.completedOrders, formatWesternCount(orderPeriod.completedOrders)],
    ],
    lang
  );
  row = writeStatementBlock(
    sheet,
    row,
    labels.adjustmentsSection,
    [
      [labels.complimentaryCount, formatWesternCount(biz.complimentaryCount)],
      [labels.complimentaryAmount, money(biz.complimentaryAmount)],
      [labels.voidedCount, formatWesternCount(biz.voidedCount)],
    ],
    lang
  );
  writeStatementBlock(
    sheet,
    row,
    labels.reportingBasisSection,
    [
      [labels.revenue, labels.checkRevenueBasis],
      [labels.orderSales, labels.orderSalesBasis],
      [labels.currency, `${currencyCode} (${currencySymbol})`],
      [labels.pricingMode, formatPricingMode(biz, lang)],
      [labels.taxPolicy, formatTaxPolicySummary(biz, lang)],
    ],
    lang
  );

  applyPrintSetup(sheet, lang, { freezeAt: 3 });
}

function buildPaymentMethodSheet(
  workbook: ExcelJS.Workbook,
  ctx: {
    bundle: RestaurantReportingExportBundle;
    labels: ReportingExportLabels;
    money: (amount: string) => string;
    periodLabel: string;
    scopeLabel: string;
  }
) {
  const { bundle, labels, money, periodLabel, scopeLabel } = ctx;
  const sheet = workbook.addWorksheet(
    sanitizeSheetName(labels.paymentMethodAnalysis)
  );
  const lang = bundle.language;
  const vm = buildPaymentMethodAnalysisViewModel({
    language: lang,
    analytics: bundle.paymentMethodAnalytics,
  });
  setColWidths(sheet);

  writeSheetChrome(
    sheet,
    labels.paymentMethodAnalysis,
    `${scopeLabel}  ·  ${periodLabel}`,
    lang
  );

  paintRow(sheet, 4, COLS, DL.canvas, 10);
  sheet.mergeCells(5, 1, 5, COLS);
  setWesternText(sheet.getCell(5, 1), vm.sectionNote, lang, {
    size: 10,
    color: DL.muted,
    fill: DL.canvas,
  });
  sheet.getCell(5, 1).alignment = reportAlignment(
    lang,
    isRtl(lang) ? "right" : "left",
    1
  );

  let row = writeStatementBlock(
    sheet,
    7,
    labels.paymentMix,
    [
      [labels.monetaryTenderTotal, money(vm.monetaryTenderTotal)],
      [vm.complimentaryLabel, money(vm.complimentaryAmount)],
    ],
    lang
  );

  if (!vm.hasActivity) {
    sheet.mergeCells(row, 1, row, COLS);
    setWesternText(sheet.getCell(row, 1), vm.emptyMessage, lang, {
      size: 11,
      color: DL.muted,
      fill: DL.surface,
    });
    row += 2;
  }

  writeSectionLabel(sheet, row, labels.paymentMethodAnalysis, lang);
  row += 1;

  const headers = [
    labels.paymentMethod,
    labels.tenderAmount,
    labels.checksByMethod,
    labels.averageCheckByMethod,
    labels.mixPercent,
    labels.transactions,
  ];
  const colStarts = [1, 4, 7, 9, 11, 13];
  const colEnds = [3, 6, 8, 10, 12, COLS];
  for (let i = 0; i < headers.length; i++) {
    sheet.mergeCells(row, colStarts[i]!, row, colEnds[i]!);
    setWesternText(sheet.getCell(row, colStarts[i]!), headers[i]!, lang, {
      bold: true,
      size: 10,
      color: DL.inkSoft,
      fill: DL.brandWash,
    });
    sheet.getCell(row, colStarts[i]!).border = cellBorder(DL.line);
  }
  row += 1;

  for (const bucket of vm.rows) {
    const fill = bucket.hasActivity ? DL.surface : DL.zebra;
    const cells = [
      bucket.label,
      money(bucket.tenderAmount),
      formatWesternCount(bucket.checkCount),
      money(bucket.averageCheck),
      `${toWesternDigits(bucket.mixPercent)}%`,
      formatWesternCount(bucket.transactionCount),
    ];
    for (let i = 0; i < cells.length; i++) {
      sheet.mergeCells(row, colStarts[i]!, row, colEnds[i]!);
      setWesternText(sheet.getCell(row, colStarts[i]!), cells[i]!, lang, {
        size: 12,
        color: DL.ink,
        fill,
        bold: i === 1,
      });
      sheet.getCell(row, colStarts[i]!).border = cellBorder(DL.line);
    }
    sheet.getRow(row).height = 26;
    row += 1;
  }

  applyPrintSetup(sheet, lang, { freezeAt: 3 });
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

  writeSheetChrome(
    sheet,
    labels.orderSalesRollup,
    `${scopeLabel}  ·  ${seriesTitle}`,
    lang
  );

  const axis = periods.map((p) =>
    formatTrendAxisLabel(p.periodKey, bundle.scope, lang)
  );

  if (!hasRenderableTrend(periods.length)) {
    writeInsufficientPanel(sheet, 5, labels.trendInsufficient, lang);
    applyPrintSetup(sheet, lang, { freezeAt: 3 });
    return;
  }

  writeSectionLabel(sheet, 5, labels.chartOrderTrend, lang);
  const chartPlaced = await maybeAddChartImage(
    workbook,
    sheet,
    0.2,
    5.8,
    labels.chartOrderTrend,
    axis,
    [
      {
        label: labels.orderSales,
        values: periods.map((p) => parseDtoAmountForDisplay(p.orderSales)),
      },
    ],
    { width: 1120, height: 320 }
  );

  let row = chartPlaced ? 23 : 7;
  for (let r = 6; r < row; r++) {
    paintRow(sheet, r, COLS, DL.surface, 15);
  }

  writeSectionLabel(sheet, row, labels.orderSalesSection, lang);
  row += 1;

  writeDataTableHeader(
    sheet,
    row,
    [
      { start: 1, end: 3, label: labels.periodKey },
      { start: 4, end: 6, label: labels.orderCount },
      { start: 7, end: 9, label: labels.completedOrders },
      { start: 10, end: COLS, label: labels.orderSales },
    ],
    lang
  );

  periods.forEach((p, index) => {
    const r = row + 1 + index;
    const fill = index % 2 === 1 ? DL.zebra : DL.surface;
    sheet.mergeCells(r, 1, r, 3);
    sheet.mergeCells(r, 4, r, 6);
    sheet.mergeCells(r, 7, r, 9);
    sheet.mergeCells(r, 10, r, COLS);
    setWesternText(sheet.getCell(r, 1), axis[index]!, lang, { size: 11, fill });
    setWesternText(sheet.getCell(r, 4), formatWesternCount(p.orderCount), lang, {
      size: 11,
      fill,
    });
    setWesternText(
      sheet.getCell(r, 7),
      formatWesternCount(p.completedOrders),
      lang,
      { size: 11, fill }
    );
    setWesternText(
      sheet.getCell(r, 10),
      `${formatWesternAmount(p.orderSales)} ${currencySymbol}`,
      lang,
      { bold: true, size: 12, fill }
    );
    sheet.getCell(r, 10).alignment = reportAlignment(
      lang,
      isRtl(lang) ? "left" : "right",
      1
    );
    sheet.getRow(r).height = 24;
  });

  const totalRow = row + 1 + periods.length;
  sheet.mergeCells(totalRow, 1, totalRow, 3);
  sheet.mergeCells(totalRow, 4, totalRow, 6);
  sheet.mergeCells(totalRow, 7, totalRow, 9);
  sheet.mergeCells(totalRow, 10, totalRow, COLS);
  setWesternText(sheet.getCell(totalRow, 1), periodLabel, lang, {
    bold: true,
    size: 12,
    color: DL.white,
    fill: DL.brandDark,
  });
  setWesternText(
    sheet.getCell(totalRow, 4),
    formatWesternCount(orderPeriod.orderCount),
    lang,
    { bold: true, size: 12, color: DL.white, fill: DL.brandDark }
  );
  setWesternText(
    sheet.getCell(totalRow, 7),
    formatWesternCount(orderPeriod.completedOrders),
    lang,
    { bold: true, size: 12, color: DL.white, fill: DL.brandDark }
  );
  setWesternText(
    sheet.getCell(totalRow, 10),
    `${formatWesternAmount(orderPeriod.orderSales)} ${currencySymbol}`,
    lang,
    { bold: true, size: 13, color: DL.white, fill: DL.brandDark }
  );
  sheet.getRow(totalRow).height = 30;

  applyPrintSetup(sheet, lang, { freezeAt: 3 });
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

  writeSheetChrome(
    sheet,
    labels.revenueTrend,
    `${scopeLabel}  ·  ${seriesTitle}`,
    lang
  );

  const axis = points.map((p) =>
    formatTrendAxisLabel(p.periodKey, bundle.scope, lang)
  );

  if (!hasRenderableTrend(points.length)) {
    writeInsufficientPanel(sheet, 5, labels.trendInsufficient, lang);
    applyPrintSetup(sheet, lang, { freezeAt: 3 });
    return;
  }

  writeSectionLabel(sheet, 5, labels.chartRevenueTrend, lang);
  const chartPlaced = await maybeAddChartImage(
    workbook,
    sheet,
    0.2,
    5.8,
    labels.chartRevenueTrend,
    axis,
    [
      {
        label: labels.revenue,
        values: points.map((p) => parseDtoAmountForDisplay(p.revenue)),
      },
    ],
    { width: 1120, height: 340 }
  );

  let row = chartPlaced ? 24 : 7;
  for (let r = 6; r < row; r++) {
    paintRow(sheet, r, COLS, DL.surface, 15);
  }

  writeSectionLabel(sheet, row, labels.performanceSection, lang);
  row += 1;

  writeDataTableHeader(
    sheet,
    row,
    [
      { start: 1, end: 4, label: labels.periodKey },
      { start: 5, end: 9, label: labels.revenue },
      { start: 10, end: COLS, label: labels.paidCheckCount },
    ],
    lang
  );

  points.forEach((p, index) => {
    const r = row + 1 + index;
    const fill = index % 2 === 1 ? DL.zebra : DL.surface;
    sheet.mergeCells(r, 1, r, 4);
    sheet.mergeCells(r, 5, r, 9);
    sheet.mergeCells(r, 10, r, COLS);
    setWesternText(sheet.getCell(r, 1), axis[index]!, lang, { size: 11, fill });
    setWesternText(
      sheet.getCell(r, 5),
      `${formatWesternAmount(p.revenue)} ${currencySymbol}`,
      lang,
      { bold: true, size: 12, fill }
    );
    setWesternText(
      sheet.getCell(r, 10),
      formatWesternCount(p.paidCheckCount),
      lang,
      { size: 11, fill }
    );
    sheet.getCell(r, 5).alignment = reportAlignment(
      lang,
      isRtl(lang) ? "left" : "right",
      1
    );
    sheet.getRow(r).height = 24;
  });

  const biz = bundle.business;
  const totalRow = row + 1 + points.length;
  sheet.mergeCells(totalRow, 1, totalRow, 4);
  sheet.mergeCells(totalRow, 5, totalRow, 9);
  sheet.mergeCells(totalRow, 10, totalRow, COLS);
  setWesternText(sheet.getCell(totalRow, 1), periodLabel, lang, {
    bold: true,
    size: 12,
    color: DL.white,
    fill: DL.brandDark,
  });
  setWesternText(
    sheet.getCell(totalRow, 5),
    `${formatWesternAmount(biz.revenue)} ${currencySymbol}`,
    lang,
    { bold: true, size: 13, color: DL.white, fill: DL.brandDark }
  );
  setWesternText(
    sheet.getCell(totalRow, 10),
    formatWesternCount(biz.paidCheckCount),
    lang,
    { bold: true, size: 12, color: DL.white, fill: DL.brandDark }
  );
  sheet.getRow(totalRow).height = 30;

  applyPrintSetup(sheet, lang, { freezeAt: 3 });
}
