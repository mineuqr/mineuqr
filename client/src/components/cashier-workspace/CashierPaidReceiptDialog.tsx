/**
 * CASHIER-PAID-RECEIPT-DATA-COMPLETENESS-1
 * CASHIER-PAID-RECEIPT-OVERFLOW-UX-1
 * CASHIER-PAID-RECEIPT-PRINT-ISOLATION-1
 * CASHIER-PAID-RECEIPT-RENDER-STABILITY-1
 * SAUDI-TAX-INVOICE-CASHIER-UX-1 — optional Tax Invoice actions (read-only).
 * Print the paid Cashier invoice from the Confirm HTTP projection.
 * Does not load Settlement Record. Does not require Check.
 * Closing print must not affect PAID.
 * On-screen: only the receipt body scrolls; Print/Close stay in the viewport.
 * Print: body-class isolation hides the app shell; receipt uses content height.
 * Screen receipt forces light surface so dark-theme --background cannot paint it black.
 * Operational receipt ≠ Saudi Tax Invoice — Tax Invoice actions stay separate.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cashierUiLabel,
  type CashierLang,
} from "@/lib/cashier-workspace/cashierCopy";
import {
  formatCashierReceiptDateTime,
  formatCashierReceiptLineAmount,
  formatCashierReceiptMoney,
  formatCashierReceiptPaymentMethodLine,
  formatCashierReceiptRestaurantHeading,
  printCashierPaidReceipt,
  type CashierPaidReceiptSnapshot,
} from "@/lib/cashier-workspace/cashierPaidReceipt";
import { FileText, Printer } from "lucide-react";

export type CashierSaudiTaxInvoiceStripState =
  | "hidden"
  | "loading"
  | "ready"
  | "unavailable"
  | "blocked_profile"
  | "failed"
  | "retryable";

type Props = {
  open: boolean;
  language: CashierLang;
  receipt: CashierPaidReceiptSnapshot | null;
  onOpenChange: (open: boolean) => void;
  /** SA only — presentation over persisted Phase 1 Tax Invoice. */
  saudiTaxInvoice?: {
    state: CashierSaudiTaxInvoiceStripState;
    documentTitle: string | null;
    invoiceNumber: string | null;
    onView: () => void;
    onPrint: () => void;
  };
};

function itemName(
  language: CashierLang,
  line: CashierPaidReceiptSnapshot["lines"][number]
): string {
  return language === "ar"
    ? line.nameAr || line.nameEn
    : line.nameEn || line.nameAr;
}

function moneyRow(
  label: string,
  amount: string,
  currencySymbol: string,
  emphasize = false
) {
  return (
    <div
      className={
        emphasize
          ? "flex justify-between gap-2 text-base font-semibold text-[#111827]"
          : "flex justify-between gap-2 text-[#111827]"
      }
    >
      <span className="min-w-0">{label}</span>
      <span className="shrink-0 whitespace-nowrap tabular-nums">
        {formatCashierReceiptMoney(amount, currencySymbol)}
      </span>
    </div>
  );
}

export function CashierPaidReceiptDialog({
  open,
  language,
  receipt,
  onOpenChange,
  saudiTaxInvoice,
}: Props) {
  const t = (key: Parameters<typeof cashierUiLabel>[0]) =>
    cashierUiLabel(key, language);
  const when = receipt
    ? formatCashierReceiptDateTime(receipt.paidAt, language)
    : { date: "", time: "" };
  const sti = saudiTaxInvoice?.state ?? "hidden";
  const showSti = sti !== "hidden";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={language === "ar" ? "rtl" : "ltr"}
        showCloseButton
        className="flex max-h-[90dvh] max-w-md flex-col overflow-hidden border-[#e5e7eb] bg-white text-[#111827] shadow-lg print:static print:top-auto print:left-auto print:h-auto print:max-h-none print:max-w-none print:translate-none print:overflow-visible print:border-0 print:bg-white print:shadow-none"
      >
        <DialogHeader className="shrink-0 print:hidden">
          <DialogTitle className="text-[#111827]">{t("receiptTitle")}</DialogTitle>
        </DialogHeader>

        {receipt ? (
          <div
            id="cashier-paid-receipt-print"
            className="cashier-paid-receipt-document min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-white p-1 text-sm text-[#111827] print:h-auto print:max-h-none print:flex-none print:overflow-visible print:bg-white"
          >
            {receipt.restaurantName ? (
              <p className="cashier-receipt-restaurant-name text-center text-xl font-extrabold leading-tight tracking-tight text-[#111827]">
                {formatCashierReceiptRestaurantHeading(
                  receipt.restaurantName,
                  language
                )}
              </p>
            ) : null}
            <div className="space-y-1 text-center text-[#111827]">
              <p>
                {t("receiptInvoiceNumber")}:{" "}
                {receipt.invoiceNumber?.trim() || receipt.displayReference}
              </p>
              <p>
                {t("receiptOrderNumber")}:{" "}
                {receipt.displayReference !== receipt.orderNumber
                  ? `${receipt.displayReference} · ${receipt.orderNumber}`
                  : receipt.orderNumber}
              </p>
              <p className="font-medium">
                {formatCashierReceiptPaymentMethodLine(
                  receipt.tenders,
                  language
                )}
              </p>
            </div>

            <div className="space-y-0.5 text-[#111827]">
              <p>
                {t("receiptDate")}: {when.date}
              </p>
              <p>
                {t("receiptTime")}: {when.time}
              </p>
              {receipt.cashierDisplayName ? (
                <p>
                  {t("receiptCashier")}: {receipt.cashierDisplayName}
                </p>
              ) : null}
            </div>

            <div className="border-t border-[#111827] pt-3">
              <table className="cashier-receipt-lines w-full table-fixed border-collapse text-xs text-[#111827]">
                <colgroup>
                  <col className="cashier-receipt-col-product" />
                  <col className="cashier-receipt-col-qty" />
                  <col className="cashier-receipt-col-unit" />
                  <col className="cashier-receipt-col-total" />
                  <col className="cashier-receipt-col-numeric-gutter" />
                </colgroup>
                <thead>
                  <tr className="border-b border-[#111827]">
                    <th className="pb-1 text-start font-semibold">
                      {t("receiptItems")}
                    </th>
                    <th className="cashier-receipt-qty pb-1 text-end font-semibold whitespace-nowrap">
                      {t("receiptQty")}
                    </th>
                    <th className="cashier-receipt-unit pb-1 text-end font-semibold whitespace-nowrap">
                      {t("receiptUnitPrice")}
                    </th>
                    <th className="cashier-receipt-line-total pb-1 text-end font-semibold whitespace-nowrap">
                      {t("ticketTotal")}
                    </th>
                    <th
                      className="cashier-receipt-numeric-gutter p-0"
                      aria-hidden="true"
                    />
                  </tr>
                </thead>
                <tbody>
                  {receipt.lines.length === 0 ? (
                    <tr>
                      <td colSpan={5}>—</td>
                    </tr>
                  ) : (
                    receipt.lines.map((line, idx) => (
                      <tr key={`${line.nameEn}-${idx}`} className="align-top">
                        <td className="cashier-receipt-product py-0.5 pe-1 text-start text-sm font-medium leading-tight">
                          {itemName(language, line)}
                        </td>
                        <td className="cashier-receipt-qty py-0.5 text-end whitespace-nowrap tabular-nums">
                          {line.quantity}
                        </td>
                        <td className="cashier-receipt-unit py-0.5 text-end whitespace-nowrap tabular-nums">
                          {formatCashierReceiptLineAmount(line.unitPrice)}
                        </td>
                        <td className="cashier-receipt-line-total py-0.5 text-end whitespace-nowrap tabular-nums">
                          {formatCashierReceiptLineAmount(line.lineTotal)}
                        </td>
                        <td
                          className="cashier-receipt-numeric-gutter p-0"
                          aria-hidden="true"
                        />
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-1 border-t border-[#111827] pt-3">
              {moneyRow(
                t("ticketSubtotal"),
                receipt.subtotal,
                receipt.currencySymbol
              )}
              {moneyRow(
                t("ticketDiscount"),
                receipt.discountAmount,
                receipt.currencySymbol
              )}
              {moneyRow(t("receiptVat"), receipt.taxAmount, receipt.currencySymbol)}
              <div className="border-t border-[#111827] pt-1">
                {moneyRow(
                  t("ticketTotal"),
                  receipt.grandTotal,
                  receipt.currencySymbol,
                  true
                )}
              </div>
            </div>
          </div>
        ) : null}

        {showSti && saudiTaxInvoice ? (
          <div className="shrink-0 space-y-2 border-t border-[#e5e7eb] pt-3 print:hidden">
            {sti === "ready" ? (
              <>
                <p className="text-sm text-[#374151]">
                  {saudiTaxInvoice.documentTitle}
                  {saudiTaxInvoice.invoiceNumber
                    ? ` · ${t("taxInvoiceNumber")}: ${saudiTaxInvoice.invoiceNumber}`
                    : null}
                </p>
                <p className="text-xs text-[#6b7280]">{t("taxInvoiceReadyHint")}</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={saudiTaxInvoice.onView}
                  >
                    <FileText className="me-2 h-4 w-4" />
                    {t("taxInvoiceView")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={saudiTaxInvoice.onPrint}
                  >
                    <Printer className="me-2 h-4 w-4" />
                    {t("taxInvoicePrint")}
                  </Button>
                </div>
              </>
            ) : null}
            {sti === "loading" ? (
              <p className="text-sm text-[#6b7280]">{t("taxInvoicePreparing")}</p>
            ) : null}
            {sti === "unavailable" ||
            sti === "failed" ||
            sti === "retryable" ? (
              <p className="text-sm text-[#6b7280]">{t("taxInvoiceUnavailable")}</p>
            ) : null}
            {sti === "blocked_profile" ? (
              <p className="text-sm text-[#6b7280]">
                {t("taxInvoiceBlockedProfile")}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex shrink-0 gap-2 print:hidden">
          <Button
            type="button"
            className="flex-1"
            disabled={!receipt}
            onClick={() => printCashierPaidReceipt()}
          >
            <Printer className="me-2 h-4 w-4" />
            {t("printInvoice")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {t("receiptClose")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
