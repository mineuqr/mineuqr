/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — post-payment Settlement Success.
 */

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  settlementRecordUiLabel,
  type SettlementRecordLang,
} from "@/lib/settlement-record-presentation";
import { CheckCircle2 } from "lucide-react";

type SettlementSuccessDialogProps = {
  open: boolean;
  language: SettlementRecordLang;
  settlementRecordId: string | null;
  onOpenChange: (open: boolean) => void;
  onViewDetail: () => void;
  onViewReceipt: () => void;
  onViewCompletedOrders: () => void;
  onViewHistory: () => void;
};

export function SettlementSuccessDialog({
  open,
  language,
  settlementRecordId,
  onOpenChange,
  onViewDetail,
  onViewReceipt,
  onViewCompletedOrders,
  onViewHistory,
}: SettlementSuccessDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mb-2 flex justify-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" aria-hidden />
          </div>
          <AlertDialogTitle className="text-center">
            {settlementRecordUiLabel("successTitle", language)}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {settlementRecordUiLabel("successBody", language)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 py-2">
          <Button
            type="button"
            disabled={!settlementRecordId}
            onClick={onViewDetail}
          >
            {settlementRecordUiLabel("viewDetail", language)}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!settlementRecordId}
            onClick={onViewReceipt}
          >
            {settlementRecordUiLabel("viewReceipt", language)}
          </Button>
          <Button type="button" variant="outline" onClick={onViewCompletedOrders}>
            {settlementRecordUiLabel("completedOrders", language)}
          </Button>
          <Button type="button" variant="ghost" onClick={onViewHistory}>
            {settlementRecordUiLabel("viewHistory", language)}
          </Button>
        </div>

        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {settlementRecordUiLabel("close", language)}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
