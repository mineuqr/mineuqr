import type { QueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";

type TrpcUtils = ReturnType<typeof trpc.useUtils>;

/** Keep auth.me warm across remounts; login still forces a fresh fetch. */
export const AUTH_ME_STALE_MS = 60_000;

export const authMeQueryOptions = {
  retry: false as const,
  refetchOnWindowFocus: false as const,
  staleTime: AUTH_ME_STALE_MS,
  gcTime: AUTH_ME_STALE_MS * 5,
};

const authDebug =
  import.meta.env.DEV && import.meta.env.VITE_AUTH_DEBUG === "1";

function isAuthMeQuery(query: { queryKey: readonly unknown[] }): boolean {
  const head = query.queryKey[0];
  return Array.isArray(head) && head[0] === "auth" && head[1] === "me";
}

/**
 * True while the initial auth.me request has not settled (no data yet).
 * Used to avoid treating "still loading" as logged out (global 401 redirect).
 */
export function isAuthMeInitialLoadPending(queryClient: QueryClient): boolean {
  const match = queryClient.getQueryCache().findAll({
    predicate: (q) => isAuthMeQuery(q),
  })[0];

  if (!match) return true;
  if (match.state.data !== undefined) return false;
  return (
    match.state.status === "pending" || match.state.fetchStatus === "fetching"
  );
}

/**
 * Single auth.me fetch after login sets the React Query cache before navigation.
 * Prefer over invalidate() to avoid duplicate refetch loops with mounted useAuth hooks.
 */
export async function syncAuthAfterLogin(utils: TrpcUtils) {
  const user = await utils.auth.me.fetch(undefined, { staleTime: 0 });
  if (authDebug) {
    console.info("[Auth] auth.me synced after login", { userId: user?.id ?? null });
  }
  return user;
}
