import { trpc } from "@/lib/trpc";

export function useCurrentPrinter(restaurantId: number, enabled: boolean) {
  const utils = trpc.useUtils();

  const query = trpc.printWorkspace.read.getCurrentPrinter.useQuery(
    { restaurantId },
    { enabled: enabled && restaurantId > 0, refetchInterval: 30_000 }
  );

  const testPrintMutation = trpc.printWorkspace.commands.testPrint.useMutation({
    onSuccess: async () => {
      await utils.printWorkspace.read.getCurrentPrinter.invalidate({ restaurantId });
    },
  });

  return {
    current: query.data,
    isLoading: query.isLoading,
    isTesting: testPrintMutation.isPending,
    error: query.error ?? testPrintMutation.error,
    refetch: () => void query.refetch(),
    testPrint: () => testPrintMutation.mutateAsync({ restaurantId }),
  };
}
