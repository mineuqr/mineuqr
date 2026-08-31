/**
 * SAUDI-TAX-INVOICE-CASHIER-UX-1
 * Cashier presentation over persisted Phase 1 Tax Invoice documents.
 * Does not generate, classify, or recalculate tax.
 */

import type { SaudiPhase1Document } from "@shared/compliance";

export type CashierSaudiTaxInvoiceViewModel = Readonly<{
  taxInvoiceId: string;
  invoiceNumber: string;
  titleAr: string;
  titleEn: string;
  invoiceForm: SaudiPhase1Document["invoiceForm"];
  issueTimestampIso: string;
  sellerLegalName: string;
  sellerVatNumber: string;
  sellerAddress: string;
  buyerLabelAr: string;
  buyerLabelEn: string;
  buyerVatNumber: string | null;
  lines: readonly Readonly<{
    nameAr: string;
    nameEn: string;
    quantity: number;
    unitPrice: string;
    lineAmount: string;
  }>[];
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  amount: string;
  currencyCode: string;
  qrRequired: boolean;
  qrPayloadBase64: string | null;
  status: string;
}>;

export function mapSaudiPhase1DocumentToCashierView(
  document: SaudiPhase1Document,
  status: string
): CashierSaudiTaxInvoiceViewModel {
  const buyerLabelAr =
    document.buyer.kind === "anonymous_cash"
      ? "نقدًا"
      : document.buyer.displayName;
  const buyerLabelEn =
    document.buyer.kind === "anonymous_cash"
      ? "Cash"
      : document.buyer.displayName;

  return {
    taxInvoiceId: document.taxInvoiceId,
    invoiceNumber: document.invoiceNumber,
    titleAr: document.titles.ar,
    titleEn: document.titles.en,
    invoiceForm: document.invoiceForm,
    issueTimestampIso: document.issueTimestampIso,
    sellerLegalName: document.seller.legalName ?? "",
    sellerVatNumber: document.seller.vatNumber ?? "",
    sellerAddress: document.seller.registeredAddress ?? "",
    buyerLabelAr,
    buyerLabelEn,
    buyerVatNumber: document.buyerVatNumberDisplayed,
    lines: document.lines.orderLines.map((line) => ({
      nameAr: line.nameAr,
      nameEn: line.nameEn ?? "",
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineAmount: line.lineAmount,
    })),
    subtotal: document.monetary.subtotal,
    discountAmount: document.monetary.discountAmount,
    taxAmount: document.monetary.taxAmount,
    amount: document.monetary.amount,
    currencyCode: document.monetary.currencyCode,
    qrRequired: document.qrRequired,
    qrPayloadBase64: document.qrPayloadBase64,
    status,
  };
}

export const CASHIER_SAUDI_TAX_INVOICE_PRINT_ROOT_ID =
  "cashier-saudi-tax-invoice-print" as const;

export const CASHIER_SAUDI_TAX_INVOICE_PRINT_BODY_CLASS =
  "printing-cashier-saudi-tax-invoice" as const;

/** Match established Cashier thermal width (~72.1mm / ~80mm class). */
export const CASHIER_SAUDI_TAX_INVOICE_PAPER_WIDTH_MM = 72.1;
export const CASHIER_SAUDI_TAX_INVOICE_PAPER_HEIGHT_MM = 180;

const PAGE_STYLE_ID = "cashier-saudi-tax-invoice-print-page-style" as const;

function installPageStyle(): HTMLStyleElement {
  const existing = document.getElementById(PAGE_STYLE_ID);
  if (existing) existing.remove();
  const style = document.createElement("style");
  style.id = PAGE_STYLE_ID;
  style.textContent = `
@media print {
  @page {
    size: ${CASHIER_SAUDI_TAX_INVOICE_PAPER_WIDTH_MM}mm ${CASHIER_SAUDI_TAX_INVOICE_PAPER_HEIGHT_MM}mm;
    margin: 0;
  }
}
`.trim();
  document.head.appendChild(style);
  return style;
}

/** Print isolation — same pattern as operational paid receipt. Does not create Tax Invoice. */
export function printCashierSaudiTaxInvoice(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const body = document.body;
  body.classList.add(CASHIER_SAUDI_TAX_INVOICE_PRINT_BODY_CLASS);
  const pageStyle = installPageStyle();
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    body.classList.remove(CASHIER_SAUDI_TAX_INVOICE_PRINT_BODY_CLASS);
    pageStyle.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  window.setTimeout(cleanup, 2_000);
}
