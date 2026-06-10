# REBUILD-5EB — Security Ownership Adoption

**Program:** ADMIN-DASHBOARD-REBUILD-5E  
**Phase:** 5EB — Security Asset Adoption

---

## Registered Security Assets (REBUILD-5B → 5E)

### Accounts workspace (hosted in CS, Security-owned)

| Asset ID | Composition owner | API |
|----------|-------------------|-----|
| `security-role-edit` | `SecurityRolesSection` | `admin.updateUserRole` |
| `security-classification-edit` | `SecurityClassificationSection` | `admin.updateAccountClassification` |
| `security-create-internal-user` | `SecurityAccountControlsSection` | `admin.createInternalUser` |
| `security-delete-user` | `SecurityAccountControlsSection` | `admin.deleteUser` |
| `security-platform-account-guards` | `SecurityGovernanceSection` | `shared/platformAccount` |
| `security-self-guard` | `SecurityGovernanceSection` | — |

### Auth governance

| Asset ID | Module |
|----------|--------|
| `auth-gate-useAuthGate` | `_core/hooks/useAuthGate` |
| `auth-gate-components` | `components/AuthGate` |
| `auth-gate-adminQueriesEnabled` | `lib/queryRuntime.ts` |
| `server-assert-admin-access` | `server/_core/assertAdminAccess.ts` |

### Session & threat infrastructure

| Asset ID | Module |
|----------|--------|
| `server-session-revocation` | `server/_core/sessionRevocation.ts` |
| `server-auth-audit` | `server/_core/authAudit.ts` |
| `server-suspicious-activity` | `server/_core/suspiciousActivity.ts` |
| `server-deployment-guards` | `server/_core/deploymentGuards.ts` |

### Platform account protections

| Asset ID | Module |
|----------|--------|
| `server-platform-account` | `server/platformAccount.ts` |
| `helper-is-protected-platform-account-user` | `shared/platformAccount.ts` |
| `server-cascade-audit` | `server/db/cascadeAudit.ts` |
| `server-cascade-deletes` | `server/db/cascadeDeletes.ts` |
| `server-account-classification-audit` | `server/accountClassificationAudit.ts` |

### Unwired APIs (registered, behavior unchanged)

| Asset ID | Procedure |
|----------|-----------|
| `api-reset-subscriber-password` | `admin.resetSubscriberPassword` |
| `api-list-all-users` | `admin.listAllUsers` |

### Diagnostics & readiness

| Asset ID | Surface |
|----------|---------|
| `security-diagnostics-readiness` | `SecurityDiagnosticsSection` (server modules; no viewer UI) |
| `security-readiness-indicators` | `SecurityReadinessSection` (auth gate re-exports) |

---

## Single Owner Rule

Every security asset has exactly one Security domain owner in `SECURITY_ASSET_DEFINITIONS`. No dual ownership with Customer Success or Reports.

Customer Success retains **host** responsibility for accounts workspace display only.
