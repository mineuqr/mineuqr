import { trpc } from "@/lib/trpc";
import { nextStatusForAction } from "./viewModels";

export function useKitchenActions(restaurantId: number, onSuccess?: () => void) {
  const utils = trpc.useUtils();

  const updateStatus = trpc.order.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.kitchen.read.getQueue.invalidate({ restaurantId, status: "all" });
      onSuccess?.();
    },
  });

  async function advanceTicket(
    orderId: number,
    action: "start-preparing" | "mark-ready" | "mark-served"
  ) {
    const status = nextStatusForAction(action);
    await updateStatus.mutateAsync({ id: orderId, status });
  }

  return {
    advanceTicket,
    isPending: updateStatus.isPending,
    error: updateStatus.error,
  };
}
