import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { commercialEntitlementsQueryEnabled } from "@/lib/commercial/entitlementsDisplay";
import { trpc } from "@/lib/trpc";

export type UseCommercialEntitlementsOptions = {
  /** Override default enabled rule (auth resolved + authenticated). */
  enabled?: boolean;
};

/**
 * Read-only hook for canonical commercial entitlements (PG-1C.3A).
 * Does not gate mutations or replace legacy subscription checks.
 */
export function useCommercialEntitlements(options?: UseCommercialEntitlementsOptions) {
  const gate = useAuthGate();
  const queryEnabled = commercialEntitlementsQueryEnabled(
    gate.authResolved,
    gate.isAuthenticated,
    options?.enabled
  );

  const query = trpc.commercial.getEntitlements.useQuery(undefined, {
    enabled: queryEnabled,
  });

  return {
    context: query.data?.context ?? null,
    entitlements: query.data?.entitlements ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isReady: queryEnabled && !query.isLoading && !query.isError && query.data != null,
    queryEnabled,
  };
}
