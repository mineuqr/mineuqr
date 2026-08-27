/**
 * CASHIER-INCOMING-HANDOFF-MEMBERSHIP-1
 * After durable Send, notify the operator and refresh Incoming Queue.
 * Does not navigate, persist money, or create a second Order.
 */
import { toast } from "sonner";
import { sessionActionLabel } from "@/lib/diningSessionActionCopy";
import { trpc } from "@/lib/trpc";

export const CASHIER_INCOMING_ORDER_HANDOFF_PROGRAM_ID =
  "CASHIER-INCOMING-ORDER-HANDOFF-1" as const;
export const CASHIER_INCOMING_HANDOFF_MEMBERSHIP_PROGRAM_ID =
  "CASHIER-INCOMING-HANDOFF-MEMBERSHIP-1" as const;

type TrpcUtils = ReturnType<typeof trpc.useUtils>;

export function toastOperationalOrderSentToCashier(language: "ar" | "en"): void {
  toast.success(sessionActionLabel("sentToCashier", language));
}

export function refreshCashierIncomingQueue(utils: TrpcUtils): void {
  void utils.pos.read.orders.listInvoiceIntents.invalidate();
  void utils.pos.read.orders.getInvoiceIntent.invalidate();
}

export function handoffOperationalOrderToCashier(input: {
  utils: TrpcUtils;
  language: "ar" | "en";
}): void {
  refreshCashierIncomingQueue(input.utils);
  toastOperationalOrderSentToCashier(input.language);
}
