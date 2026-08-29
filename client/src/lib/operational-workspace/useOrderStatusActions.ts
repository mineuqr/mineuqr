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
import { publishOrderLifecycleUpdate } from "@/lib/order-lifecycle-latency/orderLifecycleBroadcast";
import { orderLifecycleNowMs } from "@shared/order-lifecycle-latency";
import {
  clearOrderStatusWriteConfirmation,
  confirmOrderStatusWrite,
} from "@shared/read-freshness";
import { toast } from "sonner";
import { formatOrderStatusActionError } from "./orderStatusActionError";
import {
  listActiveInputsFor,
  patchListActive,
  patchOrderDetail,
} from "./orderStatusActionCache";

const ACTION_MAP: Partial<
  Record<OperationalActionId, { targetStatus: OrderLifecycleStatus }>
> = {
  "accept-order": { targetStatus: "preparing" },
  "start-preparing": { targetStatus: "preparing" },
  "mark-ready": { targetStatus: "ready" },
  "serve-order": { targetStatus: "served" },
  "cancel-order": { targetStatus: "cancelled" },
  "restore-order": { targetStatus: "pending" },
  // send-to-cashier — operational handoff; not order.updateStatus
};

/**
 * ORDER-LIFECYCLE-LATENCY-REMEDIATION-1
 * Optimistic listActive patch + non-blocking invalidate; deferred server relay.
 *
 * ORDER-STATE-PROPAGATION-REMEDIATION-1
 * Confirm write watermark so structuralSharing rejects stale projection refetches.
 *
 * ORDERS-SERVE-ACTION-UX-AND-STATE-FIX-1
 * Reconcile getDetail and surface updateStatus failures.
 */
export function useOrderStatusActions(
  restaurantId: number,
  onSuccess?: () => void,
  options?: { language?: string }
) {
  const utils = trpc.useUtils();
  const language = options?.language ?? "en";

  const mutation = trpc.order.updateStatus.useMutation({
    onMutate: async ({ id, status }) => {
      const inputs = listActiveInputsFor(restaurantId);
      const detailInput = { restaurantId, orderId: id };
      await Promise.all([
        ...inputs.map((input) => utils.order.read.listActive.cancel(input)),
        utils.order.read.getDetail.cancel(detailInput),
      ]);
      const snapshots = inputs.map((input) => ({
        input,
        data: utils.order.read.listActive.getData(input),
      }));
      const detailSnapshot = utils.order.read.getDetail.getData(detailInput);
      confirmOrderStatusWrite(id, status);
      for (const { input } of snapshots) {
        utils.order.read.listActive.setData(input, (old) =>
          patchListActive(old, id, status)
        );
      }
      utils.order.read.getDetail.setData(detailInput, (old) =>
        patchOrderDetail(old, status)
      );
      return { snapshots, detailInput, detailSnapshot, orderId: id };
    },
    onError: (err, _vars, ctx) => {
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
      if (ctx?.detailInput) {
        utils.order.read.getDetail.setData(ctx.detailInput, ctx.detailSnapshot);
      }
      toast.error(formatOrderStatusActionError(err, language));
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
        utils.order.read.getDetail.invalidate({
          restaurantId,
          orderId: vars.id,
        }),
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
    // ORDER-CARD-PRINT-ACTION-1 — Print is not an order.updateStatus transition.
    if (actionId === "print-order" || actionId === "send-to-cashier") return;
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
