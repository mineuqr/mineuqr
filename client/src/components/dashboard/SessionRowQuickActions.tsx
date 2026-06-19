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
import type { DiningSessionStatus } from "@/lib/diningSessionCopy";
import { sessionActionLabel } from "@/lib/diningSessionActionCopy";
import { trpc } from "@/lib/trpc";
import { toastTrpcError } from "@/lib/trpcErrors";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, MoreHorizontal } from "lucide-react";
import { restaurantDash } from "./restaurantDashStyles";

type ConfirmKind = "close" | "paid" | "complimentary" | null;

export function SessionRowQuickActions({
  restaurantId,
  sessionId,
  sessionStatus,
  isAr,
  onOpenSession,
}: {
  restaurantId: number;
  sessionId: number;
  sessionStatus: Extract<DiningSessionStatus, "open" | "paid" | "complimentary">;
  isAr: boolean;
  onOpenSession: (sessionId: number) => void;
}) {
  const { t } = useLanguage();
  const lang = isAr ? "ar" : "en";
  const utils = trpc.useUtils();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);

  const invalidateAfterAction = async () => {
    await Promise.all([
      utils.session.getOwnerWorkspace.invalidate({ restaurantId, sessionId }),
      utils.order.list.invalidate({ restaurantId }),
      utils.ops.getActiveTablesBoard.invalidate({ restaurantId }),
      utils.ops.getRestaurantOverview.invalidate({ restaurantId }),
      utils.ops.getActivityFeed.invalidate({ restaurantId }),
    ]);
  };

  const mutationOpts = {
    onSuccess: () => {
      void invalidateAfterAction();
      setConfirmKind(null);
    },
    onError: (err: unknown) => toastTrpcError(err, t),
  };

  const markPaidMutation = trpc.session.markPaid.useMutation(mutationOpts);
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
    } else if (confirmKind === "paid") {
      markPaidMutation.mutate(input);
    } else if (confirmKind === "complimentary") {
      markComplimentaryMutation.mutate(input);
    }
  };

  const confirmTitle =
    confirmKind === "close"
      ? sessionActionLabel("closeConfirmTitle", lang)
      : confirmKind === "paid"
        ? sessionActionLabel("paidConfirmTitle", lang)
        : confirmKind === "complimentary"
          ? sessionActionLabel("complimentaryConfirmTitle", lang)
          : "";

  const confirmBody =
    confirmKind === "close"
      ? sessionActionLabel("closeConfirmBody", lang)
      : confirmKind === "paid"
        ? sessionActionLabel("paidConfirmBody", lang)
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
              <DropdownMenuItem disabled={pending} onClick={() => setConfirmKind("paid")}>
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
