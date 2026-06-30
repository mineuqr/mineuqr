import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

export function usePrintConnector(restaurantId: number, enabled: boolean) {
  const utils = trpc.useUtils();

  const printersQuery = trpc.printConnector.discoverPrinters.useQuery(
    { restaurantId },
    { enabled: enabled && restaurantId > 0 }
  );

  const selectedQuery = trpc.printConnector.getSelectedPrinter.useQuery(
    { restaurantId },
    { enabled: enabled && restaurantId > 0 }
  );

  const selectMutation = trpc.printConnector.selectPrinter.useMutation({
    onSuccess: async () => {
      await utils.printConnector.getSelectedPrinter.invalidate({ restaurantId });
    },
  });

  const selectPrinter = useCallback(
    async (printer: {
      id: string;
      name: string;
      platform: string;
      transport: "usb" | "ethernet" | "wifi" | "bluetooth";
    }) => {
      await selectMutation.mutateAsync({
        restaurantId,
        printerId: printer.id,
        printerName: printer.name,
        platform: printer.platform,
        transport: printer.transport,
      });
    },
    [restaurantId, selectMutation]
  );

  return {
    printers: printersQuery.data ?? [],
    selectedPrinter: selectedQuery.data,
    isLoading: printersQuery.isLoading || selectedQuery.isLoading,
    isSelecting: selectMutation.isPending,
    error: printersQuery.error ?? selectedQuery.error ?? selectMutation.error,
    refetch: () => {
      void printersQuery.refetch();
      void selectedQuery.refetch();
    },
    selectPrinter,
  };
}
