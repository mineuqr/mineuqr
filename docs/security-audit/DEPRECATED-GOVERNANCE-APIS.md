# DEPRECATED-GOVERNANCE-APIS — Security Center API Deprecation Inventory

**Program:** ADMIN-SECURITY-CENTER  
**PR:** PR-9 (read-only deprecation phase)  
**Date:** 2026-06-11  
**Status:** Active — deprecation markers + `deprecated_api_used` observability  

**Scope:** Governance APIs made redundant by Security Center and canonical `admin.*` namespace.  
**Not in scope:** PR-10 removals, DB migration governance, unrelated EXEC-6 / AUTHORITY-CLEANUP deprecations.

---

## Executive summary

| Category | Count | PR-9 action |
|----------|------:|-------------|
| Security Center removal candidates (`profile.*` governance) | 3 | `@deprecated` + `deprecated_api_used` |
| Legacy audit read APIs | 0 | N/A — net-new in PR-6 |
| Superseded by Security Center read APIs (historical) | 0 tRPC | opsLog-only visibility pre-PR-5 |
| Related deprecations (other programs) | 5+ | Documented; no PR-9 emitter |

---

## PR-9 removal candidates (Security Center Phase D)

### `profile.listAllUsers`

| Field | Value |
|-------|-------|
| **Router** | `profileRouter` (`server/routers.ts`) |
| **Procedure** | `profile.listAllUsers` |
| **Purpose** | Admin list of all platform users (duplicate of `admin.listAllUsers`) |
| **Current callers** | **None** in `client/`; no server tests invoke tRPC path |
| **Replacement API** | `admin.listAllUsers` |
| **Deprecation Status** | **Deprecated** (PR-9) — emits `deprecated_api_used` |
| **Removal Candidate** | **Yes** (PR-10) |

### `profile.updateUserRole`

| Field | Value |
|-------|-------|
| **Router** | `profileRouter` (`server/routers.ts`) |
| **Procedure** | `profile.updateUserRole` |
| **Purpose** | Admin role mutation (duplicate escalation path) |
| **Current callers** | **None** in `client/`; Security Center uses `admin.updateUserRole` via `useSecurityAccountGovernance.ts` |
| **Replacement API** | `admin.updateUserRole` |
| **Deprecation Status** | **Deprecated** (PR-9) — emits `deprecated_api_used` |
| **Removal Candidate** | **Yes** (PR-10) |

### `profile.deleteUser`

| Field | Value |
|-------|-------|
| **Router** | `profileRouter` (`server/routers.ts`) |
| **Procedure** | `profile.deleteUser` |
| **Purpose** | Admin user cascade delete (duplicate path) |
| **Current callers** | **None** in `client/`; Security Center uses `admin.deleteUser` |
| **Replacement API** | `admin.deleteUser` |
| **Deprecation Status** | **Deprecated** (PR-9) — emits `deprecated_api_used` |
| **Removal Candidate** | **Yes** (PR-10) |

---

## Security Center canonical read APIs (replacements — not deprecated)

These are the **target** APIs for audit visibility. No prior tRPC read layer existed.

| Procedure | Router | Purpose | Client consumers |
|-----------|--------|---------|------------------|
| `admin.listAuditEvents` | `adminAuditRouter` | Paginated audit timeline + filtered governance views | `useAuditEventList`, Timeline / Role / Subscription sections |
| `admin.getAuditEvent` | `adminAuditRouter` | Single event detail drawer | `AuditEventDetailDrawer` |
| `admin.getAuditEventStats` | `adminAuditRouter` | Overview KPIs (7-day default) | `useSecurityCenterQueries` → `SecurityOverviewSection` |
| `admin.getSecurityHealth` | `adminAuditRouter` | Platform protection + audit persistence posture | Health, Warnings, Protected Accounts, banner |

**Historical note:** Pre-PR-5/PR-6, governance visibility relied on `opsLog` transport only. There were **no** legacy tRPC audit read procedures to deprecate.

---

## Canonical `admin.*` governance mutations (active — not deprecated)

| Procedure | Purpose | Client consumers | Security Center relation |
|-----------|---------|------------------|--------------------------|
| `admin.listAllUsers` | User list with optional classification filter | Registry metadata only; unwired in UI | Accounts governance metadata |
| `admin.updateUserRole` | Role mutation + `user_role_changed` audit | `useSecurityAccountGovernance.ts` | Protected Accounts controls |
| `admin.deleteUser` | User cascade delete | `useSecurityAccountGovernance.ts` | Protected Accounts controls |
| `admin.updateAccountClassification` | Classification mutation | `useSecurityAccountGovernance.ts` | Protected Accounts controls |
| `admin.createInternalUser` | Internal staff provisioning | `useSecurityAccountGovernance.ts` | Protected Accounts controls |
| `admin.createUserSubscriptionByAdmin` | Subscription create | `CustomerSuccessAccountsSection` | Subscription Changes filter in Security Center |
| `admin.updateUserSubscriptionByAdmin` | Subscription update | `CustomerSuccessAccountsSection` | Subscription Changes filter |
| `admin.deleteUserSubscriptionByAdmin` | Subscription delete | `CustomerSuccessAccountsSection` | Subscription Changes filter |

These remain canonical. Security Center **reads** their audit trail via `admin.listAuditEvents`; it does not replace mutation endpoints.

---

## Legacy / removed governance APIs (reference)

| Procedure | Status | Notes |
|-----------|--------|-------|
| `admin.listAllUsersWithSubscriptions` | **Removed** (EXEC-6) | Replaced by `admin.getOwnerOverviewList` |
| `admin.createRestaurantSubscription` | **Retired at runtime** | AUTHORITY-CLEANUP-1; throws retired guard |
| `admin.updateRestaurantSubscription` | **Retired at runtime** | Same |
| `admin.cancelRestaurantSubscription` | **Retired at runtime** | Same |
| `admin.getStatistics` | **@deprecated EXEC-6** | Statistics dual-read only; not PR-9 |
| `admin.getRevenueByMonth` | **@deprecated EXEC-6** | Statistics dual-read only; not PR-9 |

---

## Consumer verification (2026-06-11)

### Active consumers (`admin.*` — keep)

| Consumer | Procedures |
|----------|------------|
| `client/src/components/admin/domains/security/useSecurityAccountGovernance.ts` | `admin.updateUserRole`, `admin.updateAccountClassification`, `admin.createInternalUser`, `admin.deleteUser` |
| `client/src/components/admin/domains/security/useSecurityCenterQueries.ts` | `admin.getSecurityHealth`, `admin.getAuditEventStats` |
| `client/src/components/admin/domains/security/useAuditEventList.ts` | `admin.listAuditEvents` |
| `client/src/components/admin/domains/security/AuditEventDetailDrawer.tsx` | `admin.getAuditEvent` |
| `client/src/components/admin/domains/customer-success/CustomerSuccessAccountsSection.tsx` | Subscription admin mutations |

### Dead consumers (`profile.*` governance — removal safe after PR-10 gate)

| Procedure | `client/` refs | `server/` tRPC refs | External refs |
|-----------|---------------|---------------------|---------------|
| `profile.listAllUsers` | 0 | 0 (handler only) | Unknown — monitor `deprecated_api_used` |
| `profile.updateUserRole` | 0 | 0 (handler + shared helper string in tests) | Unknown |
| `profile.deleteUser` | 0 | 0 (handler only) | Unknown |

### Active non-governance `profile.*` (unchanged by PR-9)

| Procedure | Consumer |
|-----------|----------|
| `profile.get` | `Profile.tsx` |
| `profile.update` | `Profile.tsx` |
| `profile.changePassword` | `Profile.tsx` |

---

## `deprecated_api_used` event contract

| Field | Value |
|-------|-------|
| **Event type** | `deprecated_api_used` |
| **Category** | `SECURITY` |
| **Severity** | `info` |
| **Metadata** | `{ "api": "<procedure name>" }` |
| **Transport** | Dual-write: `opsLog` + `audit_events` (via `emitAuditEvent`) |
| **Failure mode** | Never throws; persistence failure logged as `audit_persist_failed` |

**Implementation:** `server/deprecatedApiAudit.ts` → `logDeprecatedApiUsed()`  
**Wired in:** `profile.listAllUsers`, `profile.updateUserRole`, `profile.deleteUser` handlers only.

---

## PR-10 removal scope recommendation

**Remove in PR-10 (after ≥30 days zero `deprecated_api_used` in production):**

1. `profile.listAllUsers` handler
2. `profile.updateUserRole` handler
3. `profile.deleteUser` handler

**Keep unchanged:**

- All `admin.*` governance and Security Center read APIs
- `profile.get`, `profile.update`, `profile.changePassword`
- `applyAdminUserRoleUpdate` shared helper (admin path only after PR-10)
- `roleChangeAudit.test.ts` scenarios using `profile.updateUserRole` procedure string → update to `admin.updateUserRole` in PR-10

**PR-10 gate query (production):**

```sql
SELECT COUNT(*) FROM audit_events
WHERE eventType = 'deprecated_api_used'
  AND occurredAt >= NOW() - INTERVAL 30 DAY;
```

Must return `0` before hard removal.

---

## Related documents

- `ADMIN-SECURITY-CENTER-IMPLEMENTATION-PLAN.md` — Phase D rollout
- `ADMIN-SECURITY-CENTER-DESIGN.md` — §6 API consolidation
- `ADMIN-SECURITY-CENTER-AUDIT.md` — duplicate path finding R4
