import { useCommercialEntitlements } from "@/hooks/useCommercialEntitlements";

/**
 * REBUILD-5F — Health domain data hook for commercial diagnostics page.
 * Wraps existing entitlements query; behavior unchanged.
 */
export function useHealthCommercialDiagnosticsData() {
  return useCommercialEntitlements();
}
