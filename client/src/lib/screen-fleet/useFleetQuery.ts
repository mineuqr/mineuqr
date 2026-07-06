import { useCallback, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import type { FleetQueryInput, FleetScreenReadModel } from "./fleetReadModel";
import { DEFAULT_FLEET_PAGE_SIZE } from "./fleetReadModel";

/**
 * Fleet query hook — search/filter/sort/pagination delegated to server fleet API.
 */
export function useFleetQuery(params: {
  restaurantId: number;
  enabled: boolean;
  query: Omit<FleetQueryInput, "restaurantId">;
}) {
  const { restaurantId, enabled, query } = params;
  const utils = trpc.useUtils();

  const [extraItems, setExtraItems] = useState<FleetScreenReadModel[]>([]);
  const [loadedNextCursor, setLoadedNextCursor] = useState<string | null | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const kpiQuery = trpc.operationalDevice.fleet.getKpis.useQuery(
    { restaurantId },
    { enabled, refetchInterval: enabled ? 30_000 : false }
  );

  const listQuery = trpc.operationalDevice.fleet.queryScreens.useQuery(
    {
      restaurantId,
      ...query,
      limit: query.limit ?? DEFAULT_FLEET_PAGE_SIZE,
    },
    { enabled, refetchInterval: enabled ? 30_000 : false }
  );

  useEffect(() => {
    setExtraItems([]);
    setLoadedNextCursor(undefined);
  }, [listQuery.dataUpdatedAt, query.search, query.role, query.operationalState, query.sortBy]);

  const baseItems = listQuery.data?.items ?? [];
  const items = [...baseItems, ...extraItems];
  const pageCursor = listQuery.data?.cursor ?? null;
  const nextCursor =
    loadedNextCursor !== undefined ? loadedNextCursor : (pageCursor?.nextCursor ?? null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await utils.operationalDevice.fleet.queryScreens.fetch({
        restaurantId,
        ...query,
        limit: query.limit ?? DEFAULT_FLEET_PAGE_SIZE,
        cursor: nextCursor,
      });
      setExtraItems((prev) => [...prev, ...page.items]);
      setLoadedNextCursor(page.cursor.nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, nextCursor, query, restaurantId, utils.operationalDevice.fleet.queryScreens]);

  return {
    items,
    groups: listQuery.data?.groups ?? null,
    cursor: pageCursor,
    observability: listQuery.data?.observability ?? null,
    kpis: kpiQuery.data,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    isError: listQuery.isError,
    error: listQuery.error,
    isLoadingMore,
    hasMore: nextCursor != null,
    loadMore,
    refetch: listQuery.refetch,
  };
}
