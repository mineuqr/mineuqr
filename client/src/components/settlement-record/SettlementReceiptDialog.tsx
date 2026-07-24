/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — Customer Receipt from Settlement Record.
 */

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  mapSettlementRecordApiError,
  settlementRecordErrorMessage,
  settlementRecordUiLabel,
  toSettlementReceiptViewModel,
  useSettlementRecordReceipt,
  type SettlementRecordLang,
} from "@/lib/settlement-record-presentation";
import { Loader2, Printer } from "lucide-react";

type SettlementReceiptDialogProps = {
  open: boolean;
  restaurantId: number;
  settlementRecordId: string | null;
  language: SettlementRecordLang;
  restaurantName?: string;
  onOpenChange: (open: boolean) => void;
};

export function SettlementReceiptDialog({
  open,
  restaurantId,
  settlementRecordId,
  language,
  restaurantName,
  onOpenChange,
}: SettlementReceiptDialogProps) {
  const query = useSettlementRecordReceipt(
    {
      restaurantId,
      settlementRecordId: settlementRecordId ?? "",
    },
    { enabled: open && !!settlementRecordId }
  );

  const vm = useMemo(
    () => (query.data ? toSettlementReceiptViewModel(query.data, language) : null),
    [query.data, language]
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md print:max-w-none print:border-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>
            {settlementRecordUiLabel("receiptTitle", language)}
          </DialogTitle>
        </DialogHeader>

        {query.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {settlementRecordUiLabel("loading", language)}
          </div>
        ) : null}

        {query.error ? (
          <p className="text-sm text-destructive">
            {settlementRecordErrorMessage(
              mapSettlementRecordApiError(query.error),
              language
            )}
          </p>
        ) : null}

        {vm ? (
          <div id="settlement-receipt-print" className="space-y-4 text-sm">
            {restaurantName ? (
              <p className="text-center text-base font-semibold">{restaurantName}</p>
            ) : null}
            <div className="space-y-1 text-center">
              <p className="font-medium">
                {settlementRecordUiLabel("receiptTitle", language)}
              </p>
              <p className="text-muted-foreground">{vm.settlementNumber}</p>
              <p className="text-muted-foreground">{vm.settlementTimeLabel}</p>
              <p className="text-muted-foreground">{vm.statusLabel}</p>
            </div>

            {vm.orders.length > 0 ? (
              <div className="space-y-1 border-t pt-3">
                <p className="font-medium">
                  {settlementRecordUiLabel("orders", language)}
                </p>
                {vm.orders.map((o) => (
                  <p key={o.orderId}>{o.label}</p>
                ))}
              </div>
            ) : null}

            <div className="space-y-1 border-t pt-3">
              <p className="font-medium">
                {settlementRecordUiLabel("items", language)}
              </p>
              {vm.items.length === 0 ? (
                <p>—</p>
              ) : (
                vm.items.map((item, idx) => (
                  <div key={`${item.name}-${idx}`} className="flex justify-between gap-2">
                    <span>
                      {item.quantity}× {item.name}
                    </span>
                    <span className="tabular-nums">{item.unitPriceLabel}</span>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-1 border-t pt-3">
              <div className="flex justify-between">
                <span>{settlementRecordUiLabel("subtotal", language)}</span>
                <span className="tabular-nums">{vm.financial.subtotalLabel}</span>
              </div>
              <div className="flex justify-between">
                <span>{settlementRecordUiLabel("discount", language)}</span>
                <span className="tabular-nums">{vm.financial.discountLabel}</span>
              </div>
              <div className="flex justify-between">
                <span>{settlementRecordUiLabel("taxAmount", language)}</span>
                <span className="tabular-nums">{vm.financial.taxLabel}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>{settlementRecordUiLabel("grandTotal", language)}</span>
                <span className="tabular-nums">{vm.grandTotalLabel}</span>
              </div>
            </div>

            <div className="space-y-1 border-t pt-3">
              <p className="font-medium">
                {settlementRecordUiLabel("payments", language)}
              </p>
              {vm.payments.map((p, idx) => (
                <div key={`${p.methodLabel}-${idx}`} className="flex justify-between">
                  <span>{p.methodLabel}</span>
                  <span className="tabular-nums">{p.amountLabel}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 print:hidden">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={!vm}
            onClick={handlePrint}
          >
            <Printer className="me-2 h-4 w-4" />
            {settlementRecordUiLabel("printReceipt", language)}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {settlementRecordUiLabel("close", language)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
