import { trpc } from "@/lib/trpc";

type TrpcUtils = ReturnType<typeof trpc.useUtils>;

const authDebug =
  import.meta.env.DEV && import.meta.env.VITE_AUTH_DEBUG === "1";

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
