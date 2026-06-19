/**
 * TABLE-MANAGEMENT-1 UX-1E — customer request bill control.
 */
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { RecoveredDiningSession } from "@/lib/diningSessionRecovery";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type CustomerRequestBillButtonProps = {
  slug: string;
  sessionToken: string;
  language: "ar" | "en";
  className?: string;
  onBillRequested: (session: Omit<RecoveredDiningSession, "sessionToken">) => void;
};

export function CustomerRequestBillButton({
  slug,
  sessionToken,
  language,
  className,
  onBillRequested,
}: CustomerRequestBillButtonProps) {
  const mutation = trpc.session.requestBill.useMutation({
    onSuccess: (data) => {
      onBillRequested({
        status: data.status,
        tableNumber: data.tableNumber,
        openedAt: data.openedAt,
        billRequestedAt: data.billRequestedAt ?? null,
        paymentPendingAt: data.paymentPendingAt ?? null,
      });
    },
  });

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-[88] flex justify-center px-4",
        className
      )}
    >
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shadow-md"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate({ slug, sessionToken })}
      >
        {mutation.isPending ? (
          <Loader2 className="me-2 h-4 w-4 animate-spin" />
        ) : null}
        {language === "ar" ? "طلب الفاتورة" : "Request Bill"}
      </Button>
    </div>
  );
}
