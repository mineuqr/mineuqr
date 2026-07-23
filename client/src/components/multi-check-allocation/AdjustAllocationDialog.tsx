import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  multiCheckAllocationUiLabel,
  type MultiCheckAllocationLang,
} from "@/lib/multi-check-allocation-presentation";

export type AdjustAllocationFormValues = {
  amount: string;
  direction: "increase" | "decrease";
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: MultiCheckAllocationLang;
  pending: boolean;
  onSubmit: (values: AdjustAllocationFormValues) => void;
};

export function AdjustAllocationDialog({
  open,
  onOpenChange,
  language,
  pending,
  onSubmit,
}: Props) {
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"increase" | "decrease">(
    "decrease"
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setAmount("");
          setDirection("decrease");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {multiCheckAllocationUiLabel("adjustTitle", language)}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="mca-adj-amount">
              {multiCheckAllocationUiLabel("amount", language)}
            </Label>
            <Input
              id="mca-adj-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mca-adj-dir">
              {multiCheckAllocationUiLabel("direction", language)}
            </Label>
            <select
              id="mca-adj-dir"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={direction}
              onChange={(e) =>
                setDirection(e.target.value as "increase" | "decrease")
              }
            >
              <option value="decrease">
                {multiCheckAllocationUiLabel("decrease", language)}
              </option>
              <option value="increase">
                {multiCheckAllocationUiLabel("increase", language)}
              </option>
            </select>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {multiCheckAllocationUiLabel("dismiss", language)}
          </Button>
          <Button
            type="button"
            disabled={pending || !amount.trim()}
            onClick={() =>
              onSubmit({ amount: amount.trim(), direction })
            }
          >
            {multiCheckAllocationUiLabel("confirm", language)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
