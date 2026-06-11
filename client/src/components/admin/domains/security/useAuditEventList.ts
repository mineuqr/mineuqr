import { useCallback, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { appendAuditEventPage } from "./auditEventDisplay";
import { AUDIT_LIST_PAGE_SIZE } from "./auditEventConstants";

export type AuditListFilter = {
  eventType?: string;
  category?: "ACCESS" | "USER" | "SUBSCRIPTION" | "COMMERCIAL" | "SECURITY";
};

/** Cursor-paginated audit list — fetches one page at a time via PR-6 limits. */
export function useAuditEventList(params: {
  enabled: boolean;
  filter: AuditListFilter;
}) {
  const { enabled, filter } = params;
  const utils = trpc.useUtils();

  const [items, setItems] = useState<
    Awaited<ReturnType<typeof utils.admin.listAuditEvents.fetch>>["items"]
  >([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const listQuery = trpc.admin.listAuditEvents.useQuery(
    {
      ...filter,
      limit: AUDIT_LIST_PAGE_SIZE,
    },
    { enabled, staleTime: 30_000 }
  );

  useEffect(() => {
    if (!listQuery.data) return;
    setItems(listQuery.data.items);
    setNextCursor(listQuery.data.nextCursor);
  }, [listQuery.data]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await utils.admin.listAuditEvents.fetch({
        ...filter,
        limit: AUDIT_LIST_PAGE_SIZE,
        cursor: nextCursor,
      });
      setItems((prev) => appendAuditEventPage(prev, page.items));
      setNextCursor(page.nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  }, [filter, isLoadingMore, nextCursor, utils.admin.listAuditEvents]);

  return {
    items,
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    isLoadingMore,
    hasMore: nextCursor != null,
    loadMore,
    refetch: listQuery.refetch,
  };
}
