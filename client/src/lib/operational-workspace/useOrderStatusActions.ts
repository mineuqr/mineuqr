import { trpc } from "@/lib/trpc";
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import type { OperationalActionId } from "./operationalActions";
import {
  beginOrderLifecycleClientTrace,
  endOrderLifecycleClientTrace,
  getActiveOrderLifecycleClientTrace,
  markOrderLifecycleClient,
  noteOrderLifecycleClientPhase,
  createOrderLifecycleTraceId,
} from "@/lib/order-lifecycle-latency";
import { orderLifecycleNowMs } from "@shared/order-lifecycle-latency";

const ACTION_MAP: Partial<
  Record<OperationalActionId, { targetStatus: OrderLifecycleStatus }>
> = {
  "accept-order": { targetStatus: "preparing" },
  "start-preparing": { targetStatus: "preparing" },
  "mark-ready": { targetStatus: "ready" },
  "serve-order": { targetStatus: "served" },
  "cancel-order": { targetStatus: "cancelled" },
  "restore-order": { targetStatus: "pending" },
  // settle-self-ordering — money path; not order.updateStatus
};

export function useOrderStatusActions(restaurantId: number, onSuccess?: () => void) {
  const utils = trpc.useUtils();

  const mutation = trpc.order.updateStatus.useMutation({
    onSuccess: async () => {
      const active = getActiveOrderLifecycleClientTrace();
      markOrderLifecycleClient(active, "mutation_success");
      markOrderLifecycleClient(active, "invalidate_start");
      const invStarted = orderLifecycleNowMs();
      await Promise.all([
        utils.order.list.invalidate({ restaurantId }),
        utils.order.read.listActive.invalidate({ restaurantId }),
        utils.kitchen.read.getQueue.invalidate({ restaurantId, status: "all" }),
        utils.printWorkspace.read.listOrders.invalidate({ restaurantId }),
      ]);
      noteOrderLifecycleClientPhase(
        active,
        "invalidate_ms",
        orderLifecycleNowMs() - invStarted
      );
      markOrderLifecycleClient(active, "invalidate_end");
      markOrderLifecycleClient(active, "refetch_start");
      const refStarted = orderLifecycleNowMs();
      onSuccess?.();
      noteOrderLifecycleClientPhase(
        active,
        "refetch_callback_ms",
        orderLifecycleNowMs() - refStarted
      );
      markOrderLifecycleClient(active, "refetch_end");
      markOrderLifecycleClient(active, "visible_update");
      endOrderLifecycleClientTrace(active, "ok");
    },
    onError: () => {
      const active = getActiveOrderLifecycleClientTrace();
      markOrderLifecycleClient(active, "mutation_error");
      endOrderLifecycleClientTrace(active, "error");
    },
  });

  async function executeAction(orderId: number, actionId: OperationalActionId) {
    const target = ACTION_MAP[actionId]?.targetStatus;
    if (!target) return;
    const traceId = createOrderLifecycleTraceId();
    const trace = beginOrderLifecycleClientTrace({
      traceId,
      orderId,
      restaurantId,
      transition: `->${target}`,
      surface: "orders-workspace",
    });
    markOrderLifecycleClient(trace, "mutation_start");
    await mutation.mutateAsync(
      { id: orderId, status: target },
      {
        trpc: { context: { lifecycleTraceId: traceId } },
      } as never
    );
  }

  async function setStatus(orderId: number, status: OrderLifecycleStatus) {
    const traceId = createOrderLifecycleTraceId();
    const trace = beginOrderLifecycleClientTrace({
      traceId,
      orderId,
      restaurantId,
      transition: `->${status}`,
      surface: "orders-workspace",
    });
    markOrderLifecycleClient(trace, "mutation_start");
    await mutation.mutateAsync(
      { id: orderId, status },
      {
        trpc: { context: { lifecycleTraceId: traceId } },
      } as never
    );
  }

  return {
    executeAction,
    setStatus,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
