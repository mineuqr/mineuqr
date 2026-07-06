import { useMemo } from "react";
import { DATA_POLL_INTERVAL_MS } from "../bootstrapLogic";
import { screenTrpc } from "../screenTrpc";
import { useScreenRuntime } from "@/components/operational-screen/OperationalScreenRuntimeProvider";
import { isCapabilitySupported } from "@/lib/operational-screen/capability/resolveCapabilityPresentation";
import { applyKitchenCategoryFilter } from "./applyKitchenCategoryFilter";
import { normalizeKitchenReadModel, type KitchenRuntimeQueue } from "./kitchenRuntimeReadModel";
import type { CategoryProjectionReadMeta } from "@/lib/kitchen/categoryProjection";

function useVisiblePollingEnabled(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

export type KitchenProjectionDiagnostics = CategoryProjectionReadMeta & {
  projectionSchemaVersion: number;
};

export type KitchenRuntimeStream = {
  queue: KitchenRuntimeQueue | null;
  isLoading: boolean;
  isFiltered: boolean;
  projectionDiagnostics: KitchenProjectionDiagnostics | null;
};

/**
 * Kitchen runtime stream — fetch read model, apply category filter in runtime layer.
 * Presentation consumes the filtered stream only.
 */
export function useKitchenRuntimeStream(): KitchenRuntimeStream {
  const { categoryFilter, categoryFilterPredicate, context } = useScreenRuntime();
  const visible = useVisiblePollingEnabled();
  const kitchenQueueSupported = isCapabilitySupported(context?.runtimeCapabilities, "kitchen_queue");

  const queueQuery = screenTrpc.operationalDevice.runtime.getKitchenQueue.useQuery(
    { status: "all", limit: 200 },
    {
      enabled: kitchenQueueSupported,
      refetchInterval: visible && kitchenQueueSupported ? DATA_POLL_INTERVAL_MS : false,
      refetchOnWindowFocus: true,
      placeholderData: (prev) => prev,
    }
  );

  const stream = useMemo<KitchenRuntimeStream>(() => {
    if (!queueQuery.data) {
      return {
        queue: null,
        isLoading: queueQuery.isLoading,
        isFiltered: false,
        projectionDiagnostics: null,
      };
    }

    const readModel = normalizeKitchenReadModel(queueQuery.data);
    const filtered = applyKitchenCategoryFilter(readModel, categoryFilterPredicate);

    return {
      queue: filtered,
      isLoading: queueQuery.isLoading,
      isFiltered: categoryFilter?.enabled === true,
      projectionDiagnostics: readModel.projection,
    };
  }, [
    queueQuery.data,
    queueQuery.isLoading,
    categoryFilter?.enabled,
    categoryFilter?.filterVersion,
    categoryFilterPredicate,
  ]);

  return stream;
}
