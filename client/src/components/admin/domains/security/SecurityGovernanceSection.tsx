/**
 * REBUILD-5E — Security governance ownership surface.
 * Platform account guards, self-guard policy, and auth gate infrastructure.
 */
export { useAuthGate } from "@/_core/hooks/useAuthGate";
export {
  AdminAccessDenied,
  AuthGatePending,
  PageDataLoading,
} from "@/components/AuthGate";
export { adminQueriesEnabled } from "@/lib/queryRuntime";

export {
  canDeleteAccountUser,
  canEditAccountGovernance,
  canMutateAccountLifecycle,
} from "./securityGovernance";

export { useSecurityAccountGovernance } from "./useSecurityAccountGovernance";
export type { SecurityAccountGovernance } from "./useSecurityAccountGovernance";
