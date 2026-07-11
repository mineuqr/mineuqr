import { useCallback, useRef, useState } from "react";
import { screenTrpc } from "@/lib/operational-screen/screenTrpc";
import type { DeviceOrderActionId } from "../../../../../server/operational-device/domain/deviceOrderExecution";
import type { OperationalActionId } from "@/lib/operational-workspace/operationalActions";
import { useRuntimeRole } from "@/components/operational-screen/OperationalScreenRuntimeProvider";

/**
 * ORDER-INTERACTION-PERFORMANCE-1 — device order execution.
 *
 * `executeAction` keeps a stable identity across renders (it reads the latest
 * mutation and permission via refs), so memoized cards are not invalidated by
 * unrelated runtime re-renders. Pending/success state is exposed as order ids
 * so callers derive per-card booleans without recreating callbacks.
 */
export function useOperationalDeviceOrderActions() {
  const role = useRuntimeRole();
  const canExecute = role.permissions.canExecuteOrderActions;
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<number | null>(null);
  const successTimerRef = useRef<number | null>(null);
  const utils = screenTrpc.useUtils();

  const mutation = screenTrpc.operationalDevice.runtime.executeOrderAction.useMutation({
    onSuccess: async () => {
      await utils.operationalDevice.runtime.getKitchenQueue.invalidate();
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
      try {
        await mutateAsyncRef.current({
          orderId,
          action: actionId as DeviceOrderActionId,
        });
        setSuccessOrderId(orderId);
        successTimerRef.current = window.setTimeout(() => {
          setSuccessOrderId((current) => (current === orderId ? null : current));
          successTimerRef.current = null;
        }, 1500);
      } finally {
        setPendingOrderId((current) => (current === orderId ? null : current));
      }
    },
    [clearSuccessTimer]
  );

  return {
    canExecute,
    executeAction,
    pendingOrderId,
    successOrderId,
  };
}
