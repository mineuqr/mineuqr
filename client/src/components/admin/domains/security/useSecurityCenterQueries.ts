import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";

/** Shared PR-7 Security Center data hooks — gated by adminQueriesEnabled. */
export function useSecurityCenterQueries() {
  const gate = useAuthGate();
  const adminEnabled = adminQueriesEnabled(
    gate.authPending,
    gate.isAuthenticated,
    gate.user?.role === "admin"
  );

  const healthQuery = trpc.admin.getSecurityHealth.useQuery(undefined, {
    enabled: adminEnabled,
  });

  const statsQuery = trpc.admin.getAuditEventStats.useQuery(
    {},
    { enabled: adminEnabled }
  );

  return {
    gate,
    adminEnabled,
    healthQuery,
    statsQuery,
  };
}
