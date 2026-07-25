import { trpc } from "@/lib/trpc";
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import type { OperationalActionId } from "./operationalActions";

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
      await Promise.all([
        utils.order.list.invalidate({ restaurantId }),
        utils.order.read.listActive.invalidate({ restaurantId }),
        utils.kitchen.read.getQueue.invalidate({ restaurantId, status: "all" }),
        utils.printWorkspace.read.listOrders.invalidate({ restaurantId }),
      ]);
      onSuccess?.();
    },
  });

  async function executeAction(orderId: number, actionId: OperationalActionId) {
    const target = ACTION_MAP[actionId]?.targetStatus;
    if (!target) return;
    await mutation.mutateAsync({ id: orderId, status: target });
  }

  async function setStatus(orderId: number, status: OrderLifecycleStatus) {
    await mutation.mutateAsync({ id: orderId, status });
  }

  return {
    executeAction,
    setStatus,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
