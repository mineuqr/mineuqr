# Admin Security Center — Implementation Plan

**Project:** MineuQR  
**Program:** ADMIN-SECURITY-CENTER  
**Phase:** Implementation Planning Only  
**Date:** 2026-06-10  
**Authority:**

| Document | Role |
|----------|------|
| `docs/security-audit/ADMIN-SECURITY-CENTER-AUDIT.md` | Problem diagnosis (approved) |
| `docs/security-audit/ADMIN-SECURITY-CENTER-DESIGN.md` | Architecture & design decisions (approved) |

**Out of scope for this document:** Production code, migrations, schema changes, UI implementation, permission changes.

**Prerequisites (complete):** `ADMIN-RTL-WORKSPACE`; security domain asset registry (`securityDomain.ts`); platform account protection (ADMIN-AUTH-1D).

---

## 1. Executive Summary

ADMIN-SECURITY-CENTER closes four governance gaps without changing the binary `admin` authorization model:

1. **OWNER_OPEN_ID fail-safe** — production must not start unprotected; development must warn loudly.
2. **Audit hardening** — role, subscription, and password-reset mutations emit structured operator events.
3. **Audit persistence** — `audit_events` table with dual-write and admin read APIs.
4. **Security Center UI** — `/admin/security` becomes a read-heavy governance console.
5. **API consolidation** — remove duplicate `profile.*` admin governance endpoints.

### Canonical execution model

**Main track (strictly sequential):**

```
Phase A  Audit Hardening
    ↓
Phase B  Audit Persistence
    ↓
Phase C  Security Center UI
```

**Parallel track (independent of B → C gate):**

```
Phase D  API Consolidation  ── parallel to A / B / C after PR-2
```

| Track | Phases | Gate |
|-------|--------|------|
| **Main** | A → B → C | Each phase completes before the next starts |
| **Parallel** | D | May start after **PR-2** (role audit shared helper); **PR-10** still requires PR-9 + 30-day window |

Phase D does **not** block Phase B or Phase C. Program closure requires **both tracks** complete.

**PR allocation:**

| Phase | PRs | Schema |
|-------|-----|--------|
| A | PR-1 … PR-4 | No |
| B | PR-5 … PR-6 | Yes |
| C | PR-7 … PR-8 | No |
| D | PR-9 … PR-10 | No |

**Total:** 10 PRs. Estimated effort: **Medium–High** (schema + UI + test coverage).

### Program constraints (unchanged)

- No tiered platform roles in this program.
- No permission model changes.
- Governance mutations remain in Operations Accounts workspace.
- Security Center owns **visibility**, not mutation relocation (MVP).

---

## 2. Execution Strategy

### 2.0 Phase sequencing rules

| Rule | Detail |
|------|--------|
| **A before B** | Dual-write (B) wraps emitters defined in A |
| **B before C** | Security Center UI (C) requires read APIs from B (PR-6) |
| **D parallel** | PR-9 may land alongside A PR-3/4, B, or C — no dependency on B or C |
| **D start gate** | PR-9 after PR-2 only (shared role-audit helper on both `admin.*` and `profile.*`) |
| **D end gate** | PR-10 after PR-9 + 30 days zero `deprecated_api_used` in production |
| **Program complete** | A + B + C + D all closed |

```
                    PR-1 ── PR-2 ── PR-3 ── PR-4
                      │      │      │      │
  MAIN (sequential)   └──────┴──────┴──────┘
                              │
                              ▼
                         PR-5 ── PR-6
                              │
                              ▼
                         PR-7 ── PR-8

  PARALLEL            PR-2 ── PR-9 ── … ── PR-10
                      (start)  (deprecate)  (remove, +30d)
```

### 2.1 Work-package principles

| Principle | Application |
|-----------|-------------|
| **Smallest reviewable PRs** | One concern per PR where possible (fail-safe vs role audit vs subscription audit) |
| **Server before client** | Phase A/B complete before Phase C ships data-dependent UI |
| **Dual-write from day one** | Phase B emitter wraps Phase A opsLog shapes — no event schema drift |
| **Shared emitters for duplicate APIs** | Role audit helper invoked from both `admin.*` and `profile.*` until Phase D removal |
| **Forward-only audit** | No backfill of historical mutations |
| **Feature flags not required** | Incremental deploy safe; new events are additive |

### 2.2 Rollout strategy

| Stage | Deploy unit | Operator impact |
|-------|-------------|-----------------|
| **A1** | OWNER_OPEN_ID fail-safe | Prod requires env var; dev sees warnings |
| **A2–A4** | Audit emitters | None visible; events in opsLog |
| **B1** | Migration + write path | Table created; events begin persisting |
| **B2** | Read APIs | None until UI ships |
| **C1–C2** | Security Center UI | `/admin/security` goes live |
| **D1** | Deprecation warnings | `profile.*` callers get opsLog `deprecated_api_used` |
| **D2** | Removal | `profile.*` governance endpoints deleted |

### 2.3 Environment coordination

| Environment | Phase A | Phase B | Phase C | Phase D |
|-------------|---------|---------|---------|---------|
| **Local dev** | `OWNER_OPEN_ID` optional with warnings | Migration applied via `drizzle-kit` | UI against local API | Safe to remove after grep clean |
| **CI** | Tests set `OWNER_OPEN_ID` explicitly | Migration in test DB bootstrap | Component tests optional | Grep gate in CI |
| **Production** | **Fail-fast** if `OWNER_OPEN_ID` unset | Migration before app deploy | Deploy after B2 | D2 only after 30-day zero deprecated usage |

### 2.4 Documentation artifacts (per phase)

| Artifact | Phase |
|----------|-------|
| `ADMIN-SECURITY-CENTER-PHASE-A.md` | A complete |
| `ADMIN-SECURITY-CENTER-PHASE-B.md` | B complete |
| `ADMIN-SECURITY-CENTER-PHASE-C.md` | C complete |
| `ADMIN-SECURITY-CENTER-API-INVENTORY.md` | D start |
| `ADMIN-SECURITY-CENTER-COMPLETION.md` | Program close |

---

## 3. Phase A Plan — Audit Hardening

**Goal:** Close highest-risk audit gaps and OWNER_OPEN_ID silent-failure via `opsLog` emitters. **No schema changes.**

### 3.1 Work packages

| WP | Scope | PR |
|----|-------|-----|
| **A-WP1** | OWNER_OPEN_ID fail-safe + platform protection health events | PR-1 |
| **A-WP2** | Role change audit + protected-user deny events | PR-2 |
| **A-WP3** | Subscription create/update audit + enhanced delete snapshot | PR-3 |
| **A-WP4** | Admin password reset audit | PR-4 |

### 3.2 Event inventory (Phase A — opsLog only)

| eventType | Category | Trigger procedure(s) | before/after | Priority |
|-----------|----------|-------------------|--------------|----------|
| `platform_protection_degraded` | SECURITY | Server startup (dev, empty `OWNER_OPEN_ID`) | No | P0 |
| `platform_protection_healthy` | SECURITY | Health probe success (boot) | No | P0 |
| `platform_protection_misconfigured` | SECURITY | Health probe failure | No | P0 |
| `user_role_changed` | USER | `admin.updateUserRole`, `profile.updateUserRole` | **Yes** | P0 |
| `protected_user_modify_denied` | SECURITY | Any `ProtectedUserModifyError` on role/subscription/password/classification | Metadata | P1 |
| `subscription_created_by_admin` | SUBSCRIPTION | `admin.createUserSubscriptionByAdmin` | after only | P0 |
| `subscription_updated_by_admin` | SUBSCRIPTION | `admin.updateUserSubscriptionByAdmin` | **Yes** | P0 |
| `cascade_subscription_deleted` | SUBSCRIPTION | `admin.deleteUserSubscriptionByAdmin` | **before** snapshot added | P1 |
| `admin_password_reset` | USER | `admin.resetSubscriberPassword` | Target ID only (no password) | P0 |

**Deferred to post-A (not blocking Security Center MVP):** `subscriber_account_created`, `restaurant_created_by_admin`, `notification_sent_by_admin` — design includes them; implement in Phase A stretch or Phase B dual-write batch if capacity allows.

### 3.3 Affected files

| File | Change |
|------|--------|
| `server/_core/opsTaxonomy.ts` | Add new `OPS_EVENT` constants |
| `server/_core/env.ts` | Expose `isProduction` check if needed for fail-fast |
| `server/platformProtectionHealth.ts` | **New** — startup validation, health probe, emit platform events |
| `server/_core/deploymentReadiness.ts` | Integrate platform protection assessment (or call from `createApiApp` boot) |
| `server/_core/createApiApp.ts` (or server entry) | Invoke startup validation / fail-fast |
| `server/roleChangeAudit.ts` | **New** — `logUserRoleChanged`, `applyAdminUserRoleUpdate` |
| `server/subscriptionAuditSnapshot.ts` | **New** — shared snapshot builder (PR-3/PR-4) |
| `server/subscriptionAudit.ts` | **New** — `logSubscriptionCreatedByAdmin`, `logSubscriptionUpdatedByAdmin`, apply helpers |
| `server/passwordResetAudit.ts` | **New** — `logAdminPasswordReset`, `applyAdminPasswordReset` |
| `server/audit/protectedUserAudit.ts` | **New** — `logProtectedUserModifyDenied` (optional shared) |
| `server/accountClassificationAudit.ts` | Reference pattern only; no change required |
| `server/routers.ts` | Wire emitters in admin + profile handlers |
| `server/db.ts` | `updateUserRole` — return previous role or read before handler |
| `server/db/cascadeDeletes.ts` | Capture subscription snapshot before delete in cascade audit |
| `server/admin-auth-1d.test.ts` | Extend for role change audit emission |
| `server/admin-auth-1e.test.ts` | Extend for subscription audit emission |
| `server/platformProtectionHealth.test.ts` | **New** — fail-fast + dev warning behavior |

### 3.4 Affected procedures

| Procedure | Emitter | Guard interaction |
|-----------|---------|-------------------|
| `admin.updateUserRole` | `logUserRoleChanged` | `assertNotSelfAdminTarget`, `assertProtectedUserRoleModifiable` |
| `profile.updateUserRole` | Same shared helper | Same |
| `admin.createUserSubscriptionByAdmin` | `logSubscriptionCreatedByAdmin` | `assertProtectedUserSubscriptionModifiable` |
| `admin.updateUserSubscriptionByAdmin` | `logSubscriptionUpdatedByAdmin` | Same |
| `admin.deleteUserSubscriptionByAdmin` | Enhanced `cascadeAuditFromTrpc` metadata | Same |
| `admin.resetSubscriberPassword` | `logAdminPasswordReset` | `assertProtectedUserPasswordResetAllowed` |
| Server boot | `platformProtectionHealth` | N/A |

### 3.5 Rollout order (within Phase A)

```
PR-1  OWNER_OPEN_ID fail-safe (deploy first — unblocks prod safety)
  ↓
PR-2  Role change audit (highest audit risk R1)
  ↓
PR-3  Subscription create/update audit (R6)
  ↓
PR-4  Password reset audit (R8) + enhanced subscription delete snapshot
```

**Rationale:** Fail-safe first prevents deploying audit coverage while platform protection is silently off in misconfigured prod. Role audit is highest privilege-escalation risk.

### 3.6 Phase A risk analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Prod fail-fast blocks deploy missing `OWNER_OPEN_ID` | **High** (intentional) | Pre-deploy checklist; document in runbook before PR-1 merge |
| Extra DB read before role/subscription update | Low | Single `getUserById` / subscription row read; admin-only path |
| Emitter missed on `profile.*` duplicate | Medium | Shared `emitUserRoleChanged(ctx, ...)` called from both handlers |
| `updateUserRole` no-op still emits | Low | Skip emit when `previousRole === nextRole` |
| Test env fail-fast | Medium | `NODE_ENV=test` or explicit skip flag per design §2.9 |
| opsLog volume increase | Low | Document for infra; expected |

### 3.7 Phase A success criteria

- [ ] Production process exits non-zero when `OWNER_OPEN_ID` is unset or invalid
- [ ] Development emits `platform_protection_degraded` + stderr banner when unset
- [x] `admin.updateUserRole` and `profile.updateUserRole` emit `user_role_changed` with `previousRole`/`nextRole` on success
- [x] `admin.createUserSubscriptionByAdmin` emits `subscription_created_by_admin` with after snapshot
- [x] `admin.updateUserSubscriptionByAdmin` emits `subscription_updated_by_admin` with before/after
- [x] `admin.resetSubscriberPassword` emits `admin_password_reset` (no password in payload)
- [x] `cascade_subscription_deleted` includes before snapshot in metadata
- [x] `npm run check` + `npm test` pass
- [x] No schema, permission, or routing changes

---

## 4. Phase B Plan — Audit Persistence Layer

**Goal:** Durable `audit_events` store, dual-write emitter, admin query APIs. **Requires migration.**

### 4.1 Work packages

| WP | Scope | PR |
|----|-------|-----|
| **B-WP1** | Schema migration + repository + dual-write emitter + refactor Phase A emitters | PR-5 |
| **B-WP2** | Read APIs (`listAuditEvents`, `getAuditEvent`, `getAuditEventStats`, `getSecurityHealth`) | PR-6 |

### 4.2 Persistence architecture

```
server/audit/
  auditTypes.ts          — AuditEventInput, AuditCategory, snapshot types
  auditEmitter.ts        — emitAuditEvent(): opsLog + insert (non-blocking)
  auditRepository.ts     — insertAuditEvent, query methods
  auditSanitize.ts       — strip passwordHash, tokens from snapshots
  roleChangeAudit.ts     — calls auditEmitter (refactor from Phase A)
  subscriptionAudit.ts
  passwordResetAudit.ts
  platformProtectionHealth.ts — persists security events
```

**Repository boundary:** `auditRepository.ts` is the only module that touches `audit_events` table. Routers and domain audit modules call `auditEmitter` only.

### 4.3 Data model (implementation spec)

Table: `audit_events` per design §3.3.

| Column | Drizzle type | Notes |
|--------|--------------|-------|
| `id` | `bigint` PK autoincrement | |
| `eventType` | `varchar(64)` | Matches `OPS_EVENT` |
| `category` | `mysqlEnum` | `ACCESS`, `USER`, `SUBSCRIPTION`, `COMMERCIAL`, `SECURITY` |
| `severity` | `mysqlEnum` | `info`, `warn`, `error` |
| `occurredAt` | `timestamp` UTC | Default `CURRENT_TIMESTAMP` |
| `actorId` | `int` nullable | |
| `actorRole` | `varchar(16)` nullable | |
| `targetType` | `varchar(32)` nullable | |
| `targetId` | `int` nullable | |
| `procedure` | `varchar(128)` nullable | |
| `correlationId` | `varchar(64)` nullable | |
| `ip` | `varchar(45)` nullable | |
| `before` | `json` nullable | |
| `after` | `json` nullable | |
| `metadata` | `json` nullable | |

**Indexes:** `(occurredAt DESC)`, `(eventType, occurredAt)`, `(actorId, occurredAt)`, `(targetType, targetId, occurredAt)`, `(category, occurredAt)`.

### 4.4 Write path

1. Mutation succeeds (or platform health check fires).
2. `auditEmitter.emit(input)`:
   - Sanitize snapshots via `auditSanitize`.
   - `opsLog(...)` — always (existing transport).
   - `auditRepository.insert(...)` — try/catch; failure emits `audit_persist_failed` at `error`, does **not** roll back mutation.
3. Existing `accountClassificationAudit` and `cascadeAudit` refactored to use `auditEmitter` in same PR or fast-follow within PR-5.

### 4.5 Read path

New router file recommended: `server/audit/adminAuditRouter.ts` merged into `adminRouter`.

| Procedure | Input | Output |
|-----------|-------|--------|
| `admin.listAuditEvents` | `cursor?`, `limit` (max 200), `category?`, `eventType?`, `actorId?`, `targetType?`, `targetId?`, `from?`, `to?`, `severity?` | `{ items, nextCursor }` |
| `admin.getAuditEvent` | `id` | Single event with before/after |
| `admin.getAuditEventStats` | `from?`, `to?` | Counts by category and key eventTypes (7d default for overview) |
| `admin.getSecurityHealth` | — | `ownerOpenIdConfigured`, `platformUserResolved`, `platformUserId`, `protectionActive`, `warnings[]` |

All procedures: `assertAdminAccess`.

### 4.6 Retention approach (MVP)

| Tier | Policy | Implementation phase |
|------|--------|----------------------|
| **Hot** | 90 days in `audit_events` | Document only in MVP |
| **Archive job** | Optional cron / script | Post-MVP |
| **Purge** | Never without archive | Document in runbook |

No retention job in Phase B MVP — table growth monitored manually.

### 4.7 Migration sequence

| Step | Action |
|------|--------|
| M1 | Add `audit_events` to `drizzle/schema.ts` |
| M2 | Generate migration via project Drizzle workflow |
| M3 | Deploy migration **before** app deploy (PR-5) |
| M4 | Deploy app with dual-write enabled |
| M5 | Verify rows appear on test governance mutation |

**No backfill migration.**

### 4.8 Affected files

| File | Change |
|------|--------|
| `drizzle/schema.ts` | `audit_events` table |
| `drizzle/migrations/*` | New migration |
| `server/audit/*` | New module tree |
| `server/_core/opsTaxonomy.ts` | Add `audit_persist_failed`, map OpsCategory → AuditCategory |
| `server/accountClassificationAudit.ts` | Refactor to `auditEmitter` |
| `server/db/cascadeAudit.ts` | Refactor to `auditEmitter` |
| `server/audit/adminAuditRouter.ts` | **New** read procedures |
| `server/routers.ts` or `adminDashboardRouter.ts` | Merge audit read router |
| `server/platformProtectionHealth.ts` | Persist platform events |
| `server/audit/*.test.ts` | Repository + emitter tests |

### 4.9 Rollout order (within Phase B)

```
PR-5  Migration + repository + dual-write + refactor existing emitters
  ↓   (deploy migration first, then app)
PR-6  Read APIs + getSecurityHealth
```

### 4.10 Phase B risk analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Migration failure in production | **High** | Test migration on staging; reversible DDL (drop table only if empty) |
| Audit insert slows mutations | Medium | Async insert or fire-and-forget with error log; no await in critical path if measured slow |
| PII in JSON snapshots | Medium | `auditSanitize`; code review checklist |
| Table unbounded growth | Medium | Document retention; monitor row count |
| Dual-write drift (opsLog shape ≠ DB) | Medium | Single `auditEmitter` source of truth |
| Read API over-fetch | Low | Pagination + index coverage |

### 4.11 Phase B success criteria

- [ ] `audit_events` migration applied successfully
- [ ] Phase A events persist on successful mutations
- [ ] `audit_persist_failed` emitted on simulated insert failure; mutation still succeeds
- [ ] `admin.listAuditEvents` returns paginated results for admin caller
- [ ] `admin.getSecurityHealth` returns protection status matching runtime
- [ ] `admin.getAuditEventStats` returns counts for Security Overview
- [ ] Classification and cascade delete events also persist (refactored)
- [ ] `npm run check` + `npm test` pass

---

## 5. Phase C Plan — Security Center UI

**Goal:** Replace `/admin/security` placeholder with governance visibility console. **Hard dependency on Phase B read APIs.**

### 5.1 Work packages

| WP | Scope | PR |
|----|-------|-----|
| **C-WP1** | Page host, composition shell, Overview + Health + Warnings + Protected Accounts | PR-7 |
| **C-WP2** | Audit Timeline, Role Changes, Subscription Changes + i18n + registry | PR-8 |

### 5.2 Route structure

| Path | Component | Replaces |
|------|-----------|----------|
| `/admin/security` | `AdminSecurityPage` | `AdminSectionPlaceholder` for `security` routeId |

**Page host:** `client/src/pages/admin/AdminSecurityPage.tsx`

```tsx
// Structure (implementation guide)
AdminOperationsShell (compact, standard content width)
  └── SecurityCenterComposition
        ├── SecurityWarningsBanner (conditional, top)
        ├── SecurityOverviewSection
        ├── SecurityHealthSection
        ├── SecurityProtectedAccountsSection
        ├── SecurityAuditTimelineSection
        ├── SecurityRoleChangesSection
        └── SecuritySubscriptionChangesSection
```

**Routing change:** `client/src/pages/admin/placeholderPages.tsx` — `AdminSecurityPage` export points to new page, not `createPlaceholderPage("security")`.

`client/src/App.tsx` — update import to `AdminSecurityPage` from dedicated file (or re-export from placeholderPages).

### 5.3 Section breakdown

| Section | Component | Data dependency | MVP behavior |
|---------|-----------|-----------------|--------------|
| **Security Overview** | `SecurityOverviewSection.tsx` | `getAuditEventStats`, `listAuditEvents` (limit 10) | Stats cards + recent activity strip + Operations deep links |
| **Security Health** | `SecurityHealthSection.tsx` | `getSecurityHealth` | Protection status, openId configured badge, platform user resolved |
| **Security Warnings** | `SecurityWarningsSection.tsx` + `SecurityWarningsBanner.tsx` | `getSecurityHealth.warnings` | Critical/warn list + resolution hints |
| **Audit Timeline** | `SecurityAuditTimelineSection.tsx` | `listAuditEvents` | Filters + paginated list + detail drawer |
| **Role Changes** | `SecurityRoleChangesSection.tsx` | `listAuditEvents` filtered | `user_role_changed`, `account_classification_changed` |
| **Subscription Changes** | `SecuritySubscriptionChangesSection.tsx` | `listAuditEvents` filtered | Subscription event types |
| **Protected Accounts** | `SecurityProtectedAccountsSection.tsx` | `getSecurityHealth` + optional `getOwnerOverview` for platform user display | Read-only rules + platform account card |

### 5.4 Registry integration

Update `client/src/lib/admin/domains/security/securityDomain.ts`:

| Asset id | ownerPath | surfaces |
|----------|-----------|----------|
| `security-center-composition` | `SecurityCenterComposition.tsx` | `["security"]` |
| `security-audit-timeline` | `SecurityAuditTimelineSection.tsx` | `["security"]` |
| `security-role-changes` | `SecurityRoleChangesSection.tsx` | `["security"]` |
| `security-subscription-changes` | `SecuritySubscriptionChangesSection.tsx` | `["security"]` |
| `security-health` | `SecurityHealthSection.tsx` | `["security"]` |
| `api-list-audit-events` | `server/audit/adminAuditRouter.ts` | `["security"]` |
| `api-get-security-health` | `server/audit/adminAuditRouter.ts` | `["security"]` |

Existing `hostedInAccountsWorkspace: true` assets **unchanged** — Operations remains mutation surface.

### 5.5 Data dependencies

| Query | Used by | `adminQueriesEnabled` gate |
|-------|---------|---------------------------|
| `admin.getSecurityHealth` | Health, Warnings, Protected Accounts, Overview status | Yes |
| `admin.listAuditEvents` | Timeline, Role, Subscription, Overview strip | Yes |
| `admin.getAuditEvent` | Timeline detail drawer | Yes |
| `admin.getAuditEventStats` | Overview quick stats | Yes |

**Polling:** Optional 60s refetch on Warnings + Overview when tab visible (stretch; not required for MVP).

### 5.6 i18n

Keys under `admin.security.*` in `client/src/locales/en.json` and `ar.json`:

- Section titles, empty states, filter labels, warning types, protection status labels
- Workspace-First: Arabic strings only; layout inherits `AdminOperationsShell`

### 5.7 Operations integration

| Link | Target |
|------|--------|
| Overview shortcuts | `/admin/operations?tab=accounts` |
| Role row action | `/admin/operations?tab=accounts&highlight={userId}` (implement `highlight` query parsing in Accounts section — stretch) |
| Protected Accounts | Link to platform user in Operations if resolved |

**No mutation UI duplication** in Phase C.

### 5.8 Rollout order (within Phase C)

```
PR-7  Page shell + Overview + Health + Warnings + Protected Accounts
  ↓   (usable Security Center with posture visibility)
PR-8  Audit Timeline + Role Changes + Subscription Changes + i18n polish
```

### 5.9 Phase C risk analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Empty audit UI on fresh deploy | Medium | Empty states explaining forward-only audit |
| Large before/after JSON breaks layout | Low | Collapsible diff, truncate in list view |
| `getSecurityHealth` exposes openId prefix | Low | Design limits to 8-char prefix or boolean only |
| Arabic filter labels in LTR workspace | Low | Inherit ADMIN-RTL-WORKSPACE policy |
| highlight query not implemented | Low | Ship deep link to accounts tab without scroll-to-row in MVP |

### 5.10 Phase C success criteria

- [ ] `/admin/security` renders live page (not placeholder)
- [ ] All seven sections present and functional against Phase B APIs
- [ ] Security Warnings shows degraded state when `OWNER_OPEN_ID` unset in dev
- [ ] Audit Timeline loads persisted events with filters
- [ ] Role Changes and Subscription Changes show filtered views
- [ ] Protected Accounts displays platform user when resolved
- [ ] Operations governance UI unchanged
- [ ] `adminQueriesEnabled` gates all security queries
- [ ] en + ar i18n keys present
- [ ] `npm run check` + `npm test` pass

---

## 6. Phase D Plan — API Consolidation

**Goal:** Remove duplicate `profile.*` admin governance endpoints; canonical namespace `admin.*` only.

### 6.1 Inventory (pre-confirmed)

| Deprecated procedure | Canonical replacement | Client references | Server tests |
|---------------------|----------------------|-------------------|--------------|
| `profile.listAllUsers` | `admin.listAllUsers` | **0** in `client/` | Verify in `server/` |
| `profile.updateUserRole` | `admin.updateUserRole` | **0** in `client/` | `admin-auth-1d.test.ts` may use `admin.*` |
| `profile.deleteUser` | `admin.deleteUser` | **0** in `client/` | `admin-auth-1d.test.ts` |

**Current client:** Security components use `admin.updateUserRole`, `admin.deleteUser` per `securityDomain.ts`. Operations uses `admin.getOwnerOverviewList`.

### 6.2 Client impact

| Area | Impact |
|------|--------|
| `client/` | **None expected** — grep clean |
| `server/routers.ts` | Remove `profileRouter` governance handlers |
| `server/*.test.ts` | Redirect any `profile.*` calls to `admin.*` |
| `docs/` | Update references in commercial-audit docs (optional housekeeping) |

### 6.3 Deprecation process (PR-9)

| Step | Action |
|------|--------|
| D1.1 | Add `@deprecated` JSDoc on three handlers in `profileRouter` |
| D1.2 | Wrap handlers with `logDeprecatedApiUsed(ctx, "profile.updateUserRole")` → opsLog + audit persist |
| D1.3 | Create `docs/security-audit/ADMIN-SECURITY-CENTER-API-INVENTORY.md` |
| D1.4 | Add CI grep check: warn on new `profile.(listAllUsers|updateUserRole|deleteUser)` in client |
| D1.5 | Changelog entry |

**Minimum deprecation window:** 1 release cycle before PR-10.

### 6.4 Removal process (PR-10)

| Step | Action |
|------|--------|
| D2.1 | Verify `deprecated_api_used` count = 0 for 30 days (production log query) |
| D2.2 | `rg 'profile\.(listAllUsers|updateUserRole|deleteUser)'` across repo — zero hits outside docs |
| D2.3 | Delete three handlers from `profileRouter` in `server/routers.ts` |
| D2.4 | Remove shared emitter calls from profile paths (admin-only paths remain) |
| D2.5 | Update tests |

### 6.5 Removal criteria (all required)

- [ ] Zero client references
- [ ] Zero server references outside deprecated handlers
- [ ] Zero production `deprecated_api_used` for 30 days
- [ ] Audit emitters confirmed on `admin.*` only
- [ ] CI green

### 6.6 Rollout order (within Phase D)

```
PR-9   Deprecation + inventory doc + deprecated_api_used emitter
  ↓    (wait ≥1 release + 30-day zero usage)
PR-10  Hard removal
```

**May start PR-9 after PR-2 merges** (role audit on both paths no longer needed after removal, but deprecation period requires both).

### 6.7 Phase D risk analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Unknown external API consumer | Low | Deprecation window + opsLog visibility |
| Test-only `profile.*` usage | Low | Grep + test update in PR-10 |
| Premature removal | Medium | Enforce 30-day criteria |

### 6.8 Phase D success criteria

- [ ] `ADMIN-SECURITY-CENTER-API-INVENTORY.md` published
- [ ] PR-9: deprecated handlers emit `deprecated_api_used`
- [ ] PR-10: three `profile.*` governance procedures removed
- [ ] `profile.get`, `profile.changePassword`, etc. unchanged
- [ ] No permission behavior change
- [ ] `npm run check` + `npm test` pass

---

## 7. PR Breakdown

| PR | Title | Phase | Depends on | Est. size | Status |
|----|-------|-------|------------|-----------|--------|
| **PR-1** | OWNER_OPEN_ID fail-safe + platform protection health events | A | — | S | **COMPLETE** |
| **PR-2** | Role change audit | A | PR-1 | S | **COMPLETE** |
| **PR-3** | Subscription create/update audit emitters | A | PR-1 | M | **COMPLETE** |
| **PR-4** | Admin password reset audit + subscription delete snapshot | A | PR-3 | S | **COMPLETE** |
| **PR-5** | `audit_events` migration + dual-write emitter + emitter refactor | B | PR-2, PR-3, PR-4 | L | Pending |
| **PR-6** | Audit read APIs + `getSecurityHealth` route | B | PR-5 | M | Pending |
| **PR-7** | Security Center page shell + Overview/Health/Warnings/Protected | C | PR-6 | M | Pending |
| **PR-8** | Audit Timeline + Role/Subscription sections + i18n | C | PR-7 | L | Pending |
| **PR-9** | API deprecation (`profile.*` governance) + inventory doc | D | PR-2 | S | Pending |
| **PR-10** | API removal (`profile.*` governance) | D | PR-9 + 30d | S | Pending |

### PR-1 — Complete (2026-06-11)

**Scope delivered:** OWNER_OPEN_ID fail-safe only.

| Item | Detail |
|------|--------|
| **Files changed** | `server/platformProtectionHealth.ts` (new), `server/platformProtectionHealth.test.ts` (new), `server/_core/createApiApp.ts`, `server/_core/opsTaxonomy.ts`, `server/_core/opsLog.ts` |
| **Behavior — production** | `validatePlatformProtectionAtStartup()` throws `PlatformProtectionStartupError` when `OWNER_OPEN_ID` missing/invalid; emits `platform_protection_misconfigured` |
| **Behavior — development** | Startup continues; stderr banner + `platform_protection_degraded` opsLog event |
| **Health probe** | `schedulePlatformProtectionHealthProbe()` after startup; emits `platform_protection_healthy` or `platform_protection_misconfigured` |
| **Foundation** | `getSecurityHealth()` async function (no tRPC route — PR-6) |
| **Events added** | `platform_protection_healthy`, `platform_protection_degraded`, `platform_protection_misconfigured` (category `SECURITY`) |
| **Protected account guards** | Unchanged — `platformAccount.ts`, `cascadeDeletes.ts` not modified |
| **Tests** | 5 new + existing `admin-auth-1d`, `admin-auth-1e`, `cascadeDeletes`, `platformAccount` — all pass |
| **Validation** | `npm run check` PASS; `npm test` 644 passed |

**Deployment requirements:**

- **Production:** `OWNER_OPEN_ID` must be set to the platform owner's `users.openId` before deploy or the server will not start.
- **Development:** Optional; missing value logs degraded warning but allows local runs.
- **Health probe:** Orphan openId (user not yet in DB) emits `platform_protection_misconfigured` at warn/error but does not block startup when `OWNER_OPEN_ID` is syntactically valid.

**Next:** PR-5 (`audit_events` migration + dual-write emitter).

### PR-4 — Complete (2026-06-11)

**Scope delivered:** Admin password reset audit + enhanced subscription delete snapshot (opsLog only).

| Item | Detail |
|------|--------|
| **Files changed** | `server/passwordResetAudit.ts` (new), `server/passwordResetAudit.test.ts` (new), `server/subscriptionAudit.ts`, `server/subscriptionAuditSnapshot.ts`, `server/subscriptionAudit.test.ts`, `server/db/cascadeDeletes.ts`, `server/db/cascadeDeletes.test.ts`, `server/_core/opsTaxonomy.ts`, `server/routers.ts` |
| **Events** | `admin_password_reset` (category `ADMIN`); enhanced `cascade_subscription_deleted` completed-phase metadata |
| **Procedures covered** | `admin.resetSubscriberPassword`, `admin.deleteUserSubscriptionByAdmin` |
| **Excluded paths — password** | `admin.createSubscriberAccount` (initial password on create), `admin.createInternalUser` (initial password on create), `profile.changePassword` (self-service), `POST /api/auth/change-password` (self-service), `auth-local` forgot-password token flow (self-service) |
| **Password reset payload** | `actorUserId`, `actorRole`, `targetUserId`, `targetUserEmail`, `resetMethod` (`admin_direct`), `correlationId`, `procedure`, `timestamp` — no password or hash |
| **Delete snapshot payload** | `subscriptionId`, `before`: `{ plan, status, expiration }` on `cascade_subscription_deleted` phase `completed` |
| **Snapshot standardization** | `subscriptionAuditSnapshotToChangeFields()` — Subscription Snapshot Format v1 subset shared by create/update/delete audit paths |
| **Emit rules — password** | Emit only after successful `updateUserPassword`; skip on validation failure, not-found, protected account block, or DB write failure |
| **Emit rules — delete** | Before snapshot captured pre-delete; `before` included only on successful transaction completed event |
| **Protected account guards** | Unchanged — `assertProtectedUserPasswordResetAllowed`, `assertProtectedUserSubscriptionModifiable` preserved in apply helpers |
| **Tests** | 5 new in `passwordResetAudit.test.ts` (scenarios 1–3) + 4 new in `subscriptionAudit.test.ts` / `cascadeDeletes.test.ts` (scenarios 4–6) |
| **Validation** | `npm run check` PASS; `npm test` 671 passed |
| **Remaining gaps** | `audit_events` persistence (PR-5), Security Center UI (PR-7/8), `protected_user_modify_denied` (deferred) |

**Phase A status:** **COMPLETE** (PR-1 through PR-4 closed).

### PR-2 — Complete (2026-06-07)

**Scope delivered:** Role change audit (opsLog only).

| Item | Detail |
|------|--------|
| **Files changed** | `server/roleChangeAudit.ts` (new), `server/roleChangeAudit.test.ts` (new), `server/_core/opsTaxonomy.ts`, `server/routers.ts` |
| **Event** | `user_role_changed` (category `ADMIN` in opsLog; maps to `USER` in Phase B `audit_events`) |
| **Procedures covered** | `admin.updateUserRole`, `profile.updateUserRole` — both call shared `applyAdminUserRoleUpdate` |
| **Payload** | `actorUserId`, `actorRole`, `targetUserId`, `targetUserEmail`, `previousRole`, `newRole`, `timestamp`, `correlationId`, `procedure`, optional `accountClassification` |
| **Emit rules** | Only on successful role change when `previousRole !== newRole`; no emit on no-op, validation failure, permission failure, or transaction failure |
| **Coverage review** | `createInternalUser` — user creation with initial role (`internal_user_created`); `upsertUser` OAuth bootstrap — not admin role change; no other `updateUserRole` callers |
| **Protected account guards** | Unchanged — `assertProtectedUserRoleModifiable`, `assertNotSelfAdminTarget` preserved in shared helper |
| **Tests** | 7 new in `roleChangeAudit.test.ts` (scenarios 1–5) + existing `admin-auth-1d` protection tests |
| **Remaining gaps** | `protected_user_modify_denied` (PR scope excluded), `audit_events` persistence (PR-5), Security Center UI (PR-7/8) |

### PR-3 — Complete (2026-06-07)

**Scope delivered:** Subscription create/update audit (opsLog only).

| Item | Detail |
|------|--------|
| **Files changed** | `server/subscriptionAuditSnapshot.ts` (new), `server/subscriptionAudit.ts` (new), `server/subscriptionAudit.test.ts` (new), `server/_core/opsTaxonomy.ts`, `server/routers.ts` |
| **Events** | `subscription_created_by_admin`, `subscription_updated_by_admin` (category `ADMIN` in opsLog; maps to `SUBSCRIPTION` in Phase B `audit_events`) |
| **Procedures covered** | `admin.createUserSubscriptionByAdmin`, `admin.updateUserSubscriptionByAdmin` |
| **Excluded paths** | `createRestaurantSubscription` / `updateRestaurantSubscription` / `cancelRestaurantSubscription` — retired (throw before mutation); `create-trial-subscription.ts` — owner self-registration, not admin; PayPal webhooks — system actor |
| **Snapshot helper** | `subscriptionAuditSnapshot.ts` — `plan`, `status`, `startDate`, `expiration` (shared with PR-4 delete enhancement) |
| **Create payload** | `actorUserId`, `actorRole`, `targetUserId`, `subscriptionId`, `plan`, `status`, `startDate`, `endDate`, `correlationId`, `procedure` |
| **Update payload** | Same actor fields + `subscriptionId` + `before`/`after` snapshots (`plan`, `status`, `expiration`) |
| **Emit rules** | Create on successful insert only; update only when effective field change; skip on validation/permission failure and no-op |
| **Protected account guards** | Unchanged — `assertProtectedUserSubscriptionModifiable` preserved in apply helpers |
| **Tests** | 9 new in `subscriptionAudit.test.ts` (scenarios 1–6) + existing `admin-auth-1e`, `authorityCleanup1`, `admin-invoice-billing` |
| **Remaining gaps** | Enhanced delete snapshot + password reset audit (closed in PR-4), `audit_events` persistence (PR-5) |

### PR dependency graph

```
PR-1 ✓ ──┬── PR-2 ✓ ──┬── PR-5 ── PR-6 ── PR-7 ── PR-8
       │          │
       ├── PR-3 ✓ ──┤
       │    └── PR-4 ✓
       │
       └── PR-9 ────────────── PR-10
            (after PR-2, parallel to B/C)
```

---

## 8. Dependency Map

```
Prerequisites: ADMIN-RTL-WORKSPACE │ securityDomain.ts │ ADMIN-AUTH-1D
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼  MAIN TRACK (sequential)                 ▼  PARALLEL TRACK
   ┌─────────┐                               ┌─────────┐
   │ Phase A │                               │ Phase D │
   │ PR 1-4  │                               │ PR 9-10 │
   └────┬────┘                               └────▲────┘
        │                                         │
        ▼                                    starts after
   ┌─────────┐                               PR-2 (Phase A)
   │ Phase B │
   │ PR 5-6  │
   └────┬────┘
        │
        ▼
   ┌─────────┐
   │ Phase C │
   │ PR 7-8  │
   └─────────┘

Phase D runs in parallel — does not block B or C.
```

| Dependency | Type | Track | Notes |
|------------|------|-------|-------|
| Phase B → Phase A | **Hard** | Main | Dual-write wraps existing event shapes |
| Phase C → Phase B PR-6 | **Hard** | Main | UI needs read APIs |
| Phase C → ADMIN-RTL-WORKSPACE | **Hard** | Main | Shell policy |
| Phase D → Phase A PR-2 | **Soft** | Parallel | PR-9 after role audit shared helper |
| Phase D ⊥ Phase B | **None** | — | D may run during B |
| Phase D ⊥ Phase C | **None** | — | D may run during C |
| Phase D PR-10 → PR-9 + 30d | **Hard** | Parallel | Removal gate |
| Migration → App deploy | **Hard** | Main | PR-5 migration before app |

---

## 9. Risk Assessment

### 9.1 By phase

| Phase | Security risks | Migration risks | Deployment risks | Overall |
|-------|----------------|-----------------|------------------|---------|
| **A** | Fail-fast may block prod deploy (**intentional**) | None | Env var must be set before PR-1 prod deploy | **Medium** |
| **B** | PII in audit JSON | DDL failure, rollback complexity | Migration-before-app ordering | **Medium–High** |
| **C** | openId prefix leakage in UI | None | Empty audit on new env | **Low** |
| **D** | Unknown consumer calling `profile.*` | None | Premature removal | **Low** |

### 9.2 Program-level risks

| ID | Risk | Severity | Phase | Mitigation |
|----|------|----------|-------|------------|
| P-R1 | Prod deploy without `OWNER_OPEN_ID` after PR-1 | **High** | A | Deploy checklist; staging validation |
| P-R2 | Audit table growth | Medium | B | Retention doc; monitoring |
| P-R3 | Phase C before Phase B | **High** | C | Enforce PR-6 before PR-7 |
| P-R4 | Forgotten `profile.*` audit path after D | Medium | D | Remove only after shared helper period |
| P-R5 | Flat admin sees all audit data | Low | C | Accept for MVP per design |
| P-R6 | Dual-write failure silent to operators | Medium | B | `audit_persist_failed` + Security Warnings `AUDIT_PERSIST_FAIL_BURST` (future) |

---

## 10. Rollback Strategy

### 10.1 Per PR

| PR | Rollback action | Data impact |
|----|-----------------|-------------|
| PR-1 | Revert fail-fast; restore silent degraded mode | None |
| PR-2–4 | Revert emitter calls | None |
| PR-5 | Revert app; **keep or drop** `audit_events` table | Orphan table harmless if kept |
| PR-6 | Revert read APIs | Persisted data remains |
| PR-7–8 | Revert to `AdminSectionPlaceholder` for security | None |
| PR-9 | Remove deprecation warnings | None |
| PR-10 | Restore `profile.*` handlers from git | None |

### 10.2 Migration rollback (PR-5)

| Scenario | Action |
|----------|--------|
| Migration applied, app broken | Roll back app deployment; table can remain |
| Migration must be reversed | `DROP TABLE audit_events` only if no compliance need to retain |
| Partial dual-write failures | Disable DB insert in `auditEmitter`; opsLog continues |

### 10.3 Production incident playbook

1. **App won't start after PR-1:** Set `OWNER_OPEN_ID` in environment; verify matches platform user `openId`.
2. **Audit UI empty:** Expected on new deploy — forward-only; verify Phase B dual-write with test mutation.
3. **Audit insert errors:** Check DB connectivity; `audit_persist_failed` in logs; mutations still succeed.

---

## 11. Success Criteria

### 11.1 Phase A closure

All items in §3.7 plus:

- Phase A implementation doc published
- Deployment runbook updated with `OWNER_OPEN_ID` requirement

### 11.2 Phase B closure

All items in §4.11 plus:

- Phase B implementation doc published
- Staging verified: governance mutation → row in `audit_events`

### 11.3 Phase C closure

All items in §5.10 plus:

- Phase C implementation doc published
- Manual Arabic + English visual pass on `/admin/security`

### 11.4 Phase D closure

All items in §6.8 plus:

- API inventory doc final
- `profile.*` governance procedures absent from `server/routers.ts`

### 11.5 ADMIN-SECURITY-CENTER overall closure

| Criterion | Source |
|-----------|--------|
| OWNER_OPEN_ID fail-safe active in production | Design §2 |
| Role changes audited with before/after | Audit R1 |
| Subscription create/update audited | Audit R6 |
| Password reset audited | Audit R8 |
| `audit_events` persisted and queryable | Design §3 |
| `/admin/security` live with seven sections | Design §7 |
| `profile.*` governance APIs removed | Design §6 |
| Duplicate API surface eliminated | Audit R4 |
| `ADMIN-SECURITY-CENTER-COMPLETION.md` published | Program |
| `npm run check` + `npm test` pass | Engineering |
| No unauthorized permission model changes | Constraint |

**Verdict template for completion doc:**

> ADMIN-SECURITY-CENTER is **COMPLETE** when all Phase A–D closure criteria are met and production has `OWNER_OPEN_ID` configured with persisted audit events flowing from governance mutations.

---

## 12. Recommended Execution Order

### 12.1 Canonical schedule

| Week | Main track (A → B → C) | Parallel track (D) |
|------|------------------------|-------------------|
| 1 | PR-1, PR-2 (Phase A) | — |
| 2 | PR-3, PR-4 (Phase A complete) | **PR-9** (deprecation) — may start after PR-2 |
| 3 | PR-5 (Phase B) | PR-9 (if not merged week 2) |
| 4 | PR-6 (Phase B complete) | — |
| 5 | PR-7 (Phase C) | — |
| 6 | PR-8 (Phase C complete) | — |
| 7+ | — | **PR-10** (removal) after PR-9 + 30 days |

### 12.2 Staffing model

| Track | Owner focus | PR sequence |
|-------|-------------|-------------|
| **Main** | Audit + persistence + UI | PR-1 → PR-2 → PR-3 → PR-4 → PR-5 → PR-6 → PR-7 → PR-8 |
| **Parallel** | API consolidation | PR-9 → (wait 30d) → PR-10 |

Single developer: run main track sequentially; slot **PR-9** immediately after **PR-2** before continuing PR-3.

### 12.3 First action

**Start PR-1 (OWNER_OPEN_ID fail-safe)** on the main track. Schedule **PR-9** in parallel once **PR-2** merges.

### 12.4 Out of program scope (do not schedule)

- Tiered platform roles (Owner / Admin / Support)
- Plan/pricing admin API
- Notification send audit (stretch)
- Audit retention cron job
- Command Center Security drill link (optional polish)

---

## Appendix A — File touch matrix (all phases)

| File | A | B | C | D |
|------|---|---|---|---|
| `server/_core/opsTaxonomy.ts` | ✓ | ✓ | | |
| `server/platformProtectionHealth.ts` | ✓ | ✓ | | |
| `server/audit/roleChangeAudit.ts` | ✓ | ✓ | | |
| `server/audit/subscriptionAudit.ts` | ✓ | ✓ | | |
| `server/audit/passwordResetAudit.ts` | ✓ | ✓ | | |
| `server/audit/auditEmitter.ts` | | ✓ | | |
| `server/audit/auditRepository.ts` | | ✓ | | |
| `server/audit/adminAuditRouter.ts` | | ✓ | | |
| `drizzle/schema.ts` | | ✓ | | |
| `server/routers.ts` | ✓ | ✓ | | ✓ |
| `client/src/pages/admin/AdminSecurityPage.tsx` | | | ✓ | |
| `client/src/components/admin/domains/security/Security*Section.tsx` | | | ✓ | |
| `client/src/lib/admin/domains/security/securityDomain.ts` | | | ✓ | |
| `client/src/locales/en.json`, `ar.json` | | | ✓ | |

## Appendix B — Testing strategy

| Layer | Coverage |
|-------|----------|
| Unit | `auditSanitize`, snapshot builders, fail-fast logic |
| Integration | tRPC success → opsLog event (Phase A); → DB row (Phase B) |
| Existing | Extend `admin-auth-1d.test.ts`, `admin-auth-1e.test.ts`, `platformAccount.test.ts` |
| E2E | Manual Security Center walkthrough post PR-8 |
| CI | `npm run check` + `npm test` on every PR |

---

*Implementation planning complete. No code, migrations, or execution performed.*
