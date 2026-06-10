/**
 * REBUILD-5E — Security readiness ownership surface.
 * Auth gate and query-enablement indicators used across admin pages.
 */
export { useAuthGate } from "@/_core/hooks/useAuthGate";
export { adminQueriesEnabled } from "@/lib/queryRuntime";
export { AuthGatePending, AdminAccessDenied } from "@/components/AuthGate";

/** Placeholder for future Security Center readiness panel. */
export function SecurityReadinessSection() {
  return null;
}
