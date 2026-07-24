import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MarkPaidSettlementDialog } from "@/components/dashboard/MarkPaidSettlementDialog";
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
import type { StaffSettlementLineInput } from "@shared/operational-session";
import { Loader2 } from "lucide-react";

type ConfirmKind = "close" | "complimentary" | null;

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
  outstandingAmount = "0.00",
  currencySymbol = "",
  restaurantName,
  onWorkspaceUpdated,
}: DiningSessionActionBarProps) {
  const { language, t } = useLanguage();
  const lang = language === "ar" ? "ar" : "en";
  const utils = trpc.useUtils();
  const invalidateSettlements = useInvalidateSettlementRecordQueries();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [paidOpen, setPaidOpen] = useState(false);
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
      setPaidOpen(false);
    },
    onError: (err: unknown) => toastTrpcError(err, t),
  };

  const markPaidMutation = trpc.session.markPaid.useMutation({
    ...mutationOpts,
    onSuccess: (data) => {
      void invalidateAfterAction();
      setConfirmKind(null);
      setPaidOpen(false);
      const id =
        data && typeof data === "object" && "settlementRecordId" in data
          ? (data.settlementRecordId as string | null)
          : null;
      setSettlementRecordId(id);
      setSuccessOpen(true);
    },
  });
  const markComplimentaryMutation = trpc.session.markComplimentary.useMutation(mutationOpts);
  const closeMutation = trpc.session.close.useMutation(mutationOpts);

  const pending =
    markPaidMutation.isPending ||
    markComplimentaryMutation.isPending ||
    closeMutation.isPending;

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
    } else if (confirmKind === "complimentary") {
      markComplimentaryMutation.mutate(input);
    }
  };

  const confirmPaid = (settlements: readonly StaffSettlementLineInput[]) => {
    markPaidMutation.mutate({
      restaurantId,
      sessionId,
      settlements: [...settlements],
    });
  };

  const confirmTitle =
    confirmKind === "close"
      ? sessionActionLabel("closeConfirmTitle", lang)
      : confirmKind === "complimentary"
        ? sessionActionLabel("complimentaryConfirmTitle", lang)
        : "";

  const confirmBody =
    confirmKind === "close"
      ? sessionActionLabel("closeConfirmBody", lang)
      : confirmKind === "complimentary"
        ? sessionActionLabel("complimentaryConfirmBody", lang)
        : "";

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {status === "open" && (
          <>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => setPaidOpen(true)}
            >
              {pending && markPaidMutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : null}
              {sessionActionLabel("markPaid", lang)}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => setConfirmKind("complimentary")}
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

      <MarkPaidSettlementDialog
        open={paidOpen}
        language={lang}
        pending={pending && markPaidMutation.isPending}
        outstandingAmount={outstandingAmount}
        currencySymbol={currencySymbol}
        onOpenChange={setPaidOpen}
        onConfirm={confirmPaid}
      />

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

      <AlertDialog open={confirmKind != null} onOpenChange={(open) => !open && setConfirmKind(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={runConfirmed}>
              {language === "ar" ? "تأكيد" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
