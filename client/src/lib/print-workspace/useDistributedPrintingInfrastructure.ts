import { trpc } from "@/lib/trpc";
import { connectorReadyForPrint } from "@/lib/print-workspace/viewModels";

export function useDistributedPrintingInfrastructure(restaurantId: number, enabled: boolean) {
  const connectorQuery = trpc.printWorkspace.read.getLocalConnectorStatus.useQuery(
    { restaurantId },
    { enabled: enabled && restaurantId > 0, refetchInterval: 30_000 }
  );

  const sessionQuery = trpc.printWorkspace.read.getConnectorSessionStatus.useQuery(
    { restaurantId },
    { enabled: enabled && restaurantId > 0, refetchInterval: 30_000 }
  );

  const connectorOnline = connectorReadyForPrint(connectorQuery.data?.connectionStatus);

  return {
    connector: connectorQuery.data,
    session: sessionQuery.data,
    connectorOnline,
    isLoading: connectorQuery.isLoading || sessionQuery.isLoading,
    refetch: () => {
      void connectorQuery.refetch();
      void sessionQuery.refetch();
    },
  };
}
