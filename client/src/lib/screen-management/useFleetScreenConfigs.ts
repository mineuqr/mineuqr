import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Presentation-only enrichment for fleet cards (category summary).
 * Fleet query remains the primary read path; this does not replace useFleetQuery.
 */
export function useFleetScreenConfigs(restaurantId: number, enabled: boolean) {
  const listQuery = trpc.operationalDevice.management.list.useQuery(
    { restaurantId },
    { enabled: enabled && restaurantId > 0 }
  );

  const visibleCategoryIdsByScreenId = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const device of listQuery.data ?? []) {
      map.set(device.deviceId, device.screenConfig?.visibleCategoryIds ?? []);
    }
    return map;
  }, [listQuery.data]);

  return {
    visibleCategoryIdsByScreenId,
    isLoading: listQuery.isLoading,
  };
}
