/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — post-payment Settlement Success.
 * SEMANTIC-CONFIRM-DIALOG-PLATFORM-1 — success confirm chrome.
 */

import { Button } from "@/components/ui/button";
import { SemanticConfirmDialog } from "@/design-system/semantic-confirm-dialog";
import {
  settlementRecordUiLabel,
  type SettlementRecordLang,
} from "@/lib/settlement-record-presentation";

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
    <SemanticConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      kind="success"
      icon="success"
      title={settlementRecordUiLabel("successTitle", language)}
      description={settlementRecordUiLabel("successBody", language)}
      cancelLabel={settlementRecordUiLabel("close", language)}
      hideConfirm
      contentClassName="max-w-md"
    >
      <div className="flex flex-col gap-2 py-1">
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
    </SemanticConfirmDialog>
  );
}
