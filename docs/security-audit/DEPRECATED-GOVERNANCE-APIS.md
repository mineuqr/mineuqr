# DEPRECATED-GOVERNANCE-APIS — Security Center API Deprecation Inventory

**Program:** ADMIN-SECURITY-CENTER  
**Removal PR:** PR-10 (2026-06-11)  
**Deprecation PR:** PR-9 (2026-06-11)  
**Status:** **REMOVED** — duplicate `profile.*` governance procedures deleted; canonical `admin.*` only  

**Scope:** Governance APIs made redundant by Security Center.  
**Out of scope:** DB migration governance (DB-MIGRATION-GOVERNANCE-1), unrelated EXEC-6 / AUTHORITY-CLEANUP deprecations.

---

## Executive summary

| Category | Count | Final state |
|----------|------:|-------------|
| Security Center removal candidates (`profile.*` governance) | 3 | **Removed** (PR-10) |
| Legacy audit read APIs | 0 | N/A — net-new in PR-6 |
| PR-9 deprecation infrastructure | 3 files | **Removed** (`deprecatedApiAudit.ts`, tests) |
| Canonical `admin.*` governance | Active | Unchanged |

---

## Removed procedures (PR-10)

### `profile.listAllUsers` — REMOVED

| Field | Value |
|-------|-------|
| **Router** | ~~`profileRouter`~~ |
| **Procedure** | `profile.listAllUsers` |
| **Purpose** | Admin list of all platform users (duplicate of `admin.listAllUsers`) |
| **Replacement API** | `admin.listAllUsers` |
| **Deprecation Status** | Deprecated PR-9 → **Removed PR-10** |
| **Removal Candidate** | **Removed** |

### `profile.updateUserRole` — REMOVED

| Field | Value |
|-------|-------|
| **Router** | ~~`profileRouter`~~ |
| **Procedure** | `profile.updateUserRole` |
| **Purpose** | Admin role mutation (duplicate escalation path) |
| **Replacement API** | `admin.updateUserRole` |
| **Deprecation Status** | Deprecated PR-9 → **Removed PR-10** |
| **Removal Candidate** | **Removed** |

### `profile.deleteUser` — REMOVED

| Field | Value |
|-------|-------|
| **Router** | ~~`profileRouter`~~ |
| **Procedure** | `profile.deleteUser` |
| **Purpose** | Admin user cascade delete (duplicate path) |
| **Replacement API** | `admin.deleteUser` |
| **Deprecation Status** | Deprecated PR-9 → **Removed PR-10** |
| **Removal Candidate** | **Removed** |

---

## Security Center canonical APIs (active)

| Procedure | Purpose |
|-----------|---------|
| `admin.listAuditEvents` | Paginated audit timeline + filtered governance views |
| `admin.getAuditEvent` | Single event detail |
| `admin.getAuditEventStats` | Overview KPIs |
| `admin.getSecurityHealth` | Platform protection + audit persistence posture |
| `admin.listAllUsers` | User list (canonical governance) |
| `admin.updateUserRole` | Role mutation + `user_role_changed` audit |
| `admin.deleteUser` | User cascade delete |

---

## PR-10 consumer verification (2026-06-11)

Post-removal repository search for `profile.listAllUsers`, `profile.updateUserRole`, `profile.deleteUser`:

| Area | References | Notes |
|------|------------|-------|
| `client/` | **0** | No tRPC consumers (unchanged from PR-9 audit) |
| `server/` (runtime code) | **0** | Procedures and `deprecatedApiAudit` removed |
| `server/` (tests) | **0** | `roleChangeAudit.test.ts` updated to `admin.updateUserRole` only |
| `docs/security-audit/` | Historical mentions only | This document + implementation plan archive context |

**Historical docs** (`docs/commercial-audit/*`, design/audit snapshots) may still mention removed procedures for audit provenance — not live API surface.

---

## Removed PR-9 infrastructure (PR-10)

| File | Action |
|------|--------|
| `server/deprecatedApiAudit.ts` | Deleted |
| `server/deprecatedApiAudit.test.ts` | Deleted |
| `server/deprecatedProfileApi.test.ts` | Deleted |
| `OPS_EVENT.deprecated_api_used` | Removed from `opsTaxonomy.ts` (no emitters remain) |

**Retained:** `emitAuditEvent()`, audit repository, Security Center read APIs, all `admin.*` governance mutations.

---

## Remaining `profile.*` procedures

End-user profile only — not governance:

| Procedure | Purpose | Consumer |
|-----------|---------|----------|
| `profile.get` | Current user profile | `Profile.tsx` |
| `profile.update` | Update name/email | `Profile.tsx` |
| `profile.changePassword` | Password change | `Profile.tsx` |

---

## Program closure

ADMIN-SECURITY-CENTER Phase D (API consolidation) is **complete**.

**Next roadmap phase:** CUSTOMER-UX-1

---

## Related documents

- `ADMIN-SECURITY-CENTER-IMPLEMENTATION-PLAN.md` — program status
- `ADMIN-SECURITY-CENTER-DESIGN.md` — §6 API consolidation
- `ADMIN-SECURITY-CENTER-AUDIT.md` — duplicate path finding R4 (resolved)
