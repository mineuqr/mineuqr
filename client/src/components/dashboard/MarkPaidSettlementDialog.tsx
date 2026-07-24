/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — Register Payment dialog.
 * Layout: Outstanding → Methods → Amount Paid → Remaining → [Register Payment]
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
  computeRemainingDisplay,
  settlementRecordUiLabel,
  type SettlementRecordLang,
} from "@/lib/settlement-record-presentation";
import {
  listMonetaryPaymentMethodOptions,
  singleTenderSettlements,
} from "@/lib/settlementPaymentMethodPresentation";
import { cn } from "@/lib/utils";
import type { MonetaryPaymentMethod, StaffSettlementLineInput } from "@shared/operational-session";
import { Loader2 } from "lucide-react";

type MarkPaidSettlementDialogProps = {
  open: boolean;
  language: SettlementRecordLang;
  pending: boolean;
  /** Check grandTotal — outstanding amount (financial SSOT display). */
  outstandingAmount: string;
  currencySymbol?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (settlements: readonly StaffSettlementLineInput[]) => void;
};

export function MarkPaidSettlementDialog({
  open,
  language,
  pending,
  outstandingAmount,
  currencySymbol = "",
  onOpenChange,
  onConfirm,
}: MarkPaidSettlementDialogProps) {
  const [selected, setSelected] = useState<MonetaryPaymentMethod | null>(null);
  const [amountPaid, setAmountPaid] = useState(outstandingAmount);
  const options = listMonetaryPaymentMethodOptions(language);
  const remaining = computeRemainingDisplay(outstandingAmount, amountPaid);
  const sym = currencySymbol;

  useEffect(() => {
    if (open) {
      setSelected(null);
      setAmountPaid(outstandingAmount);
    }
  }, [open, outstandingAmount]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelected(null);
      setAmountPaid(outstandingAmount);
    }
    onOpenChange(next);
  };

  const confirm = () => {
    if (!selected || pending) return;
    // Single tender — domain fills Check grandTotal when amount omitted.
    onConfirm(singleTenderSettlements(selected));
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {settlementRecordUiLabel("registerPayment", language)}
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            {settlementRecordUiLabel("registerPayment", language)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {settlementRecordUiLabel("outstanding", language)}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {sym}
              {outstandingAmount}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {settlementRecordUiLabel("paymentMethods", language)}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {options.map((opt) => {
                const active = selected === opt.paymentMethod;
                return (
                  <Button
                    key={opt.paymentMethod}
                    type="button"
                    variant={active ? "default" : "outline"}
                    disabled={pending}
                    className={cn(
                      "h-12 touch-manipulation text-sm font-semibold sm:h-14",
                      active && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                    onClick={() => setSelected(opt.paymentMethod)}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="amount-paid">
                {settlementRecordUiLabel("amountPaid", language)}
              </label>
              <Input
                id="amount-paid"
                inputMode="decimal"
                value={amountPaid}
                disabled={pending}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">
                {settlementRecordUiLabel("remaining", language)}
              </p>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm tabular-nums">
                {sym}
                {remaining}
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {settlementRecordUiLabel("cancel", language)}
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={pending || selected == null}
            onClick={confirm}
          >
            {pending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {settlementRecordUiLabel("registerPayment", language)}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
