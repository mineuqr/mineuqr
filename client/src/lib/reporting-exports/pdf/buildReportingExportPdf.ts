/**
 * REPORTING-EXPORT-TEMPLATES-1 — Enterprise PDF presentation template.
 * Layout / typography / static charts only. Does not calculate Revenue or other KPIs.
 *
 * Uses Helvetica (Latin-1 safe). Non-Latin glyphs in restaurant names are substituted.
 * Arabic Excel remains the primary Unicode export surface; PDF labels follow bundle language
 * when Latin-safe, otherwise English fallbacks for glyph reliability.
 */
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

type PdfOp = string;

function pdfEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x09\x20-\x7E]/g, "?");
}

function safeLabel(
  bundleLang: RestaurantReportingExportBundle["language"],
  ar: string,
  en: string
): string {
  // Helvetica cannot render Arabic — always emit English for PDF text operators.
  void bundleLang;
  void ar;
  return en;
}

function maxOf(values: readonly number[]): number {
  let max = 0;
  for (const v of values) {
    if (v > max) max = v;
  }
  return max;
}

function sumWidths(colWidths: readonly number[]): number {
  let total = 0;
  for (const w of colWidths) total += w;
  return total;
}

class PdfDocumentBuilder {
  private readonly pageWidth = 595;
  private readonly pageHeight = 842;
  private readonly margin = 48;
  private readonly pages: PdfOp[][] = [[]];
  private y = 794;
  private readonly lineHeight = 14;

  private get ops(): PdfOp[] {
    return this.pages[this.pages.length - 1]!;
  }

  private ensureSpace(needed: number) {
    if (this.y - needed < 64) {
      this.pages.push([]);
      this.y = 794;
    }
  }

  text(
    value: string,
    options?: { size?: number; bold?: boolean; color?: string; x?: number }
  ) {
    this.ensureSpace(options?.size ?? 11);
    const size = options?.size ?? 10;
    const x = options?.x ?? this.margin;
    const color = options?.color ?? "0 0 0";
    const font = options?.bold ? "/F2" : "/F1";
    this.ops.push("BT");
    this.ops.push(`${color} rg`);
    this.ops.push(`${font} ${size} Tf`);
    this.ops.push(`1 0 0 1 ${x} ${this.y} Tm`);
    this.ops.push(`(${pdfEscape(value)}) Tj`);
    this.ops.push("ET");
    this.y -= size + 4;
  }

  gap(px = 8) {
    this.y -= px;
  }

  hrule() {
    this.ensureSpace(10);
    this.ops.push("0.82 0.86 0.9 RG");
    this.ops.push("1 w");
    this.ops.push(
      `${this.margin} ${this.y} m ${this.pageWidth - this.margin} ${this.y} l S`
    );
    this.y -= 12;
  }

  sectionTitle(title: string) {
    this.ensureSpace(28);
    this.gap(6);
    this.text(title, { size: 14, bold: true, color: "0.05 0.3 0.28" });
    this.hrule();
  }

  kv(label: string, value: string) {
    this.ensureSpace(16);
    this.text(`${label}: ${toWesternDigits(value)}`, { size: 10 });
  }

  table(
    headers: string[],
    rows: ReadonlyArray<ReadonlyArray<string>>,
    colWidths: number[]
  ) {
    const startX = this.margin;
    const rowH = 16;
    this.ensureSpace(rowH * (rows.length + 2) + 8);

    const drawRow = (cells: string[], header: boolean) => {
      let x = startX;
      if (header) {
        this.ops.push("0.04 0.23 0.27 rg");
        this.ops.push(
          `${startX} ${this.y - 3} ${sumWidths(colWidths)} ${rowH} re f`
        );
      }
      cells.forEach((cell, i) => {
        const color = header ? "1 1 1" : "0.12 0.16 0.22";
        this.ops.push("BT");
        this.ops.push(`${color} rg`);
        this.ops.push(`${header ? "/F2" : "/F1"} 8 Tf`);
        this.ops.push(`1 0 0 1 ${x + 3} ${this.y} Tm`);
        this.ops.push(`(${pdfEscape(toWesternDigits(cell))}) Tj`);
        this.ops.push("ET");
        x += colWidths[i] ?? 80;
      });
      this.ops.push("0.88 0.91 0.94 RG");
      this.ops.push("0.5 w");
      this.ops.push(
        `${startX} ${this.y - 4} m ${startX + sumWidths(colWidths)} ${this.y - 4} l S`
      );
      this.y -= rowH;
    };

    drawRow(headers, true);
    rows.forEach((r, idx) => {
      if (idx % 2 === 1) {
        this.ops.push("0.97 0.98 0.99 rg");
        this.ops.push(
          `${startX} ${this.y - 3} ${sumWidths(colWidths)} ${rowH} re f`
        );
      }
      drawRow(r, false);
    });
    this.gap(8);
  }

  /** Static bar chart from DTO series (presentation scaling only). */
  barChart(title: string, categories: readonly string[], values: readonly number[]) {
    if (categories.length === 0) return;
    const chartH = 120;
    const chartW = this.pageWidth - this.margin * 2;
    this.ensureSpace(chartH + 36);
    this.text(title, { size: 11, bold: true, color: "0.05 0.3 0.28" });

    const max = maxOf(values) || 1;
    const n = values.length;
    const barGap = 4;
    const barW = Math.max(2, (chartW - barGap * n) / n);
    const baseY = this.y - chartH;

    this.ops.push("0.88 0.91 0.94 RG");
    this.ops.push("1 w");
    this.ops.push(
      `${this.margin} ${baseY} m ${this.margin + chartW} ${baseY} l S`
    );

    for (let i = 0; i < n; i++) {
      const h = (values[i]! / max) * (chartH - 10);
      const x = this.margin + i * (barW + barGap);
      this.ops.push("0.05 0.58 0.53 rg");
      this.ops.push(`${x} ${baseY} ${barW} ${h} re f`);
    }

    this.y = baseY - 18;
    if (n <= 12) {
      for (let i = 0; i < n; i++) {
        const x = this.margin + i * (barW + barGap);
        this.ops.push("BT");
        this.ops.push("0.4 0.45 0.5 rg");
        this.ops.push("/F1 6 Tf");
        this.ops.push(`1 0 0 1 ${x} ${this.y} Tm`);
        this.ops.push(`(${pdfEscape((categories[i] ?? "").slice(-5))}) Tj`);
        this.ops.push("ET");
      }
    }
    this.y -= 14;
  }

  build(): Uint8Array {
    const objects: string[] = [];
    const addObject = (body: string): number => {
      objects.push(body);
      return objects.length;
    };

    const fontRegular = addObject(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    );
    const fontBold = addObject(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
    );

    const pageContentIds: number[] = [];
    this.pages.forEach((pageOps, pageIndex) => {
      const pageNo = pageIndex + 1;
      const total = this.pages.length;
      const footerY = 36;
      const footer = [
        "BT",
        "0.45 0.5 0.55 rg",
        "/F1 8 Tf",
        `1 0 0 1 ${this.margin} ${footerY} Tm`,
        `(${pdfEscape("Generated by MineuQR")}) Tj`,
        "ET",
        "BT",
        "0.45 0.5 0.55 rg",
        "/F1 8 Tf",
        `1 0 0 1 ${this.pageWidth - this.margin - 70} ${footerY} Tm`,
        `(${pdfEscape(`Page ${pageNo} of ${total}`)}) Tj`,
        "ET",
      ];
      const stream = [...pageOps, ...footer].join("\n");
      pageContentIds.push(
        addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
      );
    });

    const pageIds: number[] = [];
    for (const contentId of pageContentIds) {
      pageIds.push(
        addObject(
          `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> >>`
        )
      );
    }

    const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
    const pagesId = addObject(
      `<< /Type /Pages /Kids [ ${kids} ] /Count ${pageIds.length} >>`
    );
    for (let i = 0; i < pageIds.length; i++) {
      const idx = pageIds[i]! - 1;
      objects[idx] = objects[idx]!.replace(
        "/Parent 0 0 R",
        `/Parent ${pagesId} 0 R`
      );
    }
    const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    const encoder = new TextEncoder();
    const byteLen = (s: string) => encoder.encode(s).length;
    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];
    for (let i = 0; i < objects.length; i++) {
      offsets.push(byteLen(pdf));
      pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefOffset = byteLen(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i <= objects.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;
    return encoder.encode(pdf);
  }
}

export function buildReportingExportPdfBytes(
  bundle: RestaurantReportingExportBundle,
  fallbackCurrencySymbol: string,
  fallbackCurrencyCode?: string
): Uint8Array {
  const en = reportingExportLabels("en");
  const ar = reportingExportLabels("ar");
  const L = (key: keyof typeof en) =>
    safeLabel(bundle.language, ar[key], en[key]);

  const { currencySymbol, currencyCode } = resolveExportCurrency(
    bundle.business,
    fallbackCurrencySymbol,
    fallbackCurrencyCode
  );
  const money = (amount: string) => formatMoneyDisplay(amount, currencySymbol);
  const biz = bundle.business;
  const sales = bundle.orderSales;
  const ops = bundle.operational;
  const catalog = bundle.catalog;
  const reportTitle =
    bundle.reportTitle?.trim() ||
    safeLabel(bundle.language, ar.reportTitleDefault, en.reportTitleDefault);

  const doc = new PdfDocumentBuilder();

  // Cover / header
  doc.text(L("brand"), { size: 11, bold: true, color: "0.05 0.58 0.53" });
  doc.text(bundle.restaurantName || "Restaurant", { size: 18, bold: true });
  doc.text(reportTitle, { size: 14, bold: true, color: "0.06 0.09 0.16" });
  doc.gap(4);
  doc.kv(L("period"), toWesternDigits(bundle.periodLabel));
  doc.kv(L("generated"), formatExportDateTime(new Date(), bundle.language));
  doc.kv(L("currency"), `${currencyCode} (${currencySymbol})`);
  doc.kv(L("pricingMode"), formatPricingMode(biz, "en"));
  doc.kv(L("taxPolicy"), formatTaxPolicySummary(biz, "en"));
  doc.gap(4);
  doc.text(L("revenueVsOrderSales"), { size: 9, color: "0.3 0.35 0.4" });
  doc.hrule();

  // Executive
  doc.sectionTitle(L("executive"));
  doc.table(
    [L("metric"), L("value")],
    [
      [L("revenue"), money(biz.revenue)],
      [L("orderSalesMonth"), money(sales.month.orderSales)],
      [L("paidChecks"), toWesternDigits(String(biz.paidCheckCount))],
      [L("averageCheck"), money(biz.averageCheck)],
      [L("averageOrderMonth"), money(sales.month.averageOrder)],
      [L("sessionsActive"), toWesternDigits(String(ops.activeSessions))],
      [L("ordersMonth"), toWesternDigits(String(sales.month.totalOrders))],
      [L("orderSalesToday"), money(sales.today.orderSales)],
      [L("ordersToday"), toWesternDigits(String(sales.today.totalOrders))],
    ],
    [220, 260]
  );

  // Financial
  doc.sectionTitle(L("financial"));
  doc.table(
    [L("metric"), L("value")],
    [
      [L("revenue"), money(biz.revenue)],
      [L("taxCollected"), money(biz.taxCollected)],
      [L("complimentaryCount"), String(biz.complimentaryCount)],
      [L("complimentaryAmount"), money(biz.complimentaryAmount)],
      [L("voidedCount"), String(biz.voidedCount)],
      [L("currency"), `${currencyCode} (${currencySymbol})`],
      [L("pricingMode"), formatPricingMode(biz, "en")],
      [L("taxPolicy"), formatTaxPolicySummary(biz, "en")],
      [L("orderSales"), money(sales.month.orderSales)],
    ],
    [220, 260]
  );

  // Operational
  doc.sectionTitle(L("operational"));
  doc.table(
    [L("metric"), L("value")],
    [
      [L("sessionsActive"), String(ops.activeSessions)],
      [L("occupiedTables"), String(ops.occupiedTables)],
      [L("pendingOrders"), String(ops.pendingOrders)],
      [L("kitchenLoad"), String(ops.kitchenLoad)],
      [L("activeOrders"), formatNullableCount(ops.activeOrders)],
      [L("preparingOrders"), formatNullableCount(ops.preparingOrders)],
      [L("readyOrders"), formatNullableCount(ops.readyOrders)],
    ],
    [220, 260]
  );

  // Catalog
  doc.sectionTitle(L("catalog"));
  doc.table(
    [L("metric"), L("value")],
    [
      [L("categories"), String(catalog.categoryCount)],
      [L("items"), String(catalog.itemCount)],
      [L("menuVisits"), String(catalog.menuVisits)],
    ],
    [220, 260]
  );
  doc.text(L("catalogPlaceholderTitle"), { size: 11, bold: true });
  doc.text(L("catalogPlaceholderBody"), { size: 9, color: "0.3 0.35 0.4" });
  doc.text(L("topSellersNote"), { size: 9, color: "0.3 0.35 0.4" });

  // Charts from Reporting DTOs
  doc.sectionTitle(L("revenueTrend"));
  doc.barChart(
    L("chartRevenueTrend"),
    bundle.revenueTrend.points.map((p) => toWesternDigits(p.periodKey)),
    bundle.revenueTrend.points.map((p) => parseDtoAmountForDisplay(p.revenue))
  );
  doc.table(
    [L("periodKey"), L("paidCheckCount"), L("revenue"), L("taxCollected")],
    bundle.revenueTrend.points.map((p) => [
      toWesternDigits(p.periodKey),
      toWesternDigits(String(p.paidCheckCount)),
      toWesternDigits(p.revenue),
      toWesternDigits(p.taxCollected),
    ]),
    [100, 90, 120, 120]
  );

  doc.sectionTitle(L("orderSalesRollup"));
  doc.barChart(
    L("chartOrderTrend"),
    bundle.orderSalesRollup.periods.map((p) => toWesternDigits(p.periodKey)),
    bundle.orderSalesRollup.periods.map((p) =>
      parseDtoAmountForDisplay(p.orderSales)
    )
  );
  doc.table(
    [L("periodKey"), L("orderCount"), L("completedOrders"), L("orderSales")],
    bundle.orderSalesRollup.periods.map((p) => [
      toWesternDigits(p.periodKey),
      toWesternDigits(String(p.orderCount)),
      toWesternDigits(String(p.completedOrders)),
      toWesternDigits(p.orderSales),
    ]),
    [100, 90, 110, 120]
  );

  return doc.build();
}

export function buildReportingExportPdfBlob(
  bundle: RestaurantReportingExportBundle,
  fallbackCurrencySymbol: string,
  fallbackCurrencyCode?: string
): Blob {
  const bytes = buildReportingExportPdfBytes(
    bundle,
    fallbackCurrencySymbol,
    fallbackCurrencyCode
  );
  return new Blob([bytes], { type: "application/pdf" });
}
