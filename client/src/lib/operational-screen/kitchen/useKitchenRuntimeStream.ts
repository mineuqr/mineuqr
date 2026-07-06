import { useMemo } from "react";
import { DATA_POLL_INTERVAL_MS } from "../bootstrapLogic";
import { screenTrpc } from "../screenTrpc";
import { useScreenRuntime } from "@/components/operational-screen/OperationalScreenRuntimeProvider";
import { applyKitchenCategoryFilter } from "./applyKitchenCategoryFilter";
import {
  normalizeKitchenReadModel,
  queueHasCategoryData,
  type KitchenRuntimeQueue,
} from "./kitchenRuntimeReadModel";

function useVisiblePollingEnabled(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

export type KitchenRuntimeStream = {
  queue: KitchenRuntimeQueue | null;
  isLoading: boolean;
  isFiltered: boolean;
  missingCategoryData: boolean;
};

/**
 * Kitchen runtime stream — fetch read model, apply category filter in runtime layer.
 * Presentation consumes the filtered stream only.
 */
export function useKitchenRuntimeStream(): KitchenRuntimeStream {
  const { categoryFilter, categoryFilterPredicate } = useScreenRuntime();
  const visible = useVisiblePollingEnabled();

  const queueQuery = screenTrpc.operationalDevice.runtime.getKitchenQueue.useQuery(
    { status: "all", limit: 200 },
    {
      refetchInterval: visible ? DATA_POLL_INTERVAL_MS : false,
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
        missingCategoryData: false,
      };
    }

    const readModel = normalizeKitchenReadModel(queueQuery.data);
    const missingCategoryData =
      categoryFilter?.enabled === true && !queueHasCategoryData(readModel);

    const filtered = applyKitchenCategoryFilter(readModel, categoryFilterPredicate, {
      missingCategoryData,
    });

    return {
      queue: filtered,
      isLoading: queueQuery.isLoading,
      isFiltered: categoryFilter?.enabled === true && !missingCategoryData,
      missingCategoryData,
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
