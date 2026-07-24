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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MarkPaidSettlementDialog } from "@/components/dashboard/MarkPaidSettlementDialog";
import { SettlementSuccessDialog } from "@/components/settlement-record/SettlementSuccessDialog";
import { SettlementDetailSheet } from "@/components/settlement-record/SettlementDetailSheet";
import { SettlementReceiptDialog } from "@/components/settlement-record/SettlementReceiptDialog";
import type { DiningSessionStatus } from "@/lib/diningSessionCopy";
import { sessionActionLabel } from "@/lib/diningSessionActionCopy";
import { syncDashboardUrl } from "@/lib/dashboardUrl";
import { useInvalidateSettlementRecordQueries } from "@/lib/settlement-record-presentation";
import { trpc } from "@/lib/trpc";
import { toastTrpcError } from "@/lib/trpcErrors";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { StaffSettlementLineInput } from "@shared/operational-session";
import { Loader2, MoreHorizontal } from "lucide-react";
import { restaurantDash } from "./restaurantDashStyles";

type ConfirmKind = "close" | "complimentary" | null;

export function SessionRowQuickActions({
  restaurantId,
  sessionId,
  sessionStatus,
  isAr,
  outstandingAmount = "0.00",
  currencySymbol = "",
  onOpenSession,
}: {
  restaurantId: number;
  sessionId: number;
  sessionStatus: Extract<DiningSessionStatus, "open" | "paid" | "complimentary">;
  isAr: boolean;
  outstandingAmount?: string;
  currencySymbol?: string;
  onOpenSession: (sessionId: number) => void;
}) {
  const { t } = useLanguage();
  const lang = isAr ? "ar" : "en";
  const utils = trpc.useUtils();
  const invalidateSettlements = useInvalidateSettlementRecordQueries();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [paidOpen, setPaidOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [settlementRecordId, setSettlementRecordId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const workspaceQuery = trpc.session.getOwnerWorkspace.useQuery(
    { restaurantId, sessionId },
    { enabled: paidOpen && restaurantId > 0 && sessionId > 0 }
  );
  const resolvedOutstanding =
    outstandingAmount !== "0.00"
      ? outstandingAmount
      : (workspaceQuery.data?.ordersTotalAmount ?? outstandingAmount);

  const invalidateAfterAction = async () => {
    await Promise.all([
      utils.session.getOwnerWorkspace.invalidate({ restaurantId, sessionId }),
      utils.order.list.invalidate({ restaurantId }),
      utils.ops.getActiveTablesBoard.invalidate({ restaurantId }),
      utils.ops.getRestaurantOverview.invalidate({ restaurantId }),
      utils.ops.getActivityFeed.invalidate({ restaurantId }),
      utils.orderSettlement.listByCheck.invalidate(),
      utils.orderSettlement.getSummaryByCheck.invalidate(),
      utils.orderSettlement.listByRestaurant.invalidate({ restaurantId }),
      invalidateSettlements(restaurantId),
    ]);
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

  const showSettlementActions = sessionStatus === "open";

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(restaurantDash.toolbarBtn)}
          onClick={() => onOpenSession(sessionId)}
        >
          {isAr ? "فتح الجلسة" : "Open Session"}
        </Button>

        {showSettlementActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn("h-8 w-8 px-0", restaurantDash.toolbarBtn)}
                disabled={pending}
                aria-label={isAr ? "إجراءات الجلسة" : "Session actions"}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-slate-700/50 bg-slate-950">
              <DropdownMenuItem disabled={pending} onClick={() => setPaidOpen(true)}>
                {sessionActionLabel("markPaid", lang)}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={pending}
                onClick={() => setConfirmKind("complimentary")}
              >
                {sessionActionLabel("markComplimentary", lang)}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={pending}
                className="text-red-400 focus:text-red-300"
                onClick={() => setConfirmKind("close")}
              >
                {sessionActionLabel("closeSession", lang)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <MarkPaidSettlementDialog
        open={paidOpen}
        language={lang}
        pending={pending && markPaidMutation.isPending}
        outstandingAmount={resolvedOutstanding}
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
              {isAr ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={runConfirmed}>
              {isAr ? "تأكيد" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
