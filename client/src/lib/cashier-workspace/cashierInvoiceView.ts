/**
 * CASHIER-SALE-INVOICE-UX-REALIGNMENT-1
 * CASHIER-PASS-2-BOUNDARY-COMPLIANCE-AND-HARDENING-1
 * Presentation-only Cashier invoice view. Not a DB entity, Check, or
 * Collection Fact. Draft money is a display preview. Prepared lines come
 * from pos.sale.create. Prepared payable money is computeCheckMoney on
 * those lines plus the frozen bill discount (same engine as Confirm freeze).
 * Customer-facing invoice number/date/time are paidReceipt only.
 */

import { projectCashierSaleInvoiceMoney } from "@shared/operational-session";
import type { TaxPolicySnapshot } from "@shared/operational-session";

export type CashierInvoiceStage = "draft" | "prepared" | "paid";

export type CashierInvoiceLineView = Readonly<{
  key: string;
  nameAr: string;
  nameEn: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  menuItemId: number | null;
}>;

export type CashierInvoiceMoneyView = Readonly<{
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  grandTotal: string;
}>;

export type CashierInvoiceView = Readonly<{
  stage: CashierInvoiceStage;
  editable: boolean;
  displayReference: string | null;
  orderId: number | null;
  orderNumber: string | null;
  createdAt: string | null;
  cashierDisplayName: string;
  terminalId: string | null;
  lines: readonly CashierInvoiceLineView[];
  money: CashierInvoiceMoneyView | null;
}>;

export type CashierSaleCreateLine = Readonly<{
  description: string;
  quantity: number;
  netAmount: string;
  originOrderItemId: number | null;
}>;

export type CashierSaleCreateMoney = Readonly<{
  subtotal: string;
  taxAmount: string;
  grandTotal: string;
  billDiscountAmount: string;
}>;

export type CashierDraftCatalogLine = Readonly<{
  menuItemId: number;
  nameAr: string;
  nameEn: string | null;
  price: string;
  quantity: number;
}>;

function parseCents(value: string): number | null {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const whole = Number(match[1]);
  const frac = (match[2] ?? "").padEnd(2, "0");
  if (!Number.isSafeInteger(whole)) return null;
  return whole * 100 + Number(frac);
}

function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Presentational unit price from a server line total. Not a second invoice total. */
export function unitPriceFromLineTotal(
  lineTotal: string,
  quantity: number
): string {
  if (!Number.isInteger(quantity) || quantity <= 0) return lineTotal.trim();
  const cents = parseCents(lineTotal);
  if (cents == null) return lineTotal.trim();
  return fromCents(Math.trunc(cents / quantity));
}

export function buildDraftCashierInvoiceView(input: {
  ticket: readonly CashierDraftCatalogLine[];
  previewMoney: CashierInvoiceMoneyView | null;
  cashierDisplayName: string;
  terminalId: string | null;
}): CashierInvoiceView {
  return {
    stage: "draft",
    editable: true,
    displayReference: null,
    orderId: null,
    orderNumber: null,
    createdAt: null,
    cashierDisplayName: input.cashierDisplayName,
    terminalId: input.terminalId,
    lines: input.ticket.map((line) => {
      const cents = parseCents(line.price);
      const lineTotal =
        cents != null && Number.isInteger(line.quantity) && line.quantity >= 0
          ? fromCents(cents * line.quantity)
          : line.price;
      return {
        key: `draft-${line.menuItemId}`,
        nameAr: line.nameAr,
        nameEn: line.nameEn?.trim() ? line.nameEn : line.nameAr,
        quantity: line.quantity,
        unitPrice: line.price,
        lineTotal,
        menuItemId: line.menuItemId,
      };
    }),
    money: input.previewMoney,
  };
}

export function catalogTicketFromInvoiceLines(
  lines: readonly CashierInvoiceLineView[]
): CashierDraftCatalogLine[] {
  const ticket: CashierDraftCatalogLine[] = [];
  for (const line of lines) {
    if (line.menuItemId == null) continue;
    ticket.push({
      menuItemId: line.menuItemId,
      nameAr: line.nameAr,
      nameEn: line.nameEn,
      price: line.unitPrice,
      quantity: line.quantity,
    });
  }
  return ticket;
}

export function cashierCatalogTicketMatchesInvoiceLines(
  ticket: readonly CashierDraftCatalogLine[],
  lines: readonly CashierInvoiceLineView[]
): boolean {
  const fromLines = catalogTicketFromInvoiceLines(lines);
  if (ticket.length === 0 || ticket.length !== fromLines.length) return false;
  const keyOf = (rows: readonly CashierDraftCatalogLine[]) =>
    [...rows]
      .map(
        (row) =>
          `${row.menuItemId}:${row.quantity}:${moneyKey(row.price)}`
      )
      .sort()
      .join("|");
  return keyOf(ticket) === keyOf(fromLines);
}

export type CashierSaleAttemptLine = Readonly<{
  menuItemId: number;
  quantity: number;
}>;

/** Same composition the client last sent to pos.sale.create (retry / lost response). */
export function cashierTicketMatchesSaleAttempt(
  ticket: readonly Pick<CashierDraftCatalogLine, "menuItemId" | "quantity">[],
  attempt: readonly CashierSaleAttemptLine[]
): boolean {
  if (ticket.length === 0 || ticket.length !== attempt.length) return false;
  const keyOf = (
    rows: readonly Pick<CashierDraftCatalogLine, "menuItemId" | "quantity">[]
  ) =>
    [...rows]
      .map((row) => `${row.menuItemId}:${row.quantity}`)
      .sort()
      .join("|");
  return keyOf(ticket) === keyOf(attempt);
}

function moneyKey(value: string): string {
  const cents = parseCents(value);
  return cents == null ? value.trim() : String(cents);
}

export function chargesSubtotalFromInvoiceLines(
  lines: readonly CashierInvoiceLineView[]
): string | null {
  if (lines.length === 0) return null;
  let cents = 0;
  for (const line of lines) {
    const lineCents = parseCents(line.lineTotal);
    if (lineCents == null) return null;
    cents += lineCents;
  }
  return fromCents(cents);
}

/**
 * Payable prepared-invoice money. Reuses projectCashierSaleInvoiceMoney /
 * computeCheckMoney. Not a second tax engine. Not Collection Fact.
 */
export function projectPreparedCashierInvoiceMoney(input: {
  lines: readonly CashierInvoiceLineView[];
  billDiscountAmount: string;
  taxPolicySnapshot: TaxPolicySnapshot;
}): CashierInvoiceMoneyView | null {
  const chargesSubtotal = chargesSubtotalFromInvoiceLines(input.lines);
  if (chargesSubtotal == null) return null;
  const projected = projectCashierSaleInvoiceMoney({
    chargesSubtotal,
    billDiscountAmount: input.billDiscountAmount,
    taxPolicySnapshot: input.taxPolicySnapshot,
  });
  return {
    subtotal: projected.subtotal,
    discountAmount: projected.billDiscountAmount,
    taxAmount: projected.taxAmount,
    grandTotal: projected.grandTotal,
  };
}

export function toCashierSaleCreateMoney(
  money: CashierInvoiceMoneyView
): CashierSaleCreateMoney {
  return {
    subtotal: money.subtotal,
    taxAmount: money.taxAmount,
    grandTotal: money.grandTotal,
    billDiscountAmount: money.discountAmount,
  };
}

export function mapSaleCreateLinesToInvoiceLines(
  lines: readonly CashierSaleCreateLine[],
  draftNames: readonly CashierDraftCatalogLine[] = []
): CashierInvoiceLineView[] {
  return lines.map((line, index) => {
    const draft = draftNames[index];
    const nameAr = draft?.nameAr?.trim() || line.description;
    const nameEn = draft?.nameEn?.trim() || line.description;
    return {
      key: `prepared-${line.originOrderItemId ?? index}`,
      nameAr,
      nameEn,
      quantity: line.quantity,
      unitPrice: unitPriceFromLineTotal(line.netAmount, line.quantity),
      lineTotal: line.netAmount,
      menuItemId: draft?.menuItemId ?? null,
    };
  });
}

export function buildPreparedCashierInvoiceView(input: {
  orderId: number;
  orderNumber: string;
  displayReference: string;
  createdAt: string;
  money: CashierSaleCreateMoney;
  lines: readonly CashierInvoiceLineView[];
  cashierDisplayName: string;
  terminalId: string | null;
}): CashierInvoiceView {
  return {
    stage: "prepared",
    editable: false,
    displayReference: null,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    createdAt: null,
    cashierDisplayName: input.cashierDisplayName,
    terminalId: input.terminalId,
    lines: input.lines,
    money: {
      subtotal: input.money.subtotal,
      discountAmount: input.money.billDiscountAmount,
      taxAmount: input.money.taxAmount,
      grandTotal: input.money.grandTotal,
    },
  };
}
