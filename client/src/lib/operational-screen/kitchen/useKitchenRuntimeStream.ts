import { useMemo } from "react";
import { DATA_POLL_INTERVAL_MS } from "../bootstrapLogic";
import { screenTrpc } from "../screenTrpc";
import { useScreenRuntime } from "@/components/operational-screen/OperationalScreenRuntimeProvider";
import { isCapabilitySupported } from "@/lib/operational-screen/capability/resolveCapabilityPresentation";
import {
  buildKitchenRuntimeStream,
  type KitchenProjectionDiagnostics,
  type KitchenRuntimeStream,
} from "./buildKitchenRuntimeStream";

export type { KitchenProjectionDiagnostics, KitchenRuntimeStream };

function useVisiblePollingEnabled(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

/**
 * Kitchen runtime stream — fetch read model, apply category filter in runtime layer.
 * Presentation consumes the filtered stream only.
 */
export function useKitchenRuntimeStream(): KitchenRuntimeStream & {
  retry: () => void;
  isRefetching: boolean;
} {
  const { categoryFilter, categoryFilterPredicate, context } = useScreenRuntime();
  const visible = useVisiblePollingEnabled();
  const kitchenQueueSupported = isCapabilitySupported(context?.runtimeCapabilities, "kitchen_queue");
  const language = context?.presentation.language ?? "en";

  const queueQuery = screenTrpc.operationalDevice.runtime.getKitchenQueue.useQuery(
    { status: "all", limit: 200 },
    {
      enabled: kitchenQueueSupported,
      refetchInterval: visible && kitchenQueueSupported ? DATA_POLL_INTERVAL_MS : false,
      refetchOnWindowFocus: true,
      placeholderData: (prev) => prev,
    }
  );

  const stream = useMemo(
    () =>
      buildKitchenRuntimeStream({
        data: queueQuery.data,
        isLoading: queueQuery.isLoading,
        isError: queueQuery.isError,
        error: queueQuery.error,
        language,
        categoryFilterEnabled: categoryFilter?.enabled === true,
        categoryFilterPredicate,
      }),
    [
      queueQuery.data,
      queueQuery.isLoading,
      queueQuery.isError,
      queueQuery.error,
      language,
      categoryFilter?.enabled,
      categoryFilter?.filterVersion,
      categoryFilterPredicate,
    ]
  );

  return {
    ...stream,
    retry: () => {
      void queueQuery.refetch();
    },
    isRefetching: queueQuery.isFetching && queueQuery.isError,
  };
}
