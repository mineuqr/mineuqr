/**
 * CASHIER-POST-PAYMENT-PRINT-UX-1
 * Print the paid Cashier invoice from the preserved snapshot.
 * Does not load Settlement Record. Does not require Check.
 * Closing print must not affect PAID.
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
  formatCashierReceiptMoney,
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

export function CashierPaidReceiptDialog({
  open,
  language,
  receipt,
  onOpenChange,
}: Props) {
  const t = (key: Parameters<typeof cashierUiLabel>[0]) =>
    cashierUiLabel(key, language);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md print:max-w-none print:border-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>{t("receiptTitle")}</DialogTitle>
        </DialogHeader>

        {receipt ? (
          <div id="cashier-paid-receipt-print" className="space-y-4 text-sm">
            {receipt.restaurantName ? (
              <p className="text-center text-base font-semibold">
                {receipt.restaurantName}
              </p>
            ) : null}
            <div className="space-y-1 text-center">
              <p className="font-medium">{t("receiptTitle")}</p>
              <p className="text-lg font-semibold tabular-nums tracking-wide">
                {receipt.displayReference}
              </p>
              <p className="text-muted-foreground">{t("paidTitle")}</p>
            </div>

            <div className="space-y-1 border-t pt-3">
              <p className="font-medium">{t("receiptItems")}</p>
              {receipt.lines.length === 0 ? (
                <p>—</p>
              ) : (
                receipt.lines.map((line, idx) => (
                  <div
                    key={`${line.description}-${idx}`}
                    className="flex justify-between gap-2"
                  >
                    <span>
                      {line.quantity}× {line.description}
                    </span>
                    <span className="tabular-nums">
                      {formatCashierReceiptMoney(
                        line.lineTotal,
                        receipt.currencySymbol
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-1 border-t pt-3">
              <div className="flex justify-between text-base font-semibold">
                <span>{t("ticketTotal")}</span>
                <span className="tabular-nums">
                  {formatCashierReceiptMoney(
                    receipt.grandTotal,
                    receipt.currencySymbol
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-1 border-t pt-3">
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
          </div>
        ) : null}

        <div className="flex gap-2 print:hidden">
          <Button
            type="button"
            className="flex-1"
            disabled={!receipt}
            onClick={handlePrint}
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
