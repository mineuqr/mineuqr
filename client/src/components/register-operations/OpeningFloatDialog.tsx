/**
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 /
 * REGISTER-OPERATIONS-SHIFT-ROTATION-STATE-FIX-1 —
 * opening float collection dialog.
 * `open` is parent-controlled from authoritative financialShift.getCurrent.
 * Required float rules stay non-bypassable while no current shift exists.
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
  parseMoneyAmountInput,
  registerOperationsUiLabel,
  type RegisterOperationsLang,
} from "@/lib/register-operations-presentation";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  language: RegisterOperationsLang;
  currencySymbol: string;
  pending: boolean;
  onConfirm: (openingFloatAmount: string) => void;
  onCloseDutyWithoutShift: () => void;
};

export function OpeningFloatDialog({
  open,
  language,
  currencySymbol,
  pending,
  onConfirm,
  onCloseDutyWithoutShift,
}: Props) {
  const [raw, setRaw] = useState("0.00");
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
    <Dialog open={open}>
      <DialogContent
        dir={dir}
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>
            {registerOperationsUiLabel("openingFloatTitle", language)}
          </DialogTitle>
          <DialogDescription>
            {registerOperationsUiLabel("openingFloatSubtitle", language)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label
            className="text-sm text-slate-300"
            htmlFor="opening-float-amount"
          >
            {registerOperationsUiLabel("openingFloatAmount", language)}
            {currencySymbol ? ` (${currencySymbol})` : ""}
          </label>
          <Input
            id="opening-float-amount"
            inputMode="decimal"
            autoFocus
            value={raw}
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "opening-float-error" : undefined}
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
            <p id="opening-float-error" role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="w-full min-h-11"
            disabled={pending}
            onClick={submit}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              registerOperationsUiLabel("openingFloatConfirm", language)
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={onCloseDutyWithoutShift}
          >
            {registerOperationsUiLabel("openingFloatCancelCloseDuty", language)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
