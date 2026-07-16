/**
 * REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1 — Executive PDF presentation.
 * Uses pdfkit + Cairo for Arabic typography.
 * Presentation only. Does not calculate Revenue or other KPIs.
 */
import { resolveExportLogoAsset } from "../branding";
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
import { reportingExportLabels } from "../labels";
import type { RestaurantReportingExportBundle } from "../types";
import { preparePdfText } from "./arabicPdfText";
import { loadExportFontBytes } from "./loadExportFont";

type PdfKitConstructor = typeof import("pdfkit").default;

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
  const ops = bundle.operational;
  const catalog = bundle.catalog;
  const reportTitle = bundle.reportTitle?.trim() || labels.reportTitleDefault;
  const businessName = (bundle.businessName || bundle.restaurantName || "").trim();
  const generated = formatExportDateTime(new Date(), bundle.language);
  const periodLabel = toWesternDigits(bundle.periodLabel);

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
  /** pdfkit draws LTR; Arabic strings are reshaped + visually reordered, then left-aligned. */
  const pdfAlign = "left" as const;
  const T = (value: string) => preparePdfText(toWesternDigits(value), isAr);
  const text = (
    value: string,
    x: number,
    y: number,
    options?: { width?: number; lineBreak?: boolean }
  ) => {
    doc.text(T(value), x, y, { ...options, align: pdfAlign });
  };

  // Cover — full-bleed brand plane + identity block
  doc.rect(0, 0, pageWidth, 110).fill("#0F766E");
  doc.rect(0, 110, pageWidth, 8).fill("#0D9488");
  if (logo) {
    try {
      const logoX = isAr ? pageWidth - 48 - 72 : 48;
      doc.roundedRect(logoX - 4, 19, 80, 80, 6).fill("#FFFFFF");
      doc.image(Buffer.from(logo.buffer), logoX, 23, {
        width: 72,
        height: 72,
        fit: [72, 72],
      });
    } catch {
      /* logo optional */
    }
  }
  const coverTextX = isAr ? 48 : 140;
  const coverTextW = contentWidth - 92;
  doc.fillColor("#FFFFFF").font(fontBold).fontSize(22);
  text(bundle.restaurantName || "—", coverTextX, 28, { width: coverTextW });
  doc.font(font).fontSize(11).fillColor("#CCFBF1");
  text(`${labels.businessName}: ${businessName || "—"}`, coverTextX, 56, {
    width: coverTextW,
  });
  doc.font(fontBold).fontSize(13).fillColor("#FFFFFF");
  text(reportTitle, coverTextX, 78, { width: coverTextW });

  let y = 136;
  doc.font(font).fontSize(10).fillColor("#64748B");
  text(labels.coverSubtitle, 48, y, { width: contentWidth });

  y = doc.y + 14;
  const metaRows: Array<[string, string]> = [
    [labels.period, periodLabel],
    [labels.generated, generated],
    [labels.currency, `${currencyCode} (${currencySymbol})`],
    [labels.pricingMode, formatPricingMode(biz, bundle.language)],
    [labels.taxPolicy, formatTaxPolicySummary(biz, bundle.language)],
  ];
  for (const [label, value] of metaRows) {
    doc.roundedRect(48, y, contentWidth, 24, 4).fillAndStroke("#F0FDFA", "#99F6E4");
    const labelX = isAr ? 48 + contentWidth / 2 : 56;
    const valueX = isAr ? 56 : 48 + contentWidth / 2;
    doc.fillColor("#64748B").font(font).fontSize(9);
    text(label, labelX, y + 7, { width: contentWidth / 2 - 16 });
    doc.fillColor("#0F172A").font(fontBold).fontSize(10);
    text(value, valueX, y + 7, { width: contentWidth / 2 - 16 });
    y += 28;
  }

  const ensure = (need: number) => {
    if (y + need > doc.page.height - 64) {
      doc.addPage();
      y = 48;
    }
  };

  const section = (title: string) => {
    ensure(40);
    y += 12;
    doc.fillColor("#0F766E").font(fontBold).fontSize(14);
    text(title, 48, y, { width: contentWidth });
    y = doc.y + 6;
    doc.moveTo(48, y).lineTo(48 + contentWidth, y).strokeColor("#99F6E4").lineWidth(1.5).stroke();
    y += 12;
  };

  const kpiCards = (cards: Array<[string, string]>) => {
    const cols = 3;
    const gap = 10;
    const cardW = (contentWidth - gap * (cols - 1)) / cols;
    const cardH = 52;
    for (let i = 0; i < cards.length; i += cols) {
      ensure(cardH + 12);
      for (let c = 0; c < cols; c++) {
        const card = cards[i + c];
        if (!card) continue;
        const colIndex = isAr ? cols - 1 - c : c;
        const x = 48 + colIndex * (cardW + gap);
        doc.roundedRect(x, y, cardW, cardH, 5).fillAndStroke("#F0FDFA", "#99F6E4");
        doc.fillColor("#64748B").font(font).fontSize(8);
        text(card[0], x + 10, y + 8, { width: cardW - 20 });
        doc.fillColor("#0F766E").font(fontBold).fontSize(12);
        text(card[1], x + 10, y + 26, { width: cardW - 20 });
      }
      y += cardH + 10;
    }
  };

  const kvTable = (rows: Array<[string, string]>) => {
    ensure(26);
    doc.rect(48, y, contentWidth, 24).fill("#0B3B45");
    doc.fillColor("#FFFFFF").font(fontBold).fontSize(9);
    const metricX = isAr ? 48 + contentWidth * 0.48 : 56;
    const valueX = isAr ? 56 : 48 + contentWidth * 0.48;
    text(labels.metric, metricX, y + 7, { width: contentWidth * 0.45 });
    text(labels.value, valueX, y + 7, { width: contentWidth * 0.48 });
    y += 24;
    for (let i = 0; i < rows.length; i++) {
      ensure(24);
      const [label, value] = rows[i]!;
      const bg = i % 2 === 1 ? "#F8FAFC" : "#FFFFFF";
      doc.rect(48, y, contentWidth, 22).fill(bg);
      doc.strokeColor("#E2E8F0").rect(48, y, contentWidth, 22).stroke();
      doc.fillColor("#334155").font(font).fontSize(10);
      text(label, metricX, y + 6, { width: contentWidth * 0.45 });
      doc.fillColor("#0F172A").font(fontBold).fontSize(10);
      text(value, valueX, y + 6, { width: contentWidth * 0.48 });
      y += 22;
    }
  };

  // Executive — KPI cards (not a plain table)
  section(labels.executive);
  kpiCards([
    [labels.revenue, money(biz.revenue)],
    [labels.orderSalesMonth, money(sales.month.orderSales)],
    [labels.paidChecks, formatWesternCount(biz.paidCheckCount)],
    [labels.averageCheck, money(biz.averageCheck)],
    [labels.averageOrderMonth, money(sales.month.averageOrder)],
    [labels.sessionsActive, formatWesternCount(ops.activeSessions)],
    [labels.ordersMonth, formatWesternCount(sales.month.totalOrders)],
    [labels.orderSalesToday, money(sales.today.orderSales)],
    [labels.ordersToday, formatWesternCount(sales.today.totalOrders)],
  ]);

  section(labels.financial);
  kvTable([
    [labels.revenue, money(biz.revenue)],
    [labels.taxCollected, money(biz.taxCollected)],
    [labels.complimentaryCount, formatWesternCount(biz.complimentaryCount)],
    [labels.complimentaryAmount, money(biz.complimentaryAmount)],
    [labels.voidedCount, formatWesternCount(biz.voidedCount)],
    [labels.currency, `${currencyCode} (${currencySymbol})`],
    [labels.pricingMode, formatPricingMode(biz, bundle.language)],
    [labels.taxPolicy, formatTaxPolicySummary(biz, bundle.language)],
    [labels.orderSalesMonth, money(sales.month.orderSales)],
  ]);

  section(labels.operational);
  kvTable([
    [labels.sessionsActive, formatWesternCount(ops.activeSessions)],
    [labels.occupiedTables, formatWesternCount(ops.occupiedTables)],
    [labels.pendingOrders, formatWesternCount(ops.pendingOrders)],
    [labels.kitchenLoad, formatWesternCount(ops.kitchenLoad)],
    [labels.activeOrders, formatNullableCount(ops.activeOrders)],
    [labels.preparingOrders, formatNullableCount(ops.preparingOrders)],
    [labels.readyOrders, formatNullableCount(ops.readyOrders)],
  ]);

  section(labels.catalog);
  kvTable([
    [labels.categories, formatWesternCount(catalog.categoryCount)],
    [labels.items, formatWesternCount(catalog.itemCount)],
    [labels.menuVisits, formatWesternCount(catalog.menuVisits)],
  ]);
  ensure(50);
  doc.fillColor("#0F766E").font(fontBold).fontSize(11);
  text(labels.catalogPlaceholderTitle, 48, y, { width: contentWidth });
  y = doc.y + 4;
  doc.fillColor("#64748B").font(font).fontSize(9);
  text(labels.catalogPlaceholderBody, 48, y, { width: contentWidth });
  y = doc.y + 12;

  section(labels.revenueTrend);
  // Simple bar chart
  const revValues = bundle.revenueTrend.points.map((p) =>
    parseDtoAmountForDisplay(p.revenue)
  );
  let revMax = 0;
  for (const v of revValues) if (v > revMax) revMax = v;
  revMax = revMax || 1;
  ensure(130);
  const chartH = 90;
  const barGap = 3;
  const n = revValues.length;
  if (n > 0) {
    const barW = Math.max(2, (contentWidth - barGap * n) / n);
    const baseY = y + chartH;
    doc.strokeColor("#E2E8F0").moveTo(48, baseY).lineTo(48 + contentWidth, baseY).stroke();
    for (let i = 0; i < n; i++) {
      const h = (revValues[i]! / revMax) * (chartH - 8);
      doc.rect(48 + i * (barW + barGap), baseY - h, barW, h).fill("#0D9488");
    }
    y = baseY + 16;
  }
  kvTable(
    bundle.revenueTrend.points.slice(0, 31).map((p) => [
      toWesternDigits(p.periodKey),
      `${formatWesternAmount(p.revenue)} ${currencySymbol}`,
    ])
  );

  section(labels.orderSalesRollup);
  const orderValues = bundle.orderSalesRollup.periods.map((p) =>
    parseDtoAmountForDisplay(p.orderSales)
  );
  let orderMax = 0;
  for (const v of orderValues) if (v > orderMax) orderMax = v;
  orderMax = orderMax || 1;
  ensure(130);
  const oN = orderValues.length;
  if (oN > 0) {
    const barW = Math.max(2, (contentWidth - barGap * oN) / oN);
    const baseY = y + chartH;
    doc.strokeColor("#E2E8F0").moveTo(48, baseY).lineTo(48 + contentWidth, baseY).stroke();
    for (let i = 0; i < oN; i++) {
      const h = (orderValues[i]! / orderMax) * (chartH - 8);
      doc.rect(48 + i * (barW + barGap), baseY - h, barW, h).fill("#0369A1");
    }
    y = baseY + 16;
  }
  kvTable(
    bundle.orderSalesRollup.periods.slice(0, 31).map((p) => [
      toWesternDigits(p.periodKey),
      `${formatWesternAmount(p.orderSales)} ${currencySymbol}`,
    ])
  );

  // Footers on each page
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.font(font).fontSize(8).fillColor("#94A3B8");
    text(labels.generatedBy, 48, doc.page.height - 36, {
      width: contentWidth / 2,
      lineBreak: false,
    });
    doc.text(T(`${i + 1} / ${range.count}`), 48 + contentWidth / 2, doc.page.height - 36, {
      width: contentWidth / 2,
      align: "right",
      lineBreak: false,
    });
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
