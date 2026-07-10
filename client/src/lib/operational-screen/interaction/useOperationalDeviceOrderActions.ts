import { useCallback, useRef, useState } from "react";
import { screenTrpc } from "@/lib/operational-screen/screenTrpc";
import type { DeviceOrderActionId } from "../../../../../server/operational-device/domain/deviceOrderExecution";
import type { OperationalActionId } from "@/lib/operational-workspace/operationalActions";
import { useRuntimeContext } from "@/components/operational-screen/OperationalScreenRuntimeProvider";

export function useOperationalDeviceOrderActions() {
  const context = useRuntimeContext();
  const canExecute = context.instance.role.permissions.canExecuteOrderActions;
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<number | null>(null);
  const successTimerRef = useRef<number | null>(null);
  const utils = screenTrpc.useUtils();

  const mutation = screenTrpc.operationalDevice.runtime.executeOrderAction.useMutation({
    onSuccess: async () => {
      await utils.operationalDevice.runtime.getKitchenQueue.invalidate();
    },
  });

  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current != null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);

  const executeAction = useCallback(
    async (orderId: number, actionId: OperationalActionId) => {
      if (!canExecute) return;
      clearSuccessTimer();
      setSuccessOrderId(null);
      setPendingOrderId(orderId);
      try {
        await mutation.mutateAsync({
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
    [canExecute, clearSuccessTimer, mutation]
  );

  function bindTicket(orderId: number) {
    return {
      isInteractive: canExecute,
      actionPending: pendingOrderId === orderId,
      actionSucceeded: successOrderId === orderId,
      onPrimaryAction: canExecute
        ? (actionId: OperationalActionId) => {
            void executeAction(orderId, actionId);
          }
        : undefined,
    };
  }

  return {
    canExecute,
    bindTicket,
  };
}
