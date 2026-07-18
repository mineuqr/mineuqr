/**
 * SETTLEMENT-PAYMENT-METHOD-CAPTURE-1 — Mark Paid tender capture.
 * Touch-friendly grid of canonical monetary payment methods.
 */

import { useState } from "react";
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
import { sessionActionLabel } from "@/lib/diningSessionActionCopy";
import {
  listMonetaryPaymentMethodOptions,
  singleTenderSettlements,
} from "@/lib/settlementPaymentMethodPresentation";
import { cn } from "@/lib/utils";
import type { MonetaryPaymentMethod, StaffSettlementLineInput } from "@shared/operational-session";
import { Loader2 } from "lucide-react";

type Lang = "ar" | "en";

type MarkPaidSettlementDialogProps = {
  open: boolean;
  language: Lang;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (settlements: readonly StaffSettlementLineInput[]) => void;
};

export function MarkPaidSettlementDialog({
  open,
  language,
  pending,
  onOpenChange,
  onConfirm,
}: MarkPaidSettlementDialogProps) {
  const [selected, setSelected] = useState<MonetaryPaymentMethod | null>(null);
  const options = listMonetaryPaymentMethodOptions(language);

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelected(null);
    onOpenChange(next);
  };

  const confirm = () => {
    if (!selected || pending) return;
    onConfirm(singleTenderSettlements(selected));
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {sessionActionLabel("paidConfirmTitle", language)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {sessionActionLabel("paidConfirmBody", language)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-1">
          <p className="text-sm font-medium text-foreground">
            {sessionActionLabel("selectPaymentMethod", language)}
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

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {language === "ar" ? "إلغاء" : "Cancel"}
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={pending || selected == null}
            onClick={confirm}
          >
            {pending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : null}
            {language === "ar" ? "تأكيد" : "Confirm"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
