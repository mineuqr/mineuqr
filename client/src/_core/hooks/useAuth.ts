import { authMeQueryOptions } from "@/lib/authSession";
import { getLoginUrl, spaNavigate } from "@/const";
import { trpc } from "@/lib/trpc";
import { getRealtimePlatform } from "@/lib/realtime-platform";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";
import { useLocation } from "wouter";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();
  const [pathname] = useLocation();

  const meQuery = trpc.auth.me.useQuery(undefined, authMeQueryOptions);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      // Keep client session empty; do not invalidate/refetch auth.me here — a surviving
      // cookie would rehydrate the user immediately after logout.
      utils.auth.me.setData(undefined, null);
      localStorage.removeItem("manus-runtime-user-info");
      try {
        getRealtimePlatform().disconnect();
      } catch {
        /* platform may be idle */
      }
    }
  }, [logoutMutation, utils]);

  const authPending = meQuery.isPending && meQuery.data === undefined;

  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    return {
      user: meQuery.data ?? null,
      /** Initial auth.me in flight — not the same as "logged out". */
      authPending,
      authResolved: !authPending,
      loading: authPending || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    authPending,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (authPending || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (pathname === redirectPath) return;

    spaNavigate(redirectPath);
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    authPending,
    state.user,
    pathname,
  ]);

  return {
    ...state,
    /** Prefer syncAuthAfterLogin() immediately after POST /api/auth/login. */
    refresh: () => meQuery.refetch(),
    logout,
  };
}
