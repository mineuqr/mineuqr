/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 — Refund confirmation inside Settlement Ledger.
 * Presentation only — amount/tender submitted to checkRefund.applyOnCheck façade.
 */

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  checkRefundErrorMessage,
  mapCheckRefundApiError,
  settlementRecordUiLabel,
  type SettlementRecordLang,
} from "@/lib/settlement-record-presentation";
import { listMonetaryPaymentMethodOptions } from "@/lib/settlementPaymentMethodPresentation";
import { cn } from "@/lib/utils";
import type { SelectablePaymentMethod } from "@shared/operational-session";
import { Loader2 } from "lucide-react";

type SettlementRefundDialogProps = {
  open: boolean;
  language: SettlementRecordLang;
  pending: boolean;
  refundableBalance: string;
  currencySymbol?: string;
  error?: unknown;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: {
    amount: string;
    tenderMethod: SelectablePaymentMethod;
    reason: string | null;
  }) => void;
};

export function SettlementRefundDialog({
  open,
  language,
  pending,
  refundableBalance,
  currencySymbol = "",
  error,
  onOpenChange,
  onConfirm,
}: SettlementRefundDialogProps) {
  const [selected, setSelected] = useState<SelectablePaymentMethod | null>(
    null
  );
  const [amount, setAmount] = useState(refundableBalance);
  const [reason, setReason] = useState("");
  const options = listMonetaryPaymentMethodOptions(language);
  const sym = currencySymbol;
  const errorMessage = error
    ? checkRefundErrorMessage(mapCheckRefundApiError(error), language)
    : null;

  useEffect(() => {
    if (open) {
      setSelected(null);
      setAmount(refundableBalance);
      setReason("");
    }
  }, [open, refundableBalance]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelected(null);
      setAmount(refundableBalance);
      setReason("");
    }
    onOpenChange(next);
  };

  const confirm = () => {
    if (!selected || pending) return;
    onConfirm({
      amount: amount.trim() || refundableBalance,
      tenderMethod: selected,
      reason: reason.trim() || null,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        className="max-w-lg sm:max-w-xl"
        dir={language === "ar" ? "rtl" : "ltr"}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {settlementRecordUiLabel("refundConfirmTitle", language)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {settlementRecordUiLabel("refundConfirmBody", language)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {settlementRecordUiLabel("refundableBalance", language)}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {sym}
              {refundableBalance}
            </p>
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="settlement-refund-amount"
            >
              {settlementRecordUiLabel("refundAmount", language)}
            </label>
            <Input
              id="settlement-refund-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label={settlementRecordUiLabel("refundAmount", language)}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {settlementRecordUiLabel("refundTender", language)}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {options.map((opt) => (
                <Button
                  key={opt.paymentMethod}
                  type="button"
                  variant={
                    selected === opt.paymentMethod ? "default" : "outline"
                  }
                  className={cn("justify-center")}
                  disabled={pending}
                  aria-pressed={selected === opt.paymentMethod}
                  onClick={() => setSelected(opt.paymentMethod)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="settlement-refund-reason"
            >
              {settlementRecordUiLabel("refundReason", language)}
            </label>
            <Input
              id="settlement-refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-label={settlementRecordUiLabel("refundReason", language)}
              disabled={pending}
            />
          </div>

          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {settlementRecordUiLabel("cancel", language)}
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={!selected || pending}
            onClick={confirm}
          >
            {pending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {settlementRecordUiLabel("refundConfirmAction", language)}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
