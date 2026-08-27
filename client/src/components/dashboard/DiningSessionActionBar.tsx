import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SemanticConfirmDialog } from "@/design-system/semantic-confirm-dialog";
import { SettlementSuccessDialog } from "@/components/settlement-record/SettlementSuccessDialog";
import { SettlementDetailSheet } from "@/components/settlement-record/SettlementDetailSheet";
import { SettlementReceiptDialog } from "@/components/settlement-record/SettlementReceiptDialog";
import type { DiningSessionStatus } from "@/lib/diningSessionCopy";
import { sessionActionLabel } from "@/lib/diningSessionActionCopy";
import { useInvalidateSettlementRecordQueries } from "@/lib/settlement-record-presentation";
import { syncDashboardUrl } from "@/lib/dashboardUrl";
import { trpc } from "@/lib/trpc";
import { toastTrpcError } from "@/lib/trpcErrors";
import { useLanguage } from "@/contexts/LanguageContext";

type ConfirmKind = "close" | null;

type DiningSessionActionBarProps = {
  restaurantId: number;
  sessionId: number;
  status: DiningSessionStatus;
  outstandingAmount?: string;
  currencySymbol?: string;
  restaurantName?: string;
  onWorkspaceUpdated?: () => void;
};

export function DiningSessionActionBar({
  restaurantId,
  sessionId,
  status,
  outstandingAmount: _outstandingAmount = "0.00",
  currencySymbol: _currencySymbol = "",
  restaurantName,
  onWorkspaceUpdated,
}: DiningSessionActionBarProps) {
  const { language, t } = useLanguage();
  const lang = language === "ar" ? "ar" : "en";
  const utils = trpc.useUtils();
  const invalidateSettlements = useInvalidateSettlementRecordQueries();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [settlementRecordId, setSettlementRecordId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const invalidateAfterAction = async () => {
    await utils.session.getOwnerWorkspace.invalidate({ restaurantId, sessionId });
    await utils.order.list.invalidate({ restaurantId });
    await utils.orderSettlement.listByCheck.invalidate();
    await utils.orderSettlement.getSummaryByCheck.invalidate();
    await utils.orderSettlement.listByRestaurant.invalidate({ restaurantId });
    await invalidateSettlements(restaurantId);
    onWorkspaceUpdated?.();
  };

  const mutationOpts = {
    onSuccess: () => {
      void invalidateAfterAction();
      setConfirmKind(null);
    },
    onError: (err: unknown) => toastTrpcError(err, t),
  };

  const closeMutation = trpc.session.close.useMutation(mutationOpts);

  const pending = closeMutation.isPending;

  if (status === "closed" || status === "paid" || status === "complimentary") {
    return (
      <>
        <SettlementSuccessDialog
          open={successOpen}
          language={lang}
          settlementRecordId={settlementRecordId}
          onOpenChange={setSuccessOpen}
          onViewDetail={() => {
            setSuccessOpen(false);
            setDetailOpen(true);
          }}
          onViewReceipt={() => {
            setSuccessOpen(false);
            setReceiptOpen(true);
          }}
          onViewCompletedOrders={() => {
            setSuccessOpen(false);
            syncDashboardUrl({ restaurantId, section: "orders" });
          }}
          onViewHistory={() => {
            setSuccessOpen(false);
            syncDashboardUrl({ restaurantId, section: "settlements" });
          }}
        />
        <SettlementDetailSheet
          open={detailOpen}
          restaurantId={restaurantId}
          settlementRecordId={settlementRecordId}
          language={lang}
          onOpenChange={setDetailOpen}
          onOpenSettlementRecord={(id) => setSettlementRecordId(id)}
          onViewReceipt={() => {
            setDetailOpen(false);
            setReceiptOpen(true);
          }}
          onViewHistory={() => {
            setDetailOpen(false);
            syncDashboardUrl({ restaurantId, section: "settlements" });
          }}
        />
        <SettlementReceiptDialog
          open={receiptOpen}
          restaurantId={restaurantId}
          settlementRecordId={settlementRecordId}
          language={lang}
          restaurantName={restaurantName}
          onOpenChange={setReceiptOpen}
        />
      </>
    );
  }

  const runConfirmed = () => {
    const input = { restaurantId, sessionId };
    if (confirmKind === "close") {
      closeMutation.mutate(input);
    }
  };

  const confirmTitle =
    confirmKind === "close" ? sessionActionLabel("closeConfirmTitle", lang) : "";

  const confirmBody =
    confirmKind === "close" ? sessionActionLabel("closeConfirmBody", lang) : "";

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {status === "open" && (
          <>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() =>
                syncDashboardUrl({ restaurantId, section: "cashier" })
              }
            >
              {sessionActionLabel("sendToCashier", lang)}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() =>
                syncDashboardUrl({ restaurantId, section: "cashier" })
              }
            >
              {sessionActionLabel("markComplimentary", lang)}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto border-red-500/40 text-red-400 hover:bg-red-500/10"
              disabled={pending}
              onClick={() => setConfirmKind("close")}
            >
              {sessionActionLabel("closeSession", lang)}
            </Button>
          </>
        )}
      </div>

      <SettlementSuccessDialog
        open={successOpen}
        language={lang}
        settlementRecordId={settlementRecordId}
        onOpenChange={setSuccessOpen}
        onViewDetail={() => {
          setSuccessOpen(false);
          setDetailOpen(true);
        }}
        onViewReceipt={() => {
          setSuccessOpen(false);
          setReceiptOpen(true);
        }}
        onViewCompletedOrders={() => {
          setSuccessOpen(false);
          syncDashboardUrl({ restaurantId, section: "orders" });
        }}
        onViewHistory={() => {
          setSuccessOpen(false);
          syncDashboardUrl({ restaurantId, section: "settlements" });
        }}
      />

      <SettlementDetailSheet
        open={detailOpen}
        restaurantId={restaurantId}
        settlementRecordId={settlementRecordId}
        language={lang}
        onOpenChange={setDetailOpen}
        onOpenSettlementRecord={(id) => setSettlementRecordId(id)}
        onViewReceipt={() => {
          setDetailOpen(false);
          setReceiptOpen(true);
        }}
        onViewHistory={() => {
          setDetailOpen(false);
          syncDashboardUrl({ restaurantId, section: "settlements" });
        }}
      />

      <SettlementReceiptDialog
        open={receiptOpen}
        restaurantId={restaurantId}
        settlementRecordId={settlementRecordId}
        language={lang}
        restaurantName={restaurantName}
        onOpenChange={setReceiptOpen}
      />

      <SemanticConfirmDialog
        open={confirmKind != null}
        onOpenChange={(open) => !open && setConfirmKind(null)}
        kind="destructive"
        icon="close"
        title={confirmTitle}
        description={confirmBody}
        cancelLabel={language === "ar" ? "إلغاء" : "Cancel"}
        confirmLabel={language === "ar" ? "تأكيد" : "Confirm"}
        onConfirm={runConfirmed}
        loading={pending}
      />
    </>
  );
}
