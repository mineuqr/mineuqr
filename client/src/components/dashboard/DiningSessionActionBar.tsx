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
import type { DiningSessionStatus } from "@/lib/diningSessionCopy";
import { sessionActionLabel } from "@/lib/diningSessionActionCopy";
import { trpc } from "@/lib/trpc";
import { toastTrpcError } from "@/lib/trpcErrors";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";

type ConfirmKind = "close" | "paid" | "complimentary" | null;

type DiningSessionActionBarProps = {
  restaurantId: number;
  sessionId: number;
  status: DiningSessionStatus;
  onWorkspaceUpdated?: () => void;
};

export function DiningSessionActionBar({
  restaurantId,
  sessionId,
  status,
  onWorkspaceUpdated,
}: DiningSessionActionBarProps) {
  const { language, t } = useLanguage();
  const lang = language === "ar" ? "ar" : "en";
  const utils = trpc.useUtils();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);

  const invalidateAfterAction = async () => {
    await utils.session.getOwnerWorkspace.invalidate({ restaurantId, sessionId });
    await utils.order.list.invalidate({ restaurantId });
    onWorkspaceUpdated?.();
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

  if (status === "closed" || status === "paid" || status === "complimentary") {
    return null;
  }

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

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {status === "open" && (
          <>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => setConfirmKind("paid")}
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
