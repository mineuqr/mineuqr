import { useAuth } from "@/_core/hooks/useAuth";

export type AuthGateStatus = "pending" | "authenticated" | "unauthenticated";

/**
 * UI-only auth resolution helper. Does not change session/auth.me behavior.
 * Use before rendering access denied, login required, redirects, or protected empty states.
 */
export function useAuthGate() {
  const auth = useAuth();

  const status: AuthGateStatus = auth.authPending
    ? "pending"
    : auth.isAuthenticated
      ? "authenticated"
      : "unauthenticated";

  return {
    ...auth,
    status,
    /** auth.me initial load still in flight */
    isPending: status === "pending",
    /** authResolved && logged in */
    isAuthed: status === "authenticated",
    /** authResolved && logged out */
    isGuest: status === "unauthenticated",
    isAdmin: auth.user?.role === "admin",
    /** Safe to show access-denied / login-required UI (not while pending) */
    canShowAuthOutcome: auth.authResolved,
    /** After resolution: user is admin */
    showAdminAllowed: auth.authResolved && auth.isAuthenticated && auth.user?.role === "admin",
    /** After resolution: show admin access denied */
    showAdminDenied:
      auth.authResolved &&
      (!auth.isAuthenticated || auth.user?.role !== "admin"),
    /** After resolution: show login required */
    showLoginRequired: auth.authResolved && !auth.isAuthenticated,
  };
}
