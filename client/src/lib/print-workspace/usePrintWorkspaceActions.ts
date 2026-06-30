import { trpc } from "@/lib/trpc";
import { useCallback } from "react";
import type {
  CancelPrintCommand,
  MarkPrintedCommand,
  PrintOrderCommand,
  PrintWorkspaceActionPort,
  ReprintOrderCommand,
} from "./actionContracts";

export type PrintWorkspaceActionHandle = PrintWorkspaceActionPort & {
  isBusy: boolean;
};

export function usePrintWorkspaceActionPort(
  restaurantId: number,
  orderId: number,
  orderNumber: string,
  onSuccess?: () => void
): PrintWorkspaceActionHandle {
  const utils = trpc.useUtils();

  const invalidate = useCallback(async () => {
    if (!orderId) return;
    await utils.printWorkspace.read.getOrderDetail.invalidate({ restaurantId, orderId });
    await utils.printWorkspace.read.listOrders.invalidate({ restaurantId });
    onSuccess?.();
  }, [utils, restaurantId, orderId, onSuccess]);

  const printOrderMutation = trpc.printWorkspace.commands.printOrder.useMutation({
    onSuccess: invalidate,
  });
  const reprintMutation = trpc.printWorkspace.commands.reprint.useMutation({
    onSuccess: invalidate,
  });
  const markPrintedMutation = trpc.printWorkspace.commands.markPrinted.useMutation({
    onSuccess: invalidate,
  });
  const cancelPrintMutation = trpc.printWorkspace.commands.cancelPrint.useMutation({
    onSuccess: invalidate,
  });

  const isBusy =
    printOrderMutation.isPending ||
    reprintMutation.isPending ||
    markPrintedMutation.isPending ||
    cancelPrintMutation.isPending;

  return {
    isBusy,
    async printOrder(command: PrintOrderCommand) {
      await printOrderMutation.mutateAsync({
        restaurantId: command.restaurantId,
        orderId: command.orderId,
        orderNumber: command.orderNumber,
      });
    },
    async reprint(command: ReprintOrderCommand) {
      await reprintMutation.mutateAsync({
        restaurantId: command.restaurantId,
        orderId: command.orderId,
        orderNumber: command.orderNumber,
        reason: command.reason,
      });
    },
    async preview() {
      if (!orderId) return;
      await utils.printWorkspace.read.previewTicket.fetch({ restaurantId, orderId });
    },
    async markPrinted(command: MarkPrintedCommand) {
      await markPrintedMutation.mutateAsync({
        restaurantId: command.restaurantId,
        orderId: command.orderId,
        orderNumber: command.orderNumber,
        printedAt: command.printedAt,
      });
    },
    async cancelPrint(command: CancelPrintCommand) {
      await cancelPrintMutation.mutateAsync({
        restaurantId: command.restaurantId,
        orderId: command.orderId,
        orderNumber: command.orderNumber,
        reason: command.reason,
      });
    },
  };
}
