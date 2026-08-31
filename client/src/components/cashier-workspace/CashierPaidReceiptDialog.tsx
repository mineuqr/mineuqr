/**
 * CASHIER-PAID-RECEIPT-DATA-COMPLETENESS-1
 * CASHIER-PAID-RECEIPT-OVERFLOW-UX-1
 * CASHIER-PAID-RECEIPT-PRINT-ISOLATION-1
 * Print the paid Cashier invoice from the Confirm HTTP projection.
 * Does not load Settlement Record. Does not require Check.
 * Closing print must not affect PAID.
 * On-screen: only the receipt body scrolls; Print/Close stay in the viewport.
 * Print: body-class isolation hides the app shell; receipt uses content height.
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
  formatCashierReceiptMoney,
  printCashierPaidReceipt,
  type CashierPaidReceiptSnapshot,
} from "@/lib/cashier-workspace/cashierPaidReceipt";
import { Printer } from "lucide-react";

type Props = {
  open: boolean;
  language: CashierLang;
  receipt: CashierPaidReceiptSnapshot | null;
  onOpenChange: (open: boolean) => void;
};

function tenderLabel(
  language: CashierLang,
  method: CashierPaidReceiptSnapshot["tenders"][number]["paymentMethod"]
): string {
  if (method === "cash") return cashierUiLabel("tenderCash", language);
  if (method === "card") return cashierUiLabel("tenderNetwork", language);
  return cashierUiLabel("tenderMixed", language);
}

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
          ? "flex justify-between text-base font-semibold text-[#111827]"
          : "flex justify-between text-[#111827]"
      }
    >
      <span>{label}</span>
      <span className="tabular-nums">
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
}: Props) {
  const t = (key: Parameters<typeof cashierUiLabel>[0]) =>
    cashierUiLabel(key, language);
  const when = receipt
    ? formatCashierReceiptDateTime(receipt.paidAt, language)
    : { date: "", time: "" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={language === "ar" ? "rtl" : "ltr"}
        className="flex max-h-[90dvh] max-w-md flex-col overflow-hidden print:static print:top-auto print:left-auto print:h-auto print:max-h-none print:max-w-none print:translate-none print:overflow-visible print:border-0 print:shadow-none"
      >
        <DialogHeader className="shrink-0 print:hidden">
          <DialogTitle>{t("receiptTitle")}</DialogTitle>
        </DialogHeader>

        {receipt ? (
          <div
            id="cashier-paid-receipt-print"
            className="cashier-paid-receipt-document min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain text-sm text-[#111827] print:h-auto print:max-h-none print:flex-none print:overflow-visible"
          >
            {receipt.restaurantName ? (
              <p className="text-center text-base font-semibold">
                {receipt.restaurantName}
              </p>
            ) : null}
            <div className="space-y-1 text-center">
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
              <p className="font-medium">{t("paidTitle")}</p>
            </div>

            <div className="space-y-0.5">
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
              {receipt.terminalId ? (
                <p>
                  {t("terminal")}: {receipt.terminalId}
                </p>
              ) : null}
            </div>

            <div className="space-y-1 border-t border-[#111827] pt-3">
              <div className="grid grid-cols-[minmax(0,1fr)_2.25rem_3.75rem_3.75rem] gap-x-1 border-b border-[#111827] pb-1 text-[11px] font-semibold">
                <span>{t("receiptItems")}</span>
                <span className="text-center">{t("receiptQty")}</span>
                <span className="text-end">{t("receiptUnitPrice")}</span>
                <span className="text-end">{t("ticketTotal")}</span>
              </div>
              {receipt.lines.length === 0 ? (
                <p>—</p>
              ) : (
                receipt.lines.map((line, idx) => (
                  <div
                    key={`${line.nameEn}-${idx}`}
                    className="grid grid-cols-[minmax(0,1fr)_2.25rem_3.75rem_3.75rem] gap-x-1 text-[12px] leading-snug"
                  >
                    <span className="min-w-0 break-words">
                      {itemName(language, line)}
                    </span>
                    <span className="text-center tabular-nums">
                      {line.quantity}
                    </span>
                    <span className="text-end tabular-nums">
                      {formatCashierReceiptMoney(
                        line.unitPrice,
                        receipt.currencySymbol
                      )}
                    </span>
                    <span className="text-end tabular-nums">
                      {formatCashierReceiptMoney(
                        line.lineTotal,
                        receipt.currencySymbol
                      )}
                    </span>
                  </div>
                ))
              )}
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

            <div className="space-y-1 border-t border-[#111827] pt-3">
              <p className="font-medium">{t("paymentMethod")}</p>
              {receipt.tenders.map((tender, idx) => (
                <div
                  key={`${tender.paymentMethod}-${idx}`}
                  className="flex justify-between"
                >
                  <span>{tenderLabel(language, tender.paymentMethod)}</span>
                  <span className="tabular-nums">
                    {formatCashierReceiptMoney(
                      tender.amount,
                      receipt.currencySymbol
                    )}
                  </span>
                </div>
              ))}
            </div>

            <p className="pt-2 text-center font-semibold">
              {t("receiptPaidStamp")}
            </p>
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
