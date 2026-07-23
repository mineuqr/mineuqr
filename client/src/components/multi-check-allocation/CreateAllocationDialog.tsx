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

export type CreateAllocationFormValues = {
  allocationReference: string;
  financialResponsibility: string;
  targetCheckId: string;
  portionAmount: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: MultiCheckAllocationLang;
  pending: boolean;
  defaultTargetCheckId?: number;
  onSubmit: (values: CreateAllocationFormValues) => void;
};

export function CreateAllocationDialog({
  open,
  onOpenChange,
  language,
  pending,
  defaultTargetCheckId,
  onSubmit,
}: Props) {
  const [allocationReference, setAllocationReference] = useState("");
  const [financialResponsibility, setFinancialResponsibility] = useState("");
  const [targetCheckId, setTargetCheckId] = useState(
    defaultTargetCheckId != null ? String(defaultTargetCheckId) : ""
  );
  const [portionAmount, setPortionAmount] = useState("");

  const reset = () => {
    setAllocationReference("");
    setFinancialResponsibility("");
    setTargetCheckId(
      defaultTargetCheckId != null ? String(defaultTargetCheckId) : ""
    );
    setPortionAmount("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {multiCheckAllocationUiLabel("createTitle", language)}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="mca-ref">
              {multiCheckAllocationUiLabel("allocationReference", language)}
            </Label>
            <Input
              id="mca-ref"
              value={allocationReference}
              onChange={(e) => setAllocationReference(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mca-resp">
              {multiCheckAllocationUiLabel("financialResponsibility", language)}
            </Label>
            <Input
              id="mca-resp"
              inputMode="decimal"
              value={financialResponsibility}
              onChange={(e) => setFinancialResponsibility(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mca-target">
              {multiCheckAllocationUiLabel("targetCheckId", language)}
            </Label>
            <Input
              id="mca-target"
              inputMode="numeric"
              value={targetCheckId}
              onChange={(e) => setTargetCheckId(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mca-portion">
              {multiCheckAllocationUiLabel("amount", language)}
            </Label>
            <Input
              id="mca-portion"
              inputMode="decimal"
              value={portionAmount}
              onChange={(e) => setPortionAmount(e.target.value)}
              placeholder={financialResponsibility || undefined}
              autoComplete="off"
            />
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
            disabled={
              pending ||
              !financialResponsibility.trim() ||
              !targetCheckId.trim()
            }
            onClick={() =>
              onSubmit({
                allocationReference: allocationReference.trim(),
                financialResponsibility: financialResponsibility.trim(),
                targetCheckId: targetCheckId.trim(),
                portionAmount:
                  portionAmount.trim() || financialResponsibility.trim(),
              })
            }
          >
            {multiCheckAllocationUiLabel("confirm", language)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
