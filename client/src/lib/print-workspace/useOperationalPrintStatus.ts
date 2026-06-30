import {
  deriveOperationalPrintStatus,
  sessionReadyForPrint,
} from "@/lib/print-workspace/operationalViewModels";
import { connectorReadyForPrint } from "@/lib/print-workspace/viewModels";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

export function useOperationalPrintStatus(restaurantId: number, enabled: boolean) {
  const connectorQuery = trpc.printWorkspace.read.getLocalConnectorStatus.useQuery(
    { restaurantId },
    { enabled: enabled && restaurantId > 0, refetchInterval: 30_000 }
  );

  const sessionQuery = trpc.printWorkspace.read.getConnectorSessionStatus.useQuery(
    { restaurantId },
    { enabled: enabled && restaurantId > 0, refetchInterval: 30_000 }
  );

  const printerQuery = trpc.printWorkspace.read.getCurrentPrinter.useQuery(
    { restaurantId },
    { enabled: enabled && restaurantId > 0, refetchInterval: 30_000 }
  );

  const operational = useMemo(
    () =>
      deriveOperationalPrintStatus({
        connector: connectorQuery.data,
        session: sessionQuery.data,
        printer: printerQuery.data,
      }),
    [connectorQuery.data, sessionQuery.data, printerQuery.data]
  );

  const refetchAll = () => {
    void connectorQuery.refetch();
    void sessionQuery.refetch();
    void printerQuery.refetch();
  };

  return {
    connector: connectorQuery.data,
    session: sessionQuery.data,
    printer: printerQuery.data,
    operational,
    connectorOnline: connectorReadyForPrint(connectorQuery.data?.connectionStatus),
    sessionRegistered: sessionReadyForPrint(sessionQuery.data),
    isLoading: connectorQuery.isLoading || sessionQuery.isLoading || printerQuery.isLoading,
    refetch: refetchAll,
  };
}
