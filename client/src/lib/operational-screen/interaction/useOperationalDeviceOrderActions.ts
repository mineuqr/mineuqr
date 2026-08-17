import { useCallback, useRef, useState } from "react";
import { screenTrpc } from "@/lib/operational-screen/screenTrpc";
import type { DeviceOrderActionId } from "../../../../../server/operational-device/domain/deviceOrderExecution";
import type { OperationalActionId } from "@/lib/operational-workspace/operationalActions";
import {
  useRuntimeBusiness,
  useRuntimeRole,
} from "@/components/operational-screen/OperationalScreenRuntimeProvider";
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
import { confirmOrderStatusWrite } from "@shared/read-freshness";
import { targetStatusForDeviceAction } from "../../../../../server/operational-device/domain/deviceOrderExecution";

/**
 * ORDER-INTERACTION-PERFORMANCE-1 — device order execution.
 * ORDER-LIFECYCLE-LATENCY-REMEDIATION-1 — non-blocking invalidate + broadcast.
 */
export function useOperationalDeviceOrderActions() {
  const role = useRuntimeRole();
  const business = useRuntimeBusiness();
  const canExecute = role.permissions.canExecuteOrderActions;
  const restaurantId = business.tenantId;
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<number | null>(null);
  const successTimerRef = useRef<number | null>(null);
  const utils = screenTrpc.useUtils();

  const mutation = screenTrpc.operationalDevice.runtime.executeOrderAction.useMutation({
    onSuccess: (_data, vars) => {
      const active = getActiveOrderLifecycleClientTrace();
      markOrderLifecycleClient(active, "mutation_success");
      markOrderLifecycleClient(active, "visible_update");

      const targetStatus = targetStatusForDeviceAction(vars.action);
      confirmOrderStatusWrite(vars.orderId, targetStatus);

      publishOrderLifecycleUpdate({
        type: "order_status_changed",
        restaurantId,
        orderId: vars.orderId,
        status: targetStatus,
        at: Date.now(),
      });

      markOrderLifecycleClient(active, "invalidate_start");
      const invStarted = orderLifecycleNowMs();
      void utils.operationalDevice.runtime.getKitchenQueue.invalidate().finally(() => {
        noteOrderLifecycleClientPhase(
          active,
          "invalidate_ms",
          orderLifecycleNowMs() - invStarted
        );
        markOrderLifecycleClient(active, "invalidate_end");
      });
      endOrderLifecycleClientTrace(active, "ok");
    },
    onError: () => {
      const active = getActiveOrderLifecycleClientTrace();
      markOrderLifecycleClient(active, "mutation_error");
      endOrderLifecycleClientTrace(active, "error");
    },
  });

  const canExecuteRef = useRef(canExecute);
  canExecuteRef.current = canExecute;
  const mutateAsyncRef = useRef(mutation.mutateAsync);
  mutateAsyncRef.current = mutation.mutateAsync;

  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current != null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);

  const executeAction = useCallback(
    async (orderId: number, actionId: OperationalActionId) => {
      if (!canExecuteRef.current) return;
      clearSuccessTimer();
      setSuccessOrderId(null);
      setPendingOrderId(orderId);
      const traceId = createOrderLifecycleTraceId();
      const trace = beginOrderLifecycleClientTrace({
        traceId,
        orderId,
        restaurantId,
        transition: actionId,
        surface: "operational-device",
      });
      markOrderLifecycleClient(trace, "mutation_start");
      try {
        await mutateAsyncRef.current(
          {
            orderId,
            action: actionId as DeviceOrderActionId,
          },
          {
            trpc: { context: { lifecycleTraceId: traceId } },
          } as never
        );
        setSuccessOrderId(orderId);
        successTimerRef.current = window.setTimeout(() => {
          setSuccessOrderId((current) => (current === orderId ? null : current));
          successTimerRef.current = null;
        }, 1500);
      } finally {
        setPendingOrderId((current) => (current === orderId ? null : current));
      }
    },
    [clearSuccessTimer, restaurantId]
  );

  return {
    canExecute,
    executeAction,
    pendingOrderId,
    successOrderId,
  };
}
