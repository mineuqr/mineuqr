/**
 * REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-2 — Executive Financial Report (PDF).
 * Uses pdfkit + Cairo for Arabic typography.
 * Presentation only. Does not calculate Revenue or other KPIs.
 */
import { resolveExportLogoAsset } from "../branding";
import {
  formatExportDateTime,
  formatMoneyDisplay,
  formatPricingMode,
  formatTaxPolicySummary,
  parseDtoAmountForDisplay,
  resolveExportCurrency,
  toWesternDigits,
} from "../format";
import { reportingExportLabels } from "../labels";
import {
  formatReportScopeLabel,
  formatTrendAxisLabel,
  hasRenderableTrend,
} from "../periodPresentation";
import type { RestaurantReportingExportBundle } from "../types";
import { preparePdfText } from "./arabicPdfText";
import { loadExportFontBytes } from "./loadExportFont";

type PdfKitConstructor = typeof import("pdfkit").default;

const NAVY = "#0B1F33";
const NAVY_MID = "#16324F";
const GOLD = "#B8943F";
const GOLD_SOFT = "#F7F1E1";
const INK = "#0F172A";
const SLATE = "#475569";
const MIST = "#F1F5F9";
const LINE = "#D6DEE8";

function formatWesternCount(value: number): string {
  return toWesternDigits(
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)
  );
}

function formatWesternAmount(value: string): string {
  return toWesternDigits(
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseDtoAmountForDisplay(value))
  );
}

function bufferFrom(chunks: Buffer[]): Uint8Array {
  return new Uint8Array(Buffer.concat(chunks));
}

async function renderPdfDocument(
  bundle: RestaurantReportingExportBundle,
  fallbackCurrencySymbol: string,
  fallbackCurrencyCode: string | undefined,
  fontBytes: ArrayBuffer | null,
  logo: Awaited<ReturnType<typeof resolveExportLogoAsset>>,
  PDFDocument: PdfKitConstructor
): Promise<Uint8Array> {
  const labels = reportingExportLabels(bundle.language);
  const isAr = bundle.language === "ar";
  const { currencySymbol, currencyCode } = resolveExportCurrency(
    bundle.business,
    fallbackCurrencySymbol,
    fallbackCurrencyCode
  );
  const money = (amount: string) =>
    toWesternDigits(formatMoneyDisplay(amount, currencySymbol));
  const biz = bundle.business;
  const sales = bundle.orderSales;
  const reportTitle =
    bundle.reportTitle?.trim() ||
    (bundle.scope === "month"
      ? labels.reportTitleMonthly
      : labels.reportTitleAnnual);
  const businessName = (bundle.businessName || bundle.restaurantName || "").trim();
  const generated = formatExportDateTime(new Date(), bundle.language);
  const periodLabel = toWesternDigits(bundle.periodLabel);
  const scopeLabel = formatReportScopeLabel(bundle.scope, bundle.language);

  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    bufferPages: true,
    info: {
      Title: reportTitle,
      Author: "MineuQR",
      Subject: labels.coverSubtitle,
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Uint8Array>((resolve, reject) => {
    doc.on("end", () => resolve(bufferFrom(chunks)));
    doc.on("error", reject);
  });

  const hasFont = Boolean(fontBytes);
  if (hasFont && fontBytes) {
    doc.registerFont("ExportSans", Buffer.from(fontBytes));
  }
  const font = hasFont ? "ExportSans" : "Helvetica";
  const fontBold = hasFont ? "ExportSans" : "Helvetica-Bold";

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 96;
  const T = (value: string) => preparePdfText(toWesternDigits(value), isAr);
  const text = (
    value: string,
    x: number,
    y: number,
    options?: { width?: number; lineBreak?: boolean }
  ) => {
    doc.text(T(value), x, y, { ...options, align: "left" });
  };

  // ── Cover ──────────────────────────────────────────────
  doc.rect(0, 0, pageWidth, 36).fill(NAVY);
  doc.fillColor(GOLD).font(fontBold).fontSize(9);
  text(labels.brand.toUpperCase(), 48, 12, { width: contentWidth });

  let y = 72;
  if (logo) {
    try {
      const logoX = (pageWidth - 96) / 2;
      doc.roundedRect(logoX - 6, y - 6, 108, 108, 8).fill("#FFFFFF");
      doc.image(Buffer.from(logo.buffer), logoX, y, {
        width: 96,
        height: 96,
        fit: [96, 96],
      });
    } catch {
      /* optional */
    }
  }
  y = 200;

  doc.fillColor(NAVY).font(fontBold).fontSize(26);
  text(bundle.restaurantName || "—", 48, y, { width: contentWidth });
  y = doc.y + 8;
  doc.fillColor(SLATE).font(font).fontSize(12);
  text(businessName || "—", 48, y, { width: contentWidth });
  y = doc.y + 16;
  doc.rect(48, y, contentWidth, 3).fill(GOLD);
  y += 22;

  doc.fillColor(GOLD).font(fontBold).fontSize(11);
  text(scopeLabel.toUpperCase(), 48, y, { width: contentWidth });
  y = doc.y + 8;
  doc.fillColor(NAVY).font(fontBold).fontSize(18);
  text(reportTitle, 48, y, { width: contentWidth });
  y = doc.y + 14;
  doc.fillColor(INK).font(fontBold).fontSize(28);
  text(periodLabel, 48, y, { width: contentWidth });
  y = doc.y + 8;
  doc.fillColor(SLATE).font(font).fontSize(10);
  text(labels.coverSubtitle, 48, y, { width: contentWidth });

  y = doc.y + 28;
  const metaRows: Array<[string, string]> = [
    [labels.currency, `${currencyCode}  ·  ${currencySymbol}`],
    [labels.pricingMode, formatPricingMode(biz, bundle.language)],
    [labels.taxPolicy, formatTaxPolicySummary(biz, bundle.language)],
    [labels.generated, generated],
  ];
  for (const [label, value] of metaRows) {
    doc.roundedRect(48, y, contentWidth, 26, 4).fillAndStroke(GOLD_SOFT, GOLD);
    doc.fillColor(SLATE).font(font).fontSize(9);
    text(label, 60, y + 8, { width: contentWidth / 2 - 24 });
    doc.fillColor(NAVY).font(fontBold).fontSize(10);
    text(value, 48 + contentWidth / 2, y + 8, { width: contentWidth / 2 - 20 });
    y += 32;
  }

  y += 12;
  doc.fillColor(SLATE).font(font).fontSize(9);
  text(
    `${labels.contents}: ${labels.executive} · ${labels.financial} · ${labels.orderSalesRollup} · ${labels.revenueTrend}`,
    48,
    y,
    { width: contentWidth }
  );

  const ensure = (need: number) => {
    if (y + need > doc.page.height - 64) {
      doc.addPage();
      y = 48;
    }
  };

  const section = (title: string) => {
    ensure(48);
    y += 14;
    doc.rect(48, y, contentWidth, 28).fill(NAVY);
    doc.fillColor("#FFFFFF").font(fontBold).fontSize(12);
    text(title, 60, y + 8, { width: contentWidth - 24 });
    y += 40;
  };

  const kpiCards = (cards: Array<[string, string]>) => {
    const cols = 3;
    const gap = 10;
    const cardW = (contentWidth - gap * (cols - 1)) / cols;
    const cardH = 56;
    for (let i = 0; i < cards.length; i += cols) {
      ensure(cardH + 12);
      for (let c = 0; c < cols; c++) {
        const card = cards[i + c];
        if (!card) continue;
        const colIndex = isAr ? cols - 1 - c : c;
        const x = 48 + colIndex * (cardW + gap);
        doc.roundedRect(x, y, cardW, cardH, 5).fillAndStroke(GOLD_SOFT, GOLD);
        doc.fillColor(SLATE).font(font).fontSize(8);
        text(card[0], x + 10, y + 10, { width: cardW - 20 });
        doc.fillColor(NAVY).font(fontBold).fontSize(13);
        text(card[1], x + 10, y + 28, { width: cardW - 20 });
      }
      y += cardH + 10;
    }
  };

  const kvTable = (rows: Array<[string, string]>) => {
    ensure(26);
    doc.rect(48, y, contentWidth, 24).fill(NAVY);
    doc.fillColor("#FFFFFF").font(fontBold).fontSize(9);
    const metricX = isAr ? 48 + contentWidth * 0.48 : 56;
    const valueX = isAr ? 56 : 48 + contentWidth * 0.48;
    text(labels.metric, metricX, y + 7, { width: contentWidth * 0.45 });
    text(labels.value, valueX, y + 7, { width: contentWidth * 0.48 });
    y += 24;
    for (let i = 0; i < rows.length; i++) {
      ensure(24);
      const [label, value] = rows[i]!;
      const bg = i % 2 === 1 ? MIST : "#FFFFFF";
      doc.rect(48, y, contentWidth, 22).fill(bg);
      doc.strokeColor(LINE).rect(48, y, contentWidth, 22).stroke();
      doc.fillColor(SLATE).font(font).fontSize(10);
      text(label, metricX, y + 6, { width: contentWidth * 0.45 });
      doc.fillColor(INK).font(fontBold).fontSize(10);
      text(value, valueX, y + 6, { width: contentWidth * 0.48 });
      y += 22;
    }
  };

  const drawBars = (values: number[], color: string) => {
    if (!hasRenderableTrend(values.length)) {
      ensure(48);
      doc.roundedRect(48, y, contentWidth, 40, 4).fillAndStroke(GOLD_SOFT, GOLD);
      doc.fillColor(SLATE).font(font).fontSize(10);
      text(labels.trendInsufficient, 60, y + 14, { width: contentWidth - 24 });
      y += 52;
      return;
    }
    let max = 0;
    for (const v of values) if (v > max) max = v;
    max = max || 1;
    ensure(120);
    const chartH = 90;
    const barGap = 3;
    const barW = Math.max(2, (contentWidth - barGap * values.length) / values.length);
    const baseY = y + chartH;
    doc.strokeColor(LINE).moveTo(48, baseY).lineTo(48 + contentWidth, baseY).stroke();
    for (let i = 0; i < values.length; i++) {
      const h = (values[i]! / max) * (chartH - 8);
      doc.rect(48 + i * (barW + barGap), baseY - h, barW, h).fill(color);
    }
    y = baseY + 16;
  };

  // ── Executive ──────────────────────────────────────────
  doc.addPage();
  y = 48;
  section(labels.executive);
  doc.fillColor(SLATE).font(font).fontSize(9);
  text(`${scopeLabel} · ${periodLabel} · ${generated}`, 48, y, {
    width: contentWidth,
  });
  y = doc.y + 12;
  kpiCards([
    [labels.revenue, money(biz.revenue)],
    [labels.taxCollected, money(biz.taxCollected)],
    [labels.paidChecks, formatWesternCount(biz.paidCheckCount)],
    [labels.averageCheck, money(biz.averageCheck)],
    [labels.orderSalesPeriod, money(sales.month.orderSales)],
    [labels.averageOrderPeriod, money(sales.month.averageOrder)],
    [labels.ordersPeriod, formatWesternCount(sales.month.totalOrders)],
    [labels.complimentaryCount, formatWesternCount(biz.complimentaryCount)],
    [labels.voidedCount, formatWesternCount(biz.voidedCount)],
  ]);

  // ── Financial ──────────────────────────────────────────
  section(labels.financial);
  kvTable([
    [labels.revenue, money(biz.revenue)],
    [labels.taxCollected, money(biz.taxCollected)],
    [labels.paidChecks, formatWesternCount(biz.paidCheckCount)],
    [labels.averageCheck, money(biz.averageCheck)],
    [labels.orderSalesPeriod, money(sales.month.orderSales)],
    [labels.complimentaryCount, formatWesternCount(biz.complimentaryCount)],
    [labels.complimentaryAmount, money(biz.complimentaryAmount)],
    [labels.voidedCount, formatWesternCount(biz.voidedCount)],
    [labels.currency, `${currencyCode} (${currencySymbol})`],
    [labels.pricingMode, formatPricingMode(biz, bundle.language)],
    [labels.taxPolicy, formatTaxPolicySummary(biz, bundle.language)],
  ]);

  // ── Order Sales ────────────────────────────────────────
  section(labels.orderSalesRollup);
  const orderAxis = bundle.orderSalesRollup.periods.map((p) =>
    formatTrendAxisLabel(p.periodKey, bundle.scope, bundle.language)
  );
  const orderValues = bundle.orderSalesRollup.periods.map((p) =>
    parseDtoAmountForDisplay(p.orderSales)
  );
  drawBars(orderValues, NAVY_MID);
  if (hasRenderableTrend(orderValues.length)) {
    kvTable(
      bundle.orderSalesRollup.periods.slice(0, 31).map((p, i) => [
        orderAxis[i]!,
        `${formatWesternAmount(p.orderSales)} ${currencySymbol}`,
      ])
    );
  }

  // ── Revenue Trends ─────────────────────────────────────
  section(labels.revenueTrend);
  const revAxis = bundle.revenueTrend.points.map((p) =>
    formatTrendAxisLabel(p.periodKey, bundle.scope, bundle.language)
  );
  const revValues = bundle.revenueTrend.points.map((p) =>
    parseDtoAmountForDisplay(p.revenue)
  );
  drawBars(revValues, GOLD);
  if (hasRenderableTrend(revValues.length)) {
    kvTable(
      bundle.revenueTrend.points.slice(0, 31).map((p, i) => [
        revAxis[i]!,
        `${formatWesternAmount(p.revenue)} ${currencySymbol}`,
      ])
    );
  }

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.font(font).fontSize(8).fillColor(SLATE);
    text(labels.generatedBy, 48, doc.page.height - 36, {
      width: contentWidth / 2,
      lineBreak: false,
    });
    doc.text(T(`${i + 1} / ${range.count}`), 48 + contentWidth / 2, doc.page.height - 36, {
      width: contentWidth / 2,
      align: "right",
      lineBreak: false,
    });
    doc.rect(48, doc.page.height - 48, contentWidth, 1).fill(GOLD);
  }

  doc.end();
  return done;
}

export async function buildReportingExportPdfBytes(
  bundle: RestaurantReportingExportBundle,
  fallbackCurrencySymbol: string,
  fallbackCurrencyCode?: string
): Promise<Uint8Array> {
  const [{ default: PDFDocument }, fontBytes, logo] = await Promise.all([
    import("pdfkit"),
    loadExportFontBytes(),
    resolveExportLogoAsset(bundle.logoUrl),
  ]);
  return renderPdfDocument(
    bundle,
    fallbackCurrencySymbol,
    fallbackCurrencyCode,
    fontBytes,
    logo,
    PDFDocument
  );
}

export async function buildReportingExportPdfBlob(
  bundle: RestaurantReportingExportBundle,
  fallbackCurrencySymbol: string,
  fallbackCurrencyCode?: string
): Promise<Blob> {
  const bytes = await buildReportingExportPdfBytes(
    bundle,
    fallbackCurrencySymbol,
    fallbackCurrencyCode
  );
  return new Blob([bytes], { type: "application/pdf" });
}
