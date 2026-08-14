/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 * Owner-only query. Non-owners receive FORBIDDEN and see no control.
 */

import { trpc } from "@/lib/trpc";

export function useOwnerAccessMode() {
  const utils = trpc.useUtils();
  const query = trpc.ownerAccess.getMode.useQuery(undefined, {
    retry: false,
  });

  const code = query.error?.data?.code;
  const forbidden = code === "FORBIDDEN" || code === "UNAUTHORIZED";

  const invalidate = async () => {
    await Promise.all([
      utils.ownerAccess.getMode.invalidate(),
      utils.commercial.getEntitlements.invalidate(),
    ]);
  };

  return {
    isOwner: query.isSuccess,
    isUnavailable: query.isError && !forbidden,
    isLoading: query.isPending,
    data: query.data ?? null,
    refetch: query.refetch,
    invalidate,
  };
}
