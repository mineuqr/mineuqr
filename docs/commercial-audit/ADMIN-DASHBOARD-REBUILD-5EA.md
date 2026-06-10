# REBUILD-5EA — Security Domain Registry

**Program:** ADMIN-DASHBOARD-REBUILD-5E  
**Phase:** 5EA — Security Domain Registry  
**Mode:** Structural extraction (ownership only)

---

## Created: `client/src/lib/admin/domains/security/`

| File | Responsibility |
|------|----------------|
| `securityTypes.ts` | `SecurityAssetId`, categories, `SecurityAccountsHostedAssetId` boundary types |
| `securityDomain.ts` | `SECURITY_DOMAIN_ID`, 28 asset definitions, `SECURITY_ACCOUNTS_HOSTED_ASSETS` |
| `securityRegistry.ts` | `getSecurityAsset`, `getSecurityAccountsHostedAssets`, auth/diagnostics helpers |
| `index.ts` | Barrel exports |

---

## Domain Identity

```ts
SECURITY_DOMAIN_ID = "security"
```

---

## Asset Categories

| Category | Assets |
|----------|--------|
| `governance` | Delete user, platform guards, self-guard |
| `roles` | Role edit control |
| `classification` | Classification edit control |
| `account-controls` | Internal user creation |
| `auth` | `useAuthGate`, `AuthGate`, `adminQueriesEnabled` |
| `api` | Role, classification, internal user, delete user, unwired password/list APIs |
| `helper` | `accountClassificationDisplay`, `isProtectedPlatformAccountUser` |
| `server` | `assertAdminAccess`, audits, session, suspicious activity, platform account |
| `diagnostics` | Server audit modules (no Security Center UI yet) |
| `readiness` | Auth gate readiness indicators |

---

## Accounts Workspace Boundary

Security-owned controls **physically hosted** in Customer Success accounts workspace:

```ts
SECURITY_ACCOUNTS_HOSTED_ASSETS = [
  "security-role-edit",
  "security-classification-edit",
  "security-create-internal-user",
  "security-delete-user",
  "security-platform-account-guards",
  "security-self-guard",
]
```

Customer Success domain re-exports this list as `SECURITY_HOSTED_IN_ACCOUNTS` for backward compatibility. Owner is **Security Domain**.

---

## Composition Sections

```ts
SECURITY_COMPOSITION_SECTIONS = [
  "SecurityGovernanceSection",
  "SecurityRolesSection",
  "SecurityClassificationSection",
  "SecurityAccountControlsSection",
  "SecurityDiagnosticsSection",
  "SecurityReadinessSection",
]
```

No route or navigation changes in this phase.
