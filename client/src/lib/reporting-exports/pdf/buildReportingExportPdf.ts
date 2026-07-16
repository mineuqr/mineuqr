/**
 * REPORTING-EXPORTS-1 — PDF presentation renderer.
 * Layout / text only. Does not calculate Revenue or other KPIs.
 *
 * Labels are English (Helvetica). KPI values are copied from Reporting DTOs.
 * Arabic Excel remains the Unicode-capable export surface.
 */
import {
  formatMoneyDisplay,
  formatNullableCount,
  formatPricingMode,
  resolveExportCurrency,
} from "../format";
import { reportingExportLabels } from "../labels";
import type { RestaurantReportingExportBundle } from "../types";

function pdfEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    // Helvetica is Latin-1; strip unsupported glyphs for restaurant names.
    .replace(/[^\x09\x20-\x7E]/g, "?");
}

function buildLines(
  bundle: RestaurantReportingExportBundle,
  fallbackSymbol: string,
  fallbackCode?: string
): string[] {
  // PDF uses English labels for reliable Helvetica rendering.
  const labels = reportingExportLabels("en");
  const { currencySymbol, currencyCode } = resolveExportCurrency(
    bundle.business,
    fallbackSymbol,
    fallbackCode
  );
  const money = (amount: string) => formatMoneyDisplay(amount, currencySymbol);
  const biz = bundle.business;
  const sales = bundle.orderSales;
  const ops = bundle.operational;
  const catalog = bundle.catalog;

  const lines: string[] = [
    labels.brand,
    bundle.restaurantName,
    `${labels.period}: ${bundle.periodLabel}`,
    "",
    `== ${labels.executive} ==`,
    `${labels.revenue}: ${money(biz.revenue)}`,
    `${labels.orderSalesToday}: ${money(sales.today.orderSales)}`,
    `${labels.orderSalesMonth}: ${money(sales.month.orderSales)}`,
    `${labels.paidChecks}: ${biz.paidCheckCount}`,
    `${labels.averageCheck}: ${money(biz.averageCheck)}`,
    `${labels.averageOrderToday}: ${money(sales.today.averageOrder)}`,
    `${labels.averageOrderMonth}: ${money(sales.month.averageOrder)}`,
    `${labels.sessionsActive}: ${ops.activeSessions}`,
    `${labels.ordersToday}: ${sales.today.totalOrders}`,
    `${labels.ordersMonth}: ${sales.month.totalOrders}`,
    "",
    `== ${labels.financial} ==`,
    `${labels.revenue}: ${money(biz.revenue)}`,
    `${labels.taxCollected}: ${money(biz.taxCollected)}`,
    `${labels.complimentaryCount}: ${biz.complimentaryCount}`,
    `${labels.complimentaryAmount}: ${money(biz.complimentaryAmount)}`,
    `${labels.voidedCount}: ${biz.voidedCount}`,
    `${labels.currency}: ${currencyCode} (${currencySymbol})`,
    `${labels.pricingMode}: ${formatPricingMode(biz, "en")}`,
    "",
    `== ${labels.operational} ==`,
    `${labels.sessionsActive}: ${ops.activeSessions}`,
    `${labels.occupiedTables}: ${ops.occupiedTables}`,
    `${labels.pendingOrders}: ${ops.pendingOrders}`,
    `${labels.kitchenLoad}: ${ops.kitchenLoad}`,
    `${labels.activeOrders}: ${formatNullableCount(ops.activeOrders)}`,
    `${labels.preparingOrders}: ${formatNullableCount(ops.preparingOrders)}`,
    `${labels.readyOrders}: ${formatNullableCount(ops.readyOrders)}`,
    "",
    `== ${labels.catalog} ==`,
    `${labels.categories}: ${catalog.categoryCount}`,
    `${labels.items}: ${catalog.itemCount}`,
    `${labels.menuVisits}: ${catalog.menuVisits}`,
    labels.topSellersNote,
    "",
    `== ${labels.orderSalesRollup} ==`,
  ];

  for (const p of bundle.orderSalesRollup.periods) {
    lines.push(
      `${p.periodKey} | orders=${p.orderCount} | orderSales=${p.orderSales}`
    );
  }

  lines.push("", `== ${labels.revenueTrend} ==`);
  for (const p of bundle.revenueTrend.points) {
    lines.push(
      `${p.periodKey} | revenue=${p.revenue} | paidChecks=${p.paidCheckCount}`
    );
  }

  return lines;
}

export function buildReportingExportPdfBytes(
  bundle: RestaurantReportingExportBundle,
  fallbackCurrencySymbol: string,
  fallbackCurrencyCode?: string
): Uint8Array {
  const lines = buildLines(bundle, fallbackCurrencySymbol, fallbackCurrencyCode);
  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 50;
  const marginTop = 800;
  const lineHeight = 14;
  const linesPerPage = Math.floor((marginTop - 50) / lineHeight);

  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([""]);

  const objects: string[] = [];
  const addObject = (body: string): number => {
    objects.push(body);
    return objects.length;
  };

  const fontObj = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  );

  const pageContentIds: number[] = [];
  for (const pageLines of pages) {
    let stream = "BT\n/F1 10 Tf\n";
    pageLines.forEach((line, idx) => {
      const y = marginTop - idx * lineHeight;
      stream += `1 0 0 1 ${marginLeft} ${y} Tm\n(${pdfEscape(line)}) Tj\n`;
    });
    stream += "ET";
    const content = addObject(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
    );
    pageContentIds.push(content);
  }

  const pageIds: number[] = [];
  for (const contentId of pageContentIds) {
    const pageId = addObject(
      `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontObj} 0 R >> >> >>`
    );
    pageIds.push(pageId);
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
