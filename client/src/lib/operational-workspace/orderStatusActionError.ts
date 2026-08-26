/**
 * ORDERS-SERVE-ACTION-UX-AND-STATE-FIX-1
 * User-facing copy for order.updateStatus failures. Never surfaces stacks.
 */
import { TRPCClientError } from "@trpc/client";
import { isUnsafeErrorMessage } from "@/lib/ui-state/classifyQueryError";

const SETTLEMENT_MESSAGE = "Cannot complete order before settlement.";

export function isOrderRequiresSettlementError(error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    const msg = String(error.message ?? "");
    const data = error.data as { settlementCode?: string } | undefined;
    if (data?.settlementCode === "ORDER_REQUIRES_SETTLEMENT") return true;
    if (msg.includes("ORDER_REQUIRES_SETTLEMENT")) return true;
    if (msg.includes(SETTLEMENT_MESSAGE)) return true;
  }
  if (error instanceof Error) {
    if (error.message.includes("ORDER_REQUIRES_SETTLEMENT")) return true;
    if (error.message.includes(SETTLEMENT_MESSAGE)) return true;
  }
  return false;
}

export function formatOrderStatusActionError(
  error: unknown,
  language: string
): string {
  const isAr = language === "ar";
  if (isOrderRequiresSettlementError(error)) {
    return isAr
      ? "لا يمكن إتمام التقديم قبل تسوية الطلب"
      : "Cannot mark served until the order is settled.";
  }
  if (error instanceof TRPCClientError) {
    const msg = String(error.message ?? "").trim();
    if (msg && !isUnsafeErrorMessage(msg)) return msg;
  }
  if (error instanceof Error) {
    const msg = error.message.trim();
    if (msg && !isUnsafeErrorMessage(msg)) return msg;
  }
  return isAr ? "تعذر تحديث حالة الطلب" : "Could not update order status.";
}
