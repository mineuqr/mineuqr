/**
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 — final cash count before Shift + Duty close.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  formatRegisterMoneyDisplay,
  parseMoneyAmountInput,
  registerOperationsUiLabel,
  type RegisterOperationsLang,
} from "@/lib/register-operations-presentation";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  language: RegisterOperationsLang;
  currencySymbol: string;
  expectedCashAmount: string | null;
  pending: boolean;
  onConfirm: (actualCashAmount: string) => void;
  onCancel: () => void;
};

export function CashCountDialog({
  open,
  language,
  currencySymbol,
  expectedCashAmount,
  pending,
  onConfirm,
  onCancel,
}: Props) {
  const [raw, setRaw] = useState(expectedCashAmount ?? "0.00");
  const [error, setError] = useState<string | null>(null);
  const dir = language === "ar" ? "rtl" : "ltr";

  function submit() {
    const parsed = parseMoneyAmountInput(raw);
    if (!parsed.ok) {
      setError(
        registerOperationsUiLabel(
          parsed.reason === "required"
            ? "openingFloatRequired"
            : "openingFloatInvalid",
          language
        )
      );
      return;
    }
    setError(null);
    onConfirm(parsed.amount);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
    >
      <DialogContent dir={dir} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {registerOperationsUiLabel("cashCountTitle", language)}
          </DialogTitle>
          <DialogDescription>
            {registerOperationsUiLabel("cashCountSubtitle", language)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {expectedCashAmount != null && (
            <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 px-3 py-2 text-sm">
              <div className="text-slate-500">
                {registerOperationsUiLabel("cashCountExpected", language)}
              </div>
              <div className="mt-1 font-medium text-white">
                {formatRegisterMoneyDisplay(
                  expectedCashAmount,
                  currencySymbol,
                  language
                )}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label
              className="text-sm text-slate-300"
              htmlFor="cash-count-actual"
            >
              {registerOperationsUiLabel("cashCountActual", language)}
              {currencySymbol ? ` (${currencySymbol})` : ""}
            </label>
            <Input
              id="cash-count-actual"
              inputMode="decimal"
              autoFocus
              value={raw}
              disabled={pending}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                setRaw(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            {error && (
              <p role="alert" className="text-sm text-rose-300">
                {error}
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onCancel}
          >
            {registerOperationsUiLabel("cashCountCancel", language)}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={submit}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              registerOperationsUiLabel("cashCountConfirm", language)
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
