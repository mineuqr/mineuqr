/**
 * Kitchen / Expo runtime stream — fetch read model, apply category filter in runtime layer.
 * Presentation consumes the filtered stream only.
 *
 * REALTIME-KITCHEN-ADOPTION-1 — kitchen_display → kitchen channel
 * REALTIME-EXPO-ADOPTION-1 — expo_display → expo channel
 */

import { useEffect, useMemo } from "react";
import {
  DATA_POLL_INTERVAL_MS,
  DATA_POLL_REALTIME_RECOVERY_MS,
} from "../bootstrapLogic";
import { screenTrpc } from "../screenTrpc";
import { useScreenRuntime } from "@/components/operational-screen/OperationalScreenRuntimeProvider";
import { isCapabilitySupported } from "@/lib/operational-screen/capability/resolveCapabilityPresentation";
import {
  buildKitchenRuntimeStream,
  type KitchenProjectionDiagnostics,
  type KitchenRuntimeStream,
} from "./buildKitchenRuntimeStream";
import { useKitchenArrivalNotifications } from "./useKitchenArrivalNotifications";
import { noteOrderLifecycleObserverRefresh } from "@/lib/order-lifecycle-latency";
import { subscribeOrderLifecycleUpdates } from "@/lib/order-lifecycle-latency/orderLifecycleBroadcast";
import { kitchenQueueStructuralSharing } from "@/lib/read-freshness/queryStructuralSharing";
import { scheduleKitchenQueueInvalidation } from "./kitchenQueueInvalidationCoordinator";
import { useKitchenRuntimeRealtime } from "./useKitchenRuntimeRealtime";
import { useExpoRuntimeRealtime } from "./useExpoRuntimeRealtime";

export type { KitchenProjectionDiagnostics, KitchenRuntimeStream };

function useVisiblePollingEnabled(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

export function useKitchenRuntimeStream(): KitchenRuntimeStream & {
  retry: () => void;
  isRefetching: boolean;
} {
  const { categoryFilter, categoryFilterPredicate, context, configurationHealth, rolePlatform, screenState } =
    useScreenRuntime();
  const visible = useVisiblePollingEnabled();
  const kitchenQueueSupported = isCapabilitySupported(context?.runtimeCapabilities, "kitchen_queue");
  const language = context?.presentation.language ?? "en";
  const restaurantId = context?.identity.restaurantId;
  const role = context?.identity.role;

  const utils = screenTrpc.useUtils();

  const onInvalidate = () => {
    void utils.operationalDevice.runtime.getKitchenQueue.invalidate();
  };

  const kitchenRt = useKitchenRuntimeRealtime({
    restaurantId,
    enabled: kitchenQueueSupported,
    role,
    onInvalidate,
  });
  const expoRt = useExpoRuntimeRealtime({
    restaurantId,
    enabled: kitchenQueueSupported,
    role,
    onInvalidate,
  });
  const realtimePrimary = kitchenRt.realtimePrimary || expoRt.realtimePrimary;

  const pollMs = realtimePrimary ? DATA_POLL_REALTIME_RECOVERY_MS : DATA_POLL_INTERVAL_MS;

  const queueQuery = screenTrpc.operationalDevice.runtime.getKitchenQueue.useQuery(
    { status: "all", limit: 200 },
    {
      enabled: kitchenQueueSupported,
      refetchInterval: visible && kitchenQueueSupported ? pollMs : false,
      refetchOnWindowFocus: true,
      placeholderData: (prev) => prev,
      structuralSharing: kitchenQueueStructuralSharing,
    }
  );

  useEffect(() => {
    if (!queueQuery.isSuccess || queueQuery.isFetching) return;
    noteOrderLifecycleObserverRefresh({
      surface: "kitchen-runtime-stream",
      restaurantId,
    });
  }, [
    queueQuery.dataUpdatedAt,
    queueQuery.isSuccess,
    queueQuery.isFetching,
    restaurantId,
  ]);

  useEffect(() => {
    if (!restaurantId || !kitchenQueueSupported) return;
    return subscribeOrderLifecycleUpdates(restaurantId, () => {
      scheduleKitchenQueueInvalidation({
        restaurantId,
        invalidate: () => {
          void queueQuery.refetch();
        },
      });
    });
  }, [restaurantId, kitchenQueueSupported, queueQuery.refetch]);

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

  // KITCHEN-NOTIFICATION-ARCHITECTURE-1 — unchanged; runs after queue refresh only.
  useKitchenArrivalNotifications({
    enabled: kitchenQueueSupported,
    queue: stream.queue,
    isLoading: stream.isLoading,
    isError: stream.isError,
    isShowingStaleData: stream.isShowingStaleData,
    categoryFilterVersion: categoryFilter?.filterVersion ?? 0,
    configurationVersion: configurationHealth?.configurationVersion ?? null,
    reconnectCount: rolePlatform.reconnectCount,
    connectivityState: screenState?.connectivityState ?? "connecting",
  });

  return {
    ...stream,
    retry: () => {
      void queueQuery.refetch();
    },
    isRefetching: queueQuery.isFetching && queueQuery.isError,
  };
}
