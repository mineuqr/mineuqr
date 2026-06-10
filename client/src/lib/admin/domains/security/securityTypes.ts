/** REBUILD-5E — Security platform domain type contracts. */

export type SecurityDomainId = "security";

export type SecurityAssetCategory =
  | "governance"
  | "roles"
  | "classification"
  | "account-controls"
  | "auth"
  | "session"
  | "diagnostics"
  | "readiness"
  | "api"
  | "helper"
  | "server";

export type SecurityAssetId =
  | "security-role-edit"
  | "security-classification-edit"
  | "security-create-internal-user"
  | "security-delete-user"
  | "security-platform-account-guards"
  | "security-self-guard"
  | "auth-gate-useAuthGate"
  | "auth-gate-components"
  | "auth-gate-adminQueriesEnabled"
  | "api-update-user-role"
  | "api-update-account-classification"
  | "api-create-internal-user"
  | "api-delete-user"
  | "api-reset-subscriber-password"
  | "api-list-all-users"
  | "helper-account-classification-display"
  | "helper-is-protected-platform-account-user"
  | "server-platform-account"
  | "server-account-classification-audit"
  | "server-cascade-audit"
  | "server-cascade-deletes"
  | "server-deployment-guards"
  | "server-session-revocation"
  | "server-auth-audit"
  | "server-suspicious-activity"
  | "server-assert-admin-access"
  | "security-diagnostics-readiness"
  | "security-readiness-indicators";

/** Security-owned controls physically hosted in CS accounts workspace. */
export type SecurityAccountsHostedAssetId =
  | "security-role-edit"
  | "security-classification-edit"
  | "security-create-internal-user"
  | "security-delete-user"
  | "security-platform-account-guards"
  | "security-self-guard";

export type SecuritySurfaceId = "operations" | "auth" | "infrastructure";

export type SecurityAssetDefinition = {
  id: SecurityAssetId;
  category: SecurityAssetCategory;
  /** Primary component or module path. */
  ownerPath: string;
  /** tRPC procedure when applicable. */
  queryKey?: string;
  /** Admin routes or cross-cutting surfaces where this asset applies. */
  surfaces: SecuritySurfaceId[];
  /** When true, asset is rendered inside CS accounts workspace (host ≠ owner). */
  hostedInAccountsWorkspace?: boolean;
};
