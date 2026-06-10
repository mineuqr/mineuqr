import type { SecurityAssetDefinition, SecurityAccountsHostedAssetId } from "./securityTypes";

export const SECURITY_DOMAIN_ID = "security" as const;

/** REBUILD-5E — canonical Security domain asset registry (ownership metadata). */
export const SECURITY_ASSET_DEFINITIONS: SecurityAssetDefinition[] = [
  // ── Accounts workspace governance (hosted in CS, Security-owned) ──
  {
    id: "security-role-edit",
    category: "roles",
    ownerPath: "components/admin/domains/security/SecurityRolesSection",
    queryKey: "admin.updateUserRole",
    surfaces: ["operations"],
    hostedInAccountsWorkspace: true,
  },
  {
    id: "security-classification-edit",
    category: "classification",
    ownerPath: "components/admin/domains/security/SecurityClassificationSection",
    queryKey: "admin.updateAccountClassification",
    surfaces: ["operations"],
    hostedInAccountsWorkspace: true,
  },
  {
    id: "security-create-internal-user",
    category: "account-controls",
    ownerPath: "components/admin/domains/security/SecurityAccountControlsSection",
    queryKey: "admin.createInternalUser",
    surfaces: ["operations"],
    hostedInAccountsWorkspace: true,
  },
  {
    id: "security-delete-user",
    category: "governance",
    ownerPath: "components/admin/domains/security/SecurityAccountControlsSection",
    queryKey: "admin.deleteUser",
    surfaces: ["operations"],
    hostedInAccountsWorkspace: true,
  },
  {
    id: "security-platform-account-guards",
    category: "governance",
    ownerPath: "components/admin/domains/security/SecurityGovernanceSection",
    surfaces: ["operations"],
    hostedInAccountsWorkspace: true,
  },
  {
    id: "security-self-guard",
    category: "governance",
    ownerPath: "components/admin/domains/security/SecurityGovernanceSection",
    surfaces: ["operations"],
    hostedInAccountsWorkspace: true,
  },

  // ── Auth gate infrastructure ──
  {
    id: "auth-gate-useAuthGate",
    category: "auth",
    ownerPath: "_core/hooks/useAuthGate",
    surfaces: ["auth"],
  },
  {
    id: "auth-gate-components",
    category: "auth",
    ownerPath: "components/AuthGate",
    surfaces: ["auth"],
  },
  {
    id: "auth-gate-adminQueriesEnabled",
    category: "auth",
    ownerPath: "lib/queryRuntime.ts",
    surfaces: ["auth"],
  },

  // ── Admin APIs ──
  {
    id: "api-update-user-role",
    category: "api",
    ownerPath: "server/routers.ts",
    queryKey: "admin.updateUserRole",
    surfaces: ["operations"],
  },
  {
    id: "api-update-account-classification",
    category: "api",
    ownerPath: "server/routers.ts",
    queryKey: "admin.updateAccountClassification",
    surfaces: ["operations"],
  },
  {
    id: "api-create-internal-user",
    category: "api",
    ownerPath: "server/routers.ts",
    queryKey: "admin.createInternalUser",
    surfaces: ["operations"],
  },
  {
    id: "api-delete-user",
    category: "api",
    ownerPath: "server/routers.ts",
    queryKey: "admin.deleteUser",
    surfaces: ["operations"],
  },
  {
    id: "api-reset-subscriber-password",
    category: "api",
    ownerPath: "server/routers.ts",
    queryKey: "admin.resetSubscriberPassword",
    surfaces: ["infrastructure"],
  },
  {
    id: "api-list-all-users",
    category: "api",
    ownerPath: "server/routers.ts",
    queryKey: "admin.listAllUsers",
    surfaces: ["infrastructure"],
  },

  // ── Client helpers ──
  {
    id: "helper-account-classification-display",
    category: "helper",
    ownerPath: "lib/admin/accountClassificationDisplay.ts",
    surfaces: ["operations"],
  },
  {
    id: "helper-is-protected-platform-account-user",
    category: "helper",
    ownerPath: "shared/platformAccount.ts",
    surfaces: ["operations"],
  },

  // ── Server security modules ──
  {
    id: "server-platform-account",
    category: "server",
    ownerPath: "server/platformAccount.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "server-account-classification-audit",
    category: "server",
    ownerPath: "server/accountClassificationAudit.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "server-cascade-audit",
    category: "server",
    ownerPath: "server/db/cascadeAudit.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "server-cascade-deletes",
    category: "server",
    ownerPath: "server/db/cascadeDeletes.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "server-deployment-guards",
    category: "server",
    ownerPath: "server/_core/deploymentGuards.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "server-session-revocation",
    category: "server",
    ownerPath: "server/_core/sessionRevocation.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "server-auth-audit",
    category: "server",
    ownerPath: "server/_core/authAudit.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "server-suspicious-activity",
    category: "server",
    ownerPath: "server/_core/suspiciousActivity.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "server-assert-admin-access",
    category: "server",
    ownerPath: "server/_core/assertAdminAccess.ts",
    surfaces: ["auth", "infrastructure"],
  },

  // ── Diagnostics & readiness (server-side today; no Security Center UI) ──
  {
    id: "security-diagnostics-readiness",
    category: "diagnostics",
    ownerPath: "components/admin/domains/security/SecurityDiagnosticsSection",
    surfaces: ["infrastructure"],
  },
  {
    id: "security-readiness-indicators",
    category: "readiness",
    ownerPath: "components/admin/domains/security/SecurityReadinessSection",
    surfaces: ["auth"],
  },
];

/** Security-owned assets physically hosted in Customer Success accounts workspace. */
export const SECURITY_ACCOUNTS_HOSTED_ASSETS: SecurityAccountsHostedAssetId[] = [
  "security-role-edit",
  "security-classification-edit",
  "security-create-internal-user",
  "security-delete-user",
  "security-platform-account-guards",
  "security-self-guard",
];

export const SECURITY_COMPOSITION_SECTIONS = [
  "SecurityGovernanceSection",
  "SecurityRolesSection",
  "SecurityClassificationSection",
  "SecurityAccountControlsSection",
  "SecurityDiagnosticsSection",
  "SecurityReadinessSection",
] as const;
