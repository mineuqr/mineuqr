import { trpc } from "@/lib/trpc";
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import type { OperationalActionId } from "./operationalActions";
import type { RouterOutputs } from "@/lib/trpc";
import {
  beginOrderLifecycleClientTrace,
  endOrderLifecycleClientTrace,
  getActiveOrderLifecycleClientTrace,
  markOrderLifecycleClient,
  noteOrderLifecycleClientPhase,
  createOrderLifecycleTraceId,
} from "@/lib/order-lifecycle-latency";
import { publishOrderLifecycleUpdate } from "@/lib/order-lifecycle-latency/orderLifecycleBroadcast";
import { orderLifecycleNowMs } from "@shared/order-lifecycle-latency";
import {
  clearOrderStatusWriteConfirmation,
  confirmOrderStatusWrite,
} from "@shared/read-freshness";

type ListActiveData = RouterOutputs["order"]["read"]["listActive"];

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

function listActiveInputsFor(restaurantId: number) {
  return [
    { restaurantId, limit: 100 },
    { restaurantId, status: undefined, limit: 100 },
    { restaurantId, status: "pending" as const, limit: 100 },
    { restaurantId, status: "preparing" as const, limit: 100 },
    { restaurantId, status: "ready" as const, limit: 100 },
  ];
}

function patchListActive(
  data: ListActiveData | undefined,
  orderId: number,
  status: OrderLifecycleStatus
): ListActiveData | undefined {
  if (!data?.items) return data;
  const terminal = status === "served" || status === "cancelled";
  return {
    ...data,
    items: terminal
      ? data.items.filter((item) => item.orderId !== orderId)
      : data.items.map((item) =>
          item.orderId === orderId ? { ...item, status } : item
        ),
  };
}

/**
 * ORDER-LIFECYCLE-LATENCY-REMEDIATION-1
 * Optimistic listActive patch + non-blocking invalidate; deferred server relay.
 *
 * ORDER-STATE-PROPAGATION-REMEDIATION-1
 * Confirm write watermark so structuralSharing rejects stale projection refetches.
 */
export function useOrderStatusActions(restaurantId: number, onSuccess?: () => void) {
  const utils = trpc.useUtils();

  const mutation = trpc.order.updateStatus.useMutation({
    onMutate: async ({ id, status }) => {
      const inputs = listActiveInputsFor(restaurantId);
      await Promise.all(
        inputs.map((input) => utils.order.read.listActive.cancel(input))
      );
      const snapshots = inputs.map((input) => ({
        input,
        data: utils.order.read.listActive.getData(input),
      }));
      confirmOrderStatusWrite(id, status);
      for (const { input } of snapshots) {
        utils.order.read.listActive.setData(input, (old) =>
          patchListActive(old, id, status)
        );
      }
      return { snapshots, orderId: id };
    },
    onError: (_err, _vars, ctx) => {
      const active = getActiveOrderLifecycleClientTrace();
      markOrderLifecycleClient(active, "mutation_error");
      if (ctx?.orderId != null) {
        clearOrderStatusWriteConfirmation(ctx.orderId);
      }
      if (ctx?.snapshots) {
        for (const { input, data } of ctx.snapshots) {
          utils.order.read.listActive.setData(input, data);
        }
      }
      endOrderLifecycleClientTrace(active, "error");
    },
    onSuccess: (result, vars) => {
      const active = getActiveOrderLifecycleClientTrace();
      markOrderLifecycleClient(active, "mutation_success");
      markOrderLifecycleClient(active, "visible_update");

      confirmOrderStatusWrite(vars.id, result.newStatus ?? vars.status);

      publishOrderLifecycleUpdate({
        type: "order_status_changed",
        restaurantId,
        orderId: vars.id,
        status: result.newStatus ?? vars.status,
        at: Date.now(),
      });

      // Non-blocking refresh — do not await on the mutation critical path.
      // Stale projection payloads are rejected by Read Freshness Governance.
      markOrderLifecycleClient(active, "invalidate_start");
      const invStarted = orderLifecycleNowMs();
      void Promise.all([
        utils.order.read.listActive.invalidate({ restaurantId }),
        utils.kitchen.read.getQueue.invalidate({ restaurantId, status: "all" }),
      ]).finally(() => {
        noteOrderLifecycleClientPhase(
          active,
          "invalidate_ms",
          orderLifecycleNowMs() - invStarted
        );
        markOrderLifecycleClient(active, "invalidate_end");
      });

      // Intentionally omitted from critical path (Phase 3):
      // - order.list (unbounded history; unused by Orders Workspace listActive)
      // - printWorkspace.listOrders (print surface; refreshed on its own poll)

      onSuccess?.();
      endOrderLifecycleClientTrace(active, "ok");
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
