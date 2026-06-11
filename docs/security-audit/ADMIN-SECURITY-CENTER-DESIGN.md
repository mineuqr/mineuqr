# Admin Security Center — Design

**Project:** MineuQR  
**Program:** ADMIN-SECURITY-CENTER  
**Phase:** Design Only  
**Date:** 2026-06-10  
**Authority:** `docs/security-audit/ADMIN-SECURITY-CENTER-AUDIT.md`  
**Prerequisites:** `ADMIN-RTL-WORKSPACE` complete; security domain asset registry (`securityDomain.ts`) exists

**Out of scope for this document:** Production code, migrations, permission changes, schema changes, UI implementation.

---

## 1. Executive Summary

The ADMIN-SECURITY-CENTER program closes governance gaps identified in the security audit without redesigning MineuQR's binary authorization model (`user` | `admin`). The design addresses four structural weaknesses:

1. **OWNER_OPEN_ID dependency** — platform protection is inactive when the env var is missing; a fail-safe runtime policy is required.
2. **Console-only audit** — `opsLog` emits structured events to stdout but nothing is queryable by operators; a persisted `audit_events` store is required.
3. **Missing mutation trails** — role changes and subscription create/update lack operator audit; highest-risk privilege escalation is invisible.
4. **Fragmented operator experience** — governance UI is embedded in Operations Accounts; `/admin/security` is a placeholder; duplicate `profile.*` / `admin.*` APIs expand review surface.

### Design decisions (approved for planning)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Authorization model | **Retain binary `admin`** for this program | Tiered platform roles are out of scope; audit flags as future gate |
| Platform owner identity | **Retain `OWNER_OPEN_ID` → `openId`** | Already implemented (ADMIN-AUTH-1D); add fail-safe, not redesign |
| Audit transport | **Dual-write: `opsLog` + `audit_events`** | Preserves existing log shipping; adds queryable operator trail |
| Event taxonomy | **Extend `OPS_EVENT` + persisted `eventType`** | Aligns with `opsTaxonomy.ts`; avoids naming drift |
| API canonical surface | **`admin.*` only** | `profile.*` duplicates deprecated then removed per criteria |
| Security Center scope | **Read-heavy console + deep links to Operations** | Governance mutations stay in Operations workspace initially; Security Center owns visibility |
| UI shell | **`AdminOperationsShell` (Workspace-First)** | Inherits completed RTL workspace policy |

### Implementation sequence (summary)

```
Phase A — Audit Hardening     (opsLog emitters for missing mutations)
Phase B — Audit Persistence   (audit_events table + dual-write + read API)
Phase C — Security Center UI  (/admin/security workspace)
Phase D — API Consolidation   (deprecate profile.* admin duplicates)
```

Phase A may begin immediately. Phase B is a hard dependency for Security Center audit sections. Phase D is independent but should complete before any new admin endpoints are added.

---

## 2. OWNER_OPEN_ID Fail-Safe Design

### 2.1 Current state (audit finding R2)

Platform account protection resolves through:

```
OWNER_OPEN_ID (env) → isPlatformAccountOpenId(openId) → assert* guards
```

When `OWNER_OPEN_ID` is empty or wrong, **all platform protection guards are no-ops**. No warning is emitted at startup; operators have no visibility.

### 2.2 Design goals

| Goal | Requirement |
|------|-------------|
| **Detect misconfiguration early** | Before or at process start |
| **Never silently degrade in production** | Operators must know protection is inactive |
| **Preserve development ergonomics** | Local dev without OAuth owner may still run |
| **Audit visibility** | Misconfiguration itself is a security event |
| **No identity model change** | Still `openId`-based; no email fallback |

### 2.3 Desired runtime behavior

| State | `OWNER_OPEN_ID` | Platform user exists in DB | Protection active? |
|-------|-----------------|----------------------------|-------------------|
| **Healthy** | Set, matches a user `openId` | Yes | **Yes** |
| **Healthy (pre-login)** | Set, user not yet upserted | No | **Yes** (openId match on first OAuth upsert) |
| **Misconfigured — empty** | `""` or unset | Any | **No** |
| **Misconfigured — orphan** | Set, no matching `openId` in DB | No | **Partial** — guards active for openId string but no user resolved yet |
| **Misconfigured — wrong value** | Set, points to non-owner | Yes (wrong user) | **Wrong user protected** — operational error |

### 2.4 Development behavior

| Rule | Behavior |
|------|----------|
| **Startup** | Process **starts** even if `OWNER_OPEN_ID` is unset |
| **Warning** | Emit `platform_protection_degraded` at **warn** severity on startup and on first admin governance mutation |
| **Console** | Single-line banner in server logs: `PLATFORM PROTECTION INACTIVE: OWNER_OPEN_ID not configured` |
| **Security Center** | When UI exists: **Security Warnings** section shows persistent degraded badge |
| **Local override** | Optional `OWNER_OPEN_ID_DEV` documented in dev setup guide; no production equivalent |
| **Tests** | Tests continue to set `OWNER_OPEN_ID` explicitly (existing pattern in `admin-auth-1d.test.ts`) |

**Rationale:** Developers need to run the stack without production OAuth credentials. Degraded mode must be **loud**, not silent.

### 2.5 Production behavior

| Rule | Behavior |
|------|----------|
| **Startup validation** | On server boot, evaluate `OWNER_OPEN_ID` |
| **Empty / unset** | **Fail-fast** — process exits with non-zero code and clear error message |
| **Set but syntactically invalid** | Fail-fast (empty after trim, exceeds max length, contains whitespace-only) |
| **Set, valid syntax** | Process starts; schedule async **health probe** (see monitoring) |
| **Health probe failure** | Emit `platform_protection_misconfigured` at **error** severity; do **not** exit running process (avoid outage from transient DB) — but Security Center shows **critical** warning |

**Design choice:** Production **fail-fast on missing** `OWNER_OPEN_ID`. Wrong-value protection (orphan openId) is an operational checklist item, not a startup crash — detected via health probe.

### 2.6 Warning strategy

| Trigger | Channel | Severity | Audience |
|---------|---------|----------|----------|
| Dev startup, empty `OWNER_OPEN_ID` | `opsLog` + stderr banner | `warn` | Developers |
| Prod startup, empty `OWNER_OPEN_ID` | Process exit message | `error` | Deploy / CI |
| Prod health probe: no user matches openId after 24h | `opsLog` | `warn` | Operators |
| Prod health probe: openId matches user without `role=admin` | `opsLog` | `warn` | Operators |
| Any governance mutation while protection degraded (dev) | `opsLog` per mutation | `warn` | Operators |

### 2.7 Failure strategy

| Scenario | Server behavior | Governance mutations |
|----------|-----------------|----------------------|
| Protection inactive (dev) | Allow mutations; warn on each | Unchanged — guards no-op |
| Protection inactive (prod) | **Process does not start** | N/A |
| Protection active, target is platform account | `ProtectedUser*Error` | Blocked (existing) |
| `OWNER_OPEN_ID` changed in running process | Not supported — requires restart | Document in runbook |

**No fallback identity** (email, user ID, hardcoded list). Misconfiguration is never compensated by implicit protection.

### 2.8 Monitoring visibility

| Signal | Implementation (future) |
|--------|---------------------------|
| **Startup check** | `deploymentReadiness` or dedicated `platformProtectionHealth` in existing health endpoint |
| **Security Center banner** | `/admin/security` → Security Warnings section reads `admin.getSecurityHealth` |
| **opsLog events** | `platform_protection_degraded`, `platform_protection_misconfigured`, `platform_protection_healthy` |
| **External monitoring** | Alert on `platform_protection_degraded` or `platform_protection_misconfigured` in log shipper |

**Proposed read API (Phase B/C):**

```
admin.getSecurityHealth → {
  ownerOpenIdConfigured: boolean,
  platformUserResolved: boolean,
  platformUserId: number | null,
  protectionActive: boolean,
  warnings: SecurityWarning[]
}
```

### 2.9 Audit event requirements

| Event | When | Category | Persisted |
|-------|------|----------|-----------|
| `platform_protection_degraded` | Dev startup, empty `OWNER_OPEN_ID` | `SECURITY` | Yes (Phase B) |
| `platform_protection_misconfigured` | Health probe failure | `SECURITY` | Yes |
| `platform_protection_healthy` | Health probe success (once per boot) | `SECURITY` | Yes |
| `platform_protection_check_skipped` | Test environment flag | `SECURITY` | Optional |

Metadata for all events:

```ts
{
  ownerOpenIdConfigured: boolean,
  ownerOpenIdPrefix: string | null,  // first 8 chars only — never full value
  platformUserId: number | null,
  environment: "development" | "production" | "test"
}
```

---

## 3. Audit Event Architecture

### 3.1 Problem statement

`opsLog` (`server/_core/opsLog.ts`) provides structured `OpsEvent` records with `actorId`, `role`, `procedure`, `correlationId`, and `metadata` — but writes **only to stdout/stderr**. Operators cannot query history; Security Center cannot render a timeline; compliance retention is undefined.

### 3.2 Design principles

| Principle | Rule |
|-----------|------|
| **Dual-write** | Every persisted audit event also emits via `opsLog` (log shipper compatibility) |
| **Append-only** | `audit_events` rows are never updated or deleted by application code |
| **Actor-first** | Every operator-initiated mutation records `actorId` + `actorRole` |
| **Target-typed** | `targetType` + `targetId` for query filters |
| **Snapshot discipline** | `before` / `after` JSON for mutations; omit secrets (`passwordHash`, tokens) |
| **Procedure traceability** | `procedure` field matches tRPC path (`admin.updateUserRole`) |
| **Correlation** | Propagate `ctx.correlationId` from existing tRPC context |

### 3.3 Data model — `audit_events` (conceptual)

**Note:** This is a design specification. No migration in this phase.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | `bigint` PK auto | Yes | Monotonic event ID |
| `eventType` | `varchar(64)` | Yes | Canonical snake_case name (aligns with `OPS_EVENT`) |
| `category` | `enum` | Yes | `ACCESS`, `USER`, `SUBSCRIPTION`, `COMMERCIAL`, `SECURITY` |
| `severity` | `enum` | Yes | `info`, `warn`, `error` (matches `OpsSeverity` minus `debug`) |
| `occurredAt` | `timestamp` | Yes | UTC event time |
| `actorId` | `int` nullable | Conditional | Null for system/webhook actors |
| `actorRole` | `varchar(16)` nullable | Conditional | `admin`, `user`, `system` |
| `targetType` | `varchar(32)` nullable | Conditional | `user`, `subscription`, `restaurant`, `platform`, `session` |
| `targetId` | `int` nullable | Conditional | Primary target entity ID |
| `procedure` | `varchar(128)` nullable | Yes | tRPC procedure path |
| `correlationId` | `varchar(64)` nullable | Yes | Request correlation |
| `ip` | `varchar(45)` nullable | Optional | Actor IP when available |
| `before` | `json` nullable | Conditional | Pre-mutation snapshot |
| `after` | `json` nullable | Conditional | Post-mutation snapshot |
| `metadata` | `json` nullable | Optional | Extension fields not in before/after |

**Indexes (design):**

- `(occurredAt DESC)` — timeline queries
- `(eventType, occurredAt DESC)` — filtered views
- `(actorId, occurredAt DESC)` — actor history
- `(targetType, targetId, occurredAt DESC)` — entity history
- `(category, occurredAt DESC)` — Security Center section feeds

### 3.4 Event taxonomy

Extends `OPS_EVENT` (`server/_core/opsTaxonomy.ts`) with persisted-only types where needed. Grouped by Security Center category.

#### Access Events

| eventType | Trigger | actorId | before/after |
|-----------|---------|---------|--------------|
| `unauthorized_admin_access` | `assertAdminAccess` deny | Attempted user | No |
| `tenant_boundary_violation` | `assertRestaurantAccess` deny | Actor | No |
| `suspicious_admin_activity` | Threshold burst | — | Metadata only |
| `admin_session_started` | Admin login success (optional Phase A+) | Actor | No |

#### User Events

| eventType | Trigger | actorId | before/after |
|-----------|---------|---------|--------------|
| `user_role_changed` | `admin.updateUserRole` success | Admin | **Yes** |
| `account_classification_changed` | `admin.updateAccountClassification` | Admin | **Yes** (existing) |
| `internal_user_created` | `admin.createInternalUser` | Admin | After only (existing) |
| `subscriber_account_created` | `admin.createSubscriberAccount` | Admin | After only |
| `cascade_user_deleted` | `admin.deleteUser` | Admin | Target ID (existing) |
| `admin_password_reset` | `admin.resetSubscriberPassword` | Admin | Target ID only (no password) |

#### Subscription Events

| eventType | Trigger | actorId | before/after |
|-----------|---------|---------|--------------|
| `subscription_created_by_admin` | `admin.createUserSubscriptionByAdmin` | Admin | **Yes** |
| `subscription_updated_by_admin` | `admin.updateUserSubscriptionByAdmin` | Admin | **Yes** |
| `cascade_subscription_deleted` | `admin.deleteUserSubscriptionByAdmin` | Admin | Target ID (existing) |
| `payment_subscription_activated` | Webhook | `null` (system) | After only |

#### Commercial Events

| eventType | Trigger | actorId | before/after |
|-----------|---------|---------|--------------|
| `commercial_report_exported` | `admin.exportCommercialReport` | Admin | Metadata (format, row counts) |
| `invoice_generated_by_admin` | `admin.generateInvoicePDF` | Admin | Metadata (invoiceId, userId) |
| `restaurant_created_by_admin` | `restaurant.create` when caller is admin | Admin | After only |
| `cascade_restaurant_deleted` | `restaurant.delete` | Actor | Target ID (existing) |

#### Security Events

| eventType | Trigger | actorId | before/after |
|-----------|---------|---------|--------------|
| `platform_protection_degraded` | Empty `OWNER_OPEN_ID` (dev) | `null` | No |
| `platform_protection_misconfigured` | Health probe failure | `null` | No |
| `platform_protection_healthy` | Health probe success | `null` | No |
| `protected_user_modify_denied` | `ProtectedUserModifyError` caught | Admin | Metadata (action, targetUserId) |
| `notification_sent_by_admin` | `sendCustomNotification` / `sendBulkNotification` | Admin | Metadata (scope, count) |

### 3.5 Write path architecture

```
Mutation handler (routers.ts)
  → assertAdminAccess / platform guards
  → capture before-state (read current row)
  → execute mutation
  → capture after-state
  → auditEmitter.emit({ ... })          ← new module: server/audit/auditEmitter.ts
       ├── opsLog(event)                ← existing transport
       └── insertAuditEvent(tx?)        ← Phase B persistence
```

**Failure policy:** Audit write failure must **not** roll back the business mutation (availability over strict audit atomicity). Failed audit inserts emit `audit_persist_failed` at `error` severity. Optional future: async retry queue.

### 3.6 Retention strategy

| Tier | Duration | Storage | Access |
|------|----------|---------|--------|
| **Hot** | 90 days | `audit_events` table | Security Center UI |
| **Warm** | 1 year | Archived partition or export to object storage | Reporting / compliance export |
| **Cold** | 7 years | Compressed JSON exports (policy TBD) | Legal hold only |
| **opsLog stdout** | Per infra log retention | Log shipper | Parallel trail; not sole source |

**Purge:** Scheduled job archives rows older than hot window; never hard-delete without archive confirmation.

### 3.7 Query strategy

**Read API (admin-only):**

| Procedure | Purpose |
|-----------|---------|
| `admin.listAuditEvents` | Paginated timeline with filters |
| `admin.getAuditEvent` | Single event detail (before/after diff) |
| `admin.getAuditEventStats` | Counts by category / eventType for overview |

**Filter parameters:**

- `category`, `eventType`, `actorId`, `targetType`, `targetId`
- `from`, `to` (ISO timestamps)
- `severity`
- `cursor` + `limit` (default 50, max 200)

**Authorization:** `assertAdminAccess` only. No tenant-scoped filter needed — platform-level audit.

### 3.8 Visibility strategy

| Consumer | View |
|----------|------|
| **Security Center — Audit Timeline** | `listAuditEvents` default sort `occurredAt DESC` |
| **Security Center — Role Changes** | Filter `eventType IN (user_role_changed, account_classification_changed)` |
| **Security Center — Subscription Changes** | Filter subscription event types |
| **Operations Accounts row** | Deep link: "View audit history" → `/admin/security?targetUserId={id}` |
| **External SIEM** | `opsLog` JSON lines (existing) + optional DB export |

### 3.9 Future reporting strategy

| Report | Source | Phase |
|--------|--------|-------|
| Privilege escalation summary | `user_role_changed` grouped by actor/week | Post-C |
| Subscription mutation ledger | Subscription events + before/after | Post-C |
| Admin activity heatmap | All events by `actorId` | Future |
| Compliance export (CSV/JSON) | `admin.exportAuditEvents` | Post-C |
| Anomaly detection | Burst `user_role_changed` or `unauthorized_admin_access` | Future (ties to `suspicious_admin_activity`) |

---

## 4. Role Change Audit Design

### 4.1 Problem

`admin.updateUserRole` and `profile.updateUserRole` call `updateUserRole(userId, role)` in `server/db.ts` with **no opsLog and no persisted audit**. Privilege escalation is invisible (audit finding R1).

### 4.2 Event specification — `user_role_changed`

| Field | Value |
|-------|-------|
| **eventType** | `user_role_changed` |
| **category** | `USER` |
| **severity** | `info` |
| **procedure** | `admin.updateUserRole` or `profile.updateUserRole` |
| **actorId** | `ctx.user.id` |
| **actorRole** | `ctx.user.role` (always `admin` at success) |
| **targetType** | `user` |
| **targetId** | `input.userId` |
| **correlationId** | `ctx.correlationId` |
| **ip** | From cascade audit context when available |

**before snapshot:**

```json
{
  "userId": 42,
  "role": "user",
  "accountClassification": "COMMERCIAL"
}
```

**after snapshot:**

```json
{
  "userId": 42,
  "role": "admin",
  "accountClassification": "COMMERCIAL"
}
```

**metadata (extension):**

```json
{
  "previousRole": "user",
  "nextRole": "admin",
  "selfModificationAttempt": false,
  "platformAccountBlocked": false,
  "procedure": "admin.updateUserRole"
}
```

### 4.3 Emission rules

| Condition | Emit? |
|-----------|-------|
| Mutation succeeds | **Yes** |
| `assertNotSelfAdminTarget` throws | **No** — emit `protected_user_modify_denied` or rely on existing deny path |
| `assertProtectedUserRoleModifiable` throws | **No** — emit `protected_user_modify_denied` with `action: "role"` |
| Role unchanged (no-op update) | **No** — skip if `previousRole === nextRole` |
| Denied `assertAdminAccess` | Existing `unauthorized_admin_access` |

### 4.4 Implementation location (future)

Single emitter function called from **both** `admin.updateUserRole` and `profile.updateUserRole` handlers before return — ensures duplicate API paths produce identical audit until Phase D removes `profile.*`.

Mirror pattern: `accountClassificationAudit.ts` → new `roleChangeAudit.ts`.

### 4.5 Visibility requirements

| Surface | Content |
|---------|---------|
| **Security Center — Role Changes** | Table: timestamp, actor, target user (email/name), previous → next role |
| **Security Center — Audit Timeline** | Row with role change badge |
| **Operations Accounts** | Optional inline "Role changed by {actor} at {time}" on expand (Phase C+) |
| **User notification** | Existing `role_changed` notification type — unchanged; audit is operator-facing only |

### 4.6 Future reporting requirements

- Weekly count of `user` → `admin` promotions by actor
- Alert when single actor promotes > N users in 1 hour
- Export filter: `eventType=user_role_changed&from=...&to=...`

---

## 5. Subscription Audit Design

### 5.1 Problem

`admin.createUserSubscriptionByAdmin` and `admin.updateUserSubscriptionByAdmin` have platform guards but **no operator audit**. Delete path emits `cascade_subscription_deleted` to opsLog only. User-facing `renewal_notifications` are not operator audit.

### 5.2 Canonical subscription snapshot shape

All subscription audit events use a normalized snapshot derived from `user_subscriptions` row:

```json
{
  "subscriptionId": 101,
  "userId": 42,
  "restaurantId": 0,
  "planId": 3,
  "planCode": "PROFESSIONAL",
  "status": "active",
  "billingCycle": "monthly",
  "currentPeriodStart": "2026-01-01T00:00:00.000Z",
  "currentPeriodEnd": "2026-07-01T00:00:00.000Z",
  "trialEndsAt": null,
  "canceledAt": null
}
```

`planCode` resolved from `subscription_plans` at audit time (denormalized for historical accuracy).

### 5.3 Event — `subscription_created_by_admin`

| Field | Value |
|-------|-------|
| **eventType** | `subscription_created_by_admin` |
| **category** | `SUBSCRIPTION` |
| **severity** | `info` |
| **procedure** | `admin.createUserSubscriptionByAdmin` |
| **targetType** | `subscription` |
| **targetId** | New `subscriptionId` |
| **before** | `null` |
| **after** | Full snapshot |

**metadata:**

```json
{
  "userId": 42,
  "initiatedByAdmin": true,
  "platformAccountBlocked": false
}
```

### 5.4 Event — `subscription_updated_by_admin`

| Field | Value |
|-------|-------|
| **eventType** | `subscription_updated_by_admin` |
| **category** | `SUBSCRIPTION` |
| **severity** | `info` |
| **procedure** | `admin.updateUserSubscriptionByAdmin` |
| **targetType** | `subscription` |
| **targetId** | `input.subscriptionId` or resolved row ID |
| **before** | Pre-mutation snapshot |
| **after** | Post-mutation snapshot |

**Diff highlights for UI** (computed client-side or in metadata):

```json
{
  "changedFields": ["planId", "status", "currentPeriodEnd"],
  "previousPlanId": 2,
  "nextPlanId": 3,
  "previousStatus": "trial",
  "nextStatus": "active"
}
```

### 5.5 Event — `cascade_subscription_deleted` (enhancement)

Existing opsLog event is retained. Phase B adds persistence with:

| Field | Enhancement |
|-------|-------------|
| **before** | Full snapshot captured **before** delete |
| **after** | `null` |
| **category** | `SUBSCRIPTION` |

Align delete audit with create/update snapshot shape for consistent Security Center rendering.

### 5.6 Emission rules

| Condition | Emit |
|-----------|------|
| Create succeeds | `subscription_created_by_admin` |
| Update succeeds, at least one field changed | `subscription_updated_by_admin` |
| Update no-op | Skip |
| `assertProtectedUserSubscriptionModifiable` throws | `protected_user_modify_denied` with `action: "subscription"` |
| Webhook activation | Existing `payment_subscription_activated` (system actor, separate category) |

### 5.7 Visibility requirements

| Surface | Content |
|---------|---------|
| **Security Center — Subscription Changes** | Filtered table: actor, target user, plan, status, period end, diff summary |
| **Security Center — Audit Timeline** | Subscription event badges |
| **Operations Accounts subscription dialog** | Post-save toast unchanged; audit is async |
| **Commercial page** | No direct audit UI in Phase C; link to Security Center |

### 5.8 Future reporting

- Subscription churn initiated by operators vs payment webhooks
- Plan migration frequency (`planId` changes in `subscription_updated_by_admin`)
- Expiration extensions audit (`currentPeriodEnd` changes)

---

## 6. API Consolidation Strategy

### 6.1 Problem

Duplicate administrative capability exists on two tRPC namespaces (audit finding R4):

| Duplicate capability | `admin.*` | `profile.*` |
|---------------------|-----------|-------------|
| List all users | `admin.listAllUsers` | `profile.listAllUsers` |
| Update user role | `admin.updateUserRole` | `profile.updateUserRole` |
| Delete user | `admin.deleteUser` | `profile.deleteUser` |

Both paths use identical `assertAdminAccess` checks. Divergence risk: future hardening applied to one path only.

### 6.2 Design decision

**Canonical namespace: `admin.*`**

`profile.*` retains only self-service profile operations (`profile.get`, `profile.changePassword`, etc.). Admin governance procedures are removed from `profile` router after deprecation window.

### 6.3 Inventory approach

| Step | Action |
|------|--------|
| I1 | Generate static inventory: all `profile.*` procedures with `assertAdminAccess` |
| I2 | Map each to canonical `admin.*` equivalent or mark unique |
| I3 | Grep client codebase for `trpc.profile.listAllUsers`, `updateUserRole`, `deleteUser` |
| I4 | Document in `ADMIN-SECURITY-CENTER-API-INVENTORY.md` (implementation artifact) |
| I5 | Add `@deprecated` JSDoc on server handlers + runtime `console.warn` on `profile.*` admin calls (Phase D) |

**Current inventory (from audit):**

| `profile.*` procedure | Canonical replacement | Client usage |
|-----------------------|----------------------|--------------|
| `profile.listAllUsers` | `admin.listAllUsers` | Verify — likely unused (Operations uses `admin.getOwnerOverviewList`) |
| `profile.updateUserRole` | `admin.updateUserRole` | Verify — Security uses `admin.updateUserRole` per `securityDomain.ts` |
| `profile.deleteUser` | `admin.deleteUser` | Verify — Security uses `admin.deleteUser` |

### 6.4 Deprecation strategy

| Phase | Action |
|-------|--------|
| **D1 — Announce** | Add deprecation comment on three `profile.*` handlers; emit `deprecated_api_used` audit event when called |
| **D2 — Client sweep** | Replace any client references with `admin.*` equivalents |
| **D3 — Soft remove** | Return `TRPCError` with code `NOT_FOUND` and message directing to `admin.*` (or keep handler with deprecation warning for 1 release) |
| **D4 — Hard remove** | Delete handlers from `profileRouter` |

**Timeline recommendation:** Minimum **one release cycle** between D1 and D4.

### 6.5 Migration strategy

| Layer | Migration |
|-------|-----------|
| **Client** | All `trpc.profile.{listAllUsers,updateUserRole,deleteUser}` → `trpc.admin.*` |
| **Server emitters** | Audit functions called from shared internal helper invoked by both paths during D1–D3 |
| **Tests** | Duplicate tests on `profile.*` redirected to `admin.*` |
| **External consumers** | None known; document in changelog |

**No behavior change** during migration — same guards, same responses, same audit.

### 6.6 Removal criteria

All must be true before D4 hard remove:

| Criterion | Verification |
|-----------|--------------|
| Zero client references to deprecated `profile.*` admin procedures | `rg 'profile\.(listAllUsers|updateUserRole|deleteUser)' client/` |
| Zero server-internal calls | `rg` across `server/` |
| `deprecated_api_used` event count = 0 for 30 days in production logs | Log shipper query |
| Audit emitters wired on `admin.*` only paths | Code review |
| Tests updated and passing | CI |

### 6.7 Explicit non-actions

- **Do not remove** `profile.get`, `profile.changePassword`, or other self-service endpoints
- **Do not merge routers** — keep `admin` and `profile` namespaces; only deduplicate governance procedures
- **Do not change permissions** — consolidation is surface-area reduction only

---

## 7. Security Center UI Design

### 7.1 Objective

Replace `/admin/security` placeholder with an operator **governance visibility console**. Mutations remain in Operations Accounts workspace in Phase C; Security Center provides **overview, audit, warnings, and deep links**.

### 7.2 Information architecture

```
/admin/security
├── Security Overview          (default landing)
├── Audit Timeline
├── Role Changes
├── Subscription Changes
├── Protected Accounts
└── Security Warnings
```

**Layout:** Single-page workspace with **section anchors** (not separate routes in MVP). Uses `AdminOperationsShell` with `compact` + standard content width. Workspace-First RTL policy inherited.

### 7.3 Section specifications

#### 7.3.1 Security Overview

| Element | Content | Data source |
|---------|---------|-------------|
| **Protection status card** | `OWNER_OPEN_ID` configured, platform user resolved, protection active | `admin.getSecurityHealth` |
| **Recent activity strip** | Last 10 audit events (all categories) | `admin.listAuditEvents` |
| **Quick stats** | Role changes (7d), subscription mutations (7d), denied admin attempts (7d) | `admin.getAuditEventStats` |
| **Governance shortcuts** | Links to Operations Accounts, internal user create | Static + `operationsTabHref("accounts")` |

**Purpose:** At-a-glance security posture without leaving `/admin/security`.

#### 7.3.2 Audit Timeline

| Element | Content |
|---------|---------|
| **Filter bar** | Category, eventType, date range, actor, target |
| **Event list** | Chronological cards: icon by category, actor, target, summary, timestamp |
| **Detail drawer** | Full before/after JSON diff (sanitized), correlationId, procedure, IP |
| **Pagination** | Cursor-based infinite scroll or page controls |

**Empty state:** "No audit events in selected range" with link to documentation on Phase A/B rollout.

#### 7.3.3 Role Changes

| Element | Content |
|---------|---------|
| **Filtered view** | `eventType IN (user_role_changed, account_classification_changed)` |
| **Columns** | Time, actor, target user, change type, before → after |
| **Row action** | "Open in Operations" → `/admin/operations?tab=accounts&highlight={userId}` |

Dedicated section (not just a filter preset) signals privilege-escalation monitoring priority.

#### 7.3.4 Subscription Changes

| Element | Content |
|---------|---------|
| **Filtered view** | `subscription_created_by_admin`, `subscription_updated_by_admin`, `cascade_subscription_deleted` |
| **Columns** | Time, actor, target user, plan, status, period end, change summary |
| **Diff badge** | Highlight plan/status/expiration changes |

#### 7.3.5 Protected Accounts

| Element | Content |
|---------|---------|
| **Platform account card** | Resolved platform user: name, email, `isProtectedPlatformAccount`, classification, role |
| **Protection rules summary** | Read-only list of blocked actions (delete, role, classification, subscription, password reset) |
| **Configuration display** | `ownerOpenIdConfigured: true/false` — show prefix only (first 8 chars) or "Configured" badge — **never full openId** |
| **Related audit** | Filter timeline to `targetId = platformUserId` |

**No mutation controls** in this section — governance actions stay in Operations.

#### 7.3.6 Security Warnings

| Element | Content |
|---------|---------|
| **Active warnings list** | From `admin.getSecurityHealth.warnings` |
| **Warning types** | `OWNER_OPEN_ID_MISSING`, `PLATFORM_USER_NOT_RESOLVED`, `PLATFORM_USER_NOT_ADMIN`, `AUDIT_PERSIST_FAIL_BURST` |
| **Severity styling** | Critical (red), Warning (amber), Info (slate) |
| **Resolution hints** | Link to deployment runbook (documentation) |

Persistent banner at top of Security Center when any critical warning is active.

### 7.4 Navigation placement

| Location | Behavior |
|----------|----------|
| **Sidebar** | Existing `security` entry in `ADMIN_ROUTE_DEFINITIONS` (`adminRoutes.ts`) — icon `Shield`, path `/admin/security` |
| **Nav group** | `main` group between `health` and `reports` (unchanged order) |
| **Breadcrumbs** | Overview → Security |
| **Command Center** | Optional future quick action: "Open Security Center" on `/admin` Needs Attention when warnings exist |

### 7.5 Relationship with Operations workspace

| Concern | Security Center | Operations Accounts |
|---------|-----------------|---------------------|
| **Role edit** | View history | **Execute** (`SecurityRolesSection`) |
| **Classification edit** | View history | **Execute** (`SecurityClassificationSection`) |
| **Internal user create** | Link | **Execute** (`SecurityAccountControlsSection`) |
| **User delete** | View history | **Execute** (with confirm dialog) |
| **Subscription CRUD** | View history | **Execute** (subscription dialog) |
| **Account list** | Deep link only | **Primary** account table |

**Design principle:** **Operate in Operations, observe in Security.** Avoid duplicating mutation UI in Phase C. Phase C+ may add read-only governance tables to Security Center if operator feedback requires it.

Update `securityDomain.ts` registry: add `surfaces: ["security"]` entries for audit viewer components (implementation phase).

### 7.6 Future scalability

| Extension | Placement |
|-----------|-----------|
| Tiered platform roles UI | Security Overview + new Roles section |
| Notification send audit | Audit Timeline filter |
| Commercial export audit | Commercial Events filter |
| Plan/pricing governance | New section when runtime API exists |
| Real-time alert feed | Security Warnings WebSocket/poll |
| Compliance export | Audit Timeline export button → `admin.exportAuditEvents` |

**Component structure (implementation guide, not code):**

```
client/src/components/admin/domains/security/
  SecurityCenterComposition.tsx       ← page shell
  SecurityOverviewSection.tsx
  SecurityAuditTimelineSection.tsx
  SecurityRoleChangesSection.tsx
  SecuritySubscriptionChangesSection.tsx
  SecurityProtectedAccountsSection.tsx
  SecurityWarningsSection.tsx
```

---

## 8. Implementation Phases

### Phase A — Audit Hardening

**Goal:** Close highest-risk audit gaps via `opsLog` emitters before persistence exists. Security Center can ship with log-shipper integration as interim.

| Scope | Items |
|-------|-------|
| **Events** | `user_role_changed`, `subscription_created_by_admin`, `subscription_updated_by_admin`, enhanced `cascade_subscription_deleted` snapshots |
| **Additional** | `subscriber_account_created`, `admin_password_reset`, `restaurant_created_by_admin`, `protected_user_modify_denied` |
| **OWNER_OPEN_ID** | Startup validation + `platform_protection_*` events; prod fail-fast on empty |
| **Modules** | `roleChangeAudit.ts`, `subscriptionAudit.ts`, extend `opsTaxonomy.ts` |
| **Tests** | Unit tests per emitter; integration tests on tRPC success paths |

| Dependency | Status |
|------------|--------|
| Audit document | Complete |
| This design | Complete |
| Schema changes | **None** in Phase A |

| Risk | Mitigation |
|------|------------|
| Emitter forgotten on `profile.*` duplicate | Shared internal helper called from both paths |
| before/after capture adds latency | Single read before mutation; acceptable for admin mutations |
| opsLog volume increase | Expected; document for infra |

**Success criteria:**

- [ ] `admin.updateUserRole` emits `user_role_changed` with `previousRole`/`nextRole`
- [ ] Subscription create/update emit typed events with snapshots
- [ ] Production refuses to start without `OWNER_OPEN_ID`
- [ ] Development emits `platform_protection_degraded` when unset
- [ ] `npm run check` + `npm test` pass
- [ ] No permission or schema changes

---

### Phase B — Audit Persistence

**Goal:** Durable, queryable `audit_events` store with dual-write and read API.

| Scope | Items |
|-------|-------|
| **Schema** | `audit_events` table per §3.3 |
| **Migration** | Drizzle migration (implementation phase) |
| **Emitter** | `auditEmitter.ts` — dual-write opsLog + DB |
| **Read API** | `admin.listAuditEvents`, `admin.getAuditEvent`, `admin.getAuditEventStats`, `admin.getSecurityHealth` |
| **Backfill** | None — forward-only from deploy date |
| **Retention job** | Archive script design; optional in MVP |

| Dependency | Required |
|------------|----------|
| Phase A emitters | Yes — persistence layer wraps existing event shapes |
| Migration approval | Yes |

| Risk | Mitigation |
|------|------------|
| Audit write failure | Non-blocking; `audit_persist_failed` event |
| Table growth | Indexes + retention policy |
| PII in snapshots | Strip `passwordHash`; email optional in metadata |

**Success criteria:**

- [ ] Successful governance mutations appear in `audit_events`
- [ ] `admin.listAuditEvents` returns paginated results for admin caller
- [ ] Dual-write: opsLog still emits for every persisted event
- [ ] `admin.getSecurityHealth` returns protection status
- [ ] Migration reversible with documented rollback

---

### Phase C — Security Center UI

**Goal:** Live `/admin/security` workspace consuming Phase B read APIs.

| Scope | Items |
|-------|-------|
| **Page** | Replace `AdminSectionPlaceholder` for `security` route |
| **Sections** | All six per §7.3 |
| **i18n** | `admin.security.*` keys (en + ar) |
| **Deep links** | Operations Accounts highlight param |
| **RTL** | Workspace-First; inherit `AdminOperationsShell` |

| Dependency | Required |
|------------|----------|
| Phase B read API | **Hard** — timeline sections need `listAuditEvents` |
| Phase A health events | Soft — Warnings section useful with `getSecurityHealth` |
| ADMIN-RTL-WORKSPACE | Complete |

| Risk | Mitigation |
|------|------------|
| Large before/after JSON in UI | Collapsible diff; truncate in list |
| Empty audit on fresh deploy | Empty states + documentation |
| Duplicate governance UI | Operate-in-Operations principle |

**Success criteria:**

- [ ] `/admin/security` renders six sections (overview may collapse subsections)
- [ ] Audit Timeline loads from `admin.listAuditEvents`
- [ ] Role Changes and Subscription Changes show filtered data
- [ ] Protected Accounts shows platform user status
- [ ] Security Warnings shows degraded state in dev without `OWNER_OPEN_ID`
- [ ] Operations governance unchanged; deep links work
- [ ] Arabic + English UI validated under Workspace-First

---

### Phase D — API Consolidation

**Goal:** Remove duplicate `profile.*` admin governance endpoints.

| Scope | Items |
|-------|-------|
| **Inventory doc** | `ADMIN-SECURITY-CENTER-API-INVENTORY.md` |
| **Deprecation** | `deprecated_api_used` events |
| **Client sweep** | Zero `profile.*` admin references |
| **Removal** | Delete three duplicate handlers |

| Dependency | Recommended |
|------------|-------------|
| Phase A audit on both paths | Yes — during deprecation window |
| Phase C | Independent |

| Risk | Mitigation |
|------|------------|
| Unknown external consumer | Deprecation warning period + log monitoring |
| Test breakage | Update tests in same PR as removal |

**Success criteria:**

- [ ] All removal criteria in §6.6 met
- [ ] `profile.*` admin governance procedures deleted
- [ ] `admin.*` paths unchanged in behavior
- [ ] `deprecated_api_used` count zero for 30 days (production)

---

### Phase sequencing diagram

```
Phase A (Audit Hardening)
    │
    ├──────────────────────┐
    ▼                      ▼
Phase B (Persistence)   Phase D (API Consolidation) — may parallel after A
    │
    ▼
Phase C (Security Center UI)
```

**Recommended order:** A → B → C, with D starting after A (parallel to B if staffed).

---

## 9. Risks

| ID | Severity | Risk | Mitigation in design |
|----|----------|------|----------------------|
| D-R1 | High | Phase C ships before Phase B — empty audit UI | Hard dependency; interim log-shipper view documented as non-MVP |
| D-R2 | High | Prod fail-fast on missing `OWNER_OPEN_ID` blocks deploy | Deployment checklist + CI env validation |
| D-R3 | Medium | Audit dual-write failure loses persisted trail | `audit_persist_failed` + opsLog remains |
| D-R4 | Medium | Flat admin model unchanged — any admin sees all audit | Accept for MVP; tiered roles are future gate |
| D-R5 | Medium | `profile.*` removal breaks unknown client | Deprecation window + `deprecated_api_used` |
| D-R6 | Medium | before/after snapshots contain PII | Strip secrets; document email retention policy |
| D-R7 | Low | Event taxonomy drift | Extend `OPS_EVENT` constants; lint in CI |
| D-R8 | Low | Security Center duplicates Operations | Operate-in-Operations design principle |
| D-R9 | Low | Wrong `OWNER_OPEN_ID` protects wrong user | Health probe + manual runbook verification |

---

## 10. Recommendations

### Immediate (approve and plan implementation)

1. **Proceed with Phase A** — highest ROI; closes R1/R2 without schema changes.
2. **Add `OWNER_OPEN_ID` to production deployment checklist** — fail-fast policy per §2.5.
3. **Approve `audit_events` schema** in separate migration review before Phase B coding.

### Short-term (Phases B + C)

4. **Ship Security Center as read-only console** — no governance mutation relocation in MVP.
5. **Wire `securityDomain.ts` surfaces** to include `"security"` for new audit components.
6. **Add Command Center drill link** when `getSecurityHealth.warnings.length > 0` (optional polish).

### Medium-term (Phase D + operations)

7. **Complete API consolidation** before any new admin procedures are added.
8. **Adopt `adminProcedure` middleware** for new handlers to reduce forgotten-check risk.
9. **Document seed-script plan/pricing changes** as out-of-band audited operations until runtime API exists.

### Deferred (product gate — not in this program)

10. **Tiered platform roles** (Owner / Admin / Support) — requires schema + authorization redesign.
11. **Scoped admin** (read-only support role) — depends on #10.
12. **Persisted `staffCategory`** — only if authorization-relevant.

---

## Appendix A — Authority chain

| Document | Role |
|----------|------|
| `ADMIN-SECURITY-CENTER-AUDIT.md` | Problem source of truth |
| `ADMIN-SECURITY-CENTER-DESIGN.md` | This document — approved implementation design |
| `ADMIN-RTL-WORKSPACE-COMPLETION.md` | UI shell prerequisite |
| `securityDomain.ts` | Asset ownership registry |

## Appendix B — Future implementation artifacts (not created in this phase)

| Artifact | Phase |
|----------|-------|
| `ADMIN-SECURITY-CENTER-PHASE-A.md` | Implementation report |
| `ADMIN-SECURITY-CENTER-API-INVENTORY.md` | Phase D |
| `ADMIN-SECURITY-CENTER-COMPLETION.md` | Program close |

---

*Design approved for implementation planning. No code, migrations, permissions, or schemas were modified.*
