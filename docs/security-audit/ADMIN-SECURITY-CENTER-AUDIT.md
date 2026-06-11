# Admin Security Center — Discovery & Audit

**Project:** MineuQR  
**Program:** ADMIN-SECURITY-CENTER  
**Phase:** Discovery & Audit Only  
**Date:** 2026-06-10  
**Method:** Read-only code inspection — schemas, enums, routers, middleware, guards, ops telemetry. Local database contents are **not** used as authority.

**Prerequisite:** `ADMIN-RTL-WORKSPACE` complete (`ADMIN-RTL-WORKSPACE-COMPLETION.md`). `/admin/security` is a placeholder route; governance UI is partially embedded in Operations Accounts workspace.

---

## Executive Summary

MineuQR uses a **binary authorization model** (`users.role`: `user` | `admin`) with orthogonal **account classification** (`COMMERCIAL` | `INTERNAL` | `SYSTEM`). There is **no super-admin tier** in schema or server enforcement. Platform owner protection is **openId-based** via `OWNER_OPEN_ID` env var, not hardcoded user IDs.

**Strengths:** Centralized `assertAdminAccess`; platform account guards on delete, role, classification, password reset, and subscription mutations; tenant boundary logging; cascade delete audit for user/restaurant/subscription deletes; classification change audit with before/after.

**Gaps:** Flat admin model (any admin can grant admin); duplicate admin API surface on `profile` router; role changes and most create/update sensitive ops **not audited**; opsLog is **console-only** (no persisted audit table); plan/pricing has **no runtime admin API**; `OWNER_OPEN_ID` unset → platform protection inactive.

---

## Current Architecture

### Layer model

```
┌─────────────────────────────────────────────────────────────────┐
│  Client (SPA)                                                   │
│  • /admin/* — UI gate: role === "admin" (useAuthGate)           │
│  • adminQueriesEnabled — defers tRPC until admin session known  │
│  • securityGovernance.ts — UI-only guards (not server auth)     │
└────────────────────────────┬────────────────────────────────────┘
                             │ tRPC / REST
┌────────────────────────────▼────────────────────────────────────┐
│  Server                                                         │
│  • publicProcedure / protectedProcedure / verifiedProcedure     │
│  • adminProcedure — defined, **unused** by routers              │
│  • assertAdminAccess(ctx, procedure) — canonical admin check    │
│  • assertRestaurantAccess — owner OR admin                      │
│  • platformAccount.ts + cascadeDeletes assert* — protected user  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  MySQL (Drizzle schema)                                         │
│  users → restaurants → menu domain tables                       │
│  users → user_subscriptions (restaurantId=0 account-level)      │
│  subscription_plans — seed/script managed, no admin CRUD router   │
└─────────────────────────────────────────────────────────────────┘
```

### Auth role vs commercial plan (critical distinction)

| Concept | Source | Values | Purpose |
|---------|--------|--------|---------|
| **Auth role** | `users.role` | `user`, `admin` | Platform authorization |
| **Account classification** | `users.accountClassification` | `COMMERCIAL`, `INTERNAL`, `SYSTEM` | Analytics population boundary |
| **Commercial plan** | `subscription_plans` + entitlements | `NONE`, `TRIAL`, `BASIC`, … | Feature gating for tenants |
| **`commercial.isAdmin`** | `planFeatureMatrix` | boolean | Subscriber UI feature unlock — **not** `users.role` |

An `INTERNAL` user with `role=admin` passes `assertAdminAccess` but is excluded from MRR/subscriber KPI population (`commercialPopulation.ts`).

### Admin route surface (client)

All require authenticated `role === "admin"` at page level (`AdminAccessDenied` otherwise):

| Path | Component | Server mutations |
|------|-----------|------------------|
| `/admin` | `AdminDashboardHome` | Read-only dashboard |
| `/admin/commercial` | `AdminCommercialPage` | Read + export |
| `/admin/analytics` | `AdminAnalyticsPage` | Read |
| `/admin/operations` | `AdminManagement` | Full governance (accounts/tenants/comms) |
| `/admin/tenants` | Redirect → `/admin/operations?tab=tenants` | — |
| `/admin/security` | Placeholder | No dedicated Security Center UI yet |
| `/admin/customer-success`, `/health`, `/reports`, `/launch-readiness` | Placeholders | — |

**Legacy redirects (no auth on redirect hop):** `/super-admin` → `/admin`, `/statistics` → `/admin/analytics`, `/users` → `/admin/operations?tab=accounts`. Destination pages enforce admin gate.

**Non-admin authenticated route:** `/commercial/diagnostics` — any logged-in user.

### Server router map

| Router | Admin procedures | Enforcement |
|--------|------------------|-------------|
| `admin` (`adminCoreRouter` + `adminDashboardReadRouter`) | User/subscription/notifications + dashboard reads | `assertAdminAccess` per handler |
| `commercial` | Owner commercial state reads | Admin reads only |
| `analytics` | MRR, ARR, plan distribution, expiring | Admin only |
| `profile` | **Duplicate:** `listAllUsers`, `updateUserRole`, `deleteUser` | Same `assertAdminAccess` |
| `restaurant` | `create` with admin owner assignment; cross-tenant access | `assertRestaurantAccess` + inline admin bypasses |

---

## Roles & Permissions Matrix

### Role enums (authoritative)

| Enum | Location | Values |
|------|----------|--------|
| `users.role` | `drizzle/schema.ts` | `user` (default), `admin` |
| `users.accountClassification` | `drizzle/schema.ts` | `COMMERCIAL` (default), `INTERNAL`, `SYSTEM` |
| `ACCOUNT_CLASSIFICATIONS` | `shared/accountClassification.ts` | Same as DB |
| `INTERNAL_STAFF_CATEGORIES` | `shared/accountClassification.ts` | `marketing`, `sales`, `support`, `operations` — **audit metadata only, not authorization** |
| `USER_ROLES` / `COMMERCIAL_PLANS` | `src/lib/commercial/planTypes.ts` | Commercial context — not auth roles |
| `notificationType` | `drizzle/schema.ts` | Includes `role_changed` (user notification, not audit) |

**Forbidden combo:** `role=admin` + `classification=SYSTEM` — blocked in `admin.updateAccountClassification` (`isForbiddenSystemAdminCombo`).

**No super-admin:** `/super-admin` redirects to `/admin`. `SuperAdminAccessDenied` exists in `AuthGate.tsx` but is **never mounted**. All elevated access = `users.role === "admin"`.

### Permission checks

| Check | File | Rule |
|-------|------|------|
| `assertAdminAccess` | `server/_core/assertAdminAccess.ts` | `ctx.user.role === "admin"`; logs `unauthorized_admin_access` + suspicious burst on deny |
| `assertNotSelfAdminTarget` | `server/_core/assertAdminAccess.ts` | Admin cannot target self in user-management tools |
| `assertRestaurantAccess` | `server/restaurantAccess.ts` | `restaurant.userId === ctx.user.id` OR `role === "admin"` |
| `assertUserDeletable` | `server/db/cascadeDeletes.ts` | Blocks platform account delete |
| `assertProtectedUserRoleModifiable` | `server/db/cascadeDeletes.ts` | Blocks platform account role change |
| `assertProtectedUserPasswordResetAllowed` | `server/db/cascadeDeletes.ts` | Blocks admin password reset on platform account |
| `assertProtectedUserClassificationModifiable` | `server/db/cascadeDeletes.ts` | Blocks platform account classification change |
| `assertProtectedUserSubscriptionModifiable` | `server/db/cascadeDeletes.ts` | Blocks subscription/invoice admin ops on platform account |
| `isEmailVerificationRequired` | `server/_core/emailVerificationPolicy.ts` | Admins skip email verification |
| `canEditAccountGovernance` etc. | `client/.../securityGovernance.ts` | **UI only** — self + platform account |

### Admin-only tRPC procedures (complete inventory)

**`admin` core mutations** (`server/routers.ts`):

| Procedure | Sensitive | Platform guard | Self guard |
|-----------|-----------|----------------|------------|
| `createSubscriberAccount` | Yes | No | No |
| `resetSubscriberPassword` | Yes | Yes | No |
| `createInternalUser` | Yes | No | No |
| `updateAccountClassification` | Yes | Yes | Yes |
| `updateUserRole` | Yes | Yes | Yes |
| `deleteUser` | Yes | Yes (cascade) | Yes |
| `createUserSubscriptionByAdmin` | Yes | Yes | No |
| `updateUserSubscriptionByAdmin` | Yes | Yes | No |
| `deleteUserSubscriptionByAdmin` | Yes | Yes | No |
| `sendCustomNotification` | Medium | No | No |
| `sendBulkNotification` | High | No | No |
| `generateInvoicePDF` | Medium | Yes | No |

**Deprecated stubs (throw on call):** `createRestaurantSubscription`, `updateRestaurantSubscription`, `cancelRestaurantSubscription`, `deleteRestaurantSubscription`, `getStatistics`, `getRevenueByMonth`.

**`admin` dashboard reads** (`server/commercial/adminDashboardRouter.ts`): `getOwnerOverview`, `getOwnerOverviewList`, `getSubscriptionOverview`, `getDashboardSummary`, `getCommercialOverview`, `getCommercialAnalytics`, `getCommercialExportPackage`, `exportCommercialReport`, `listRestaurants`.

**`commercial` admin reads** (`server/commercial/router.ts`): `getOwnerCommercialState`, `getOwnerCommercialStates`, `getOwnerPlan`, `getOwnerEntitlements`, `getOwnerTrialStatus`, `getOwnerSubscription`.

**`analytics` admin reads** (`server/commercial/analyticsRouter.ts`): `getMRR`, `getARR`, `getPlanDistribution`, `getSubscriberCounts`, `getExpiringAccounts`.

**`profile` duplicates:** `listAllUsers`, `updateUserRole`, `deleteUser` — identical privilege, expanded attack surface for review.

### Implicit permission logic (no `assertAdminAccess`)

| Location | Behavior |
|----------|----------|
| `restaurant.create` | Admins skip `assertRestaurantCreateAllowed`; may assign `ownerUserId` / `ownerEmail` |
| `restaurant.updateTemplate/CustomColors/CustomFonts` | Admins skip subscription entitlement checks |
| `category.create`, `menuItem.create` | Admins skip plan limit checks |
| `assertRestaurantAccess` | Admins access **any** restaurant across all tenant routers |
| `upsertUser` (platform openId) | Auto-promotes to `role=admin` + `classification=INTERNAL` |
| `sendBulkNotification` | Any admin can message **all** users |

### Super-admin-only routes

**None.** No procedure, middleware, or route requires a tier above `admin`.

---

## Protected Accounts

### Current protection model (ADMIN-AUTH-1D)

| Mechanism | Detail |
|-----------|--------|
| Identity | `ENV.ownerOpenId` (`OWNER_OPEN_ID`) → `users.openId` match |
| Detection | `server/platformAccount.ts` — `isPlatformAccountOpenId`, `isPlatformAccountUserId` |
| API flag | `sanitizeUserForAdminResponse` adds `isProtectedPlatformAccount: boolean` |
| Client | `shared/platformAccount.ts` — `isProtectedPlatformAccountUser` |
| Deprecated | `PROTECTED_USER_IDS = []`, `isProtectedUserId()` always `false` (`shared/const.ts`) |

**Critical env dependency:** If `OWNER_OPEN_ID` is empty, **no platform account is protected**.

### Bootstrap behavior

On OAuth/SDK upsert (`server/db.ts`): when `openId === ENV.ownerOpenId`, user is forced to `role=admin` and `accountClassification=INTERNAL`.

### Protected mutations (server-enforced)

| Action | Guard | Error |
|--------|-------|-------|
| Delete user | `assertUserDeletable` | `ProtectedUserDeleteError` |
| Change role | `assertProtectedUserRoleModifiable` | `ProtectedUserModifyError` |
| Admin password reset | `assertProtectedUserPasswordResetAllowed` | `ProtectedUserModifyError` |
| Change classification | `assertProtectedUserClassificationModifiable` | `ProtectedUserModifyError` |
| Subscription CRUD + invoice PDF | `assertProtectedUserSubscriptionModifiable` | `ProtectedUserModifyError` |

**Not protected:** `sendCustomNotification` to platform account; restaurant delete on platform-owned restaurants (admins can delete any restaurant).

### Hardcoded emails (operational, not protection identity)

| Email / domain | File | Role |
|----------------|------|------|
| `info@mineuqr.com` | `server/email.ts`, `owner-email-notifications.ts`, contact router | Default from / owner inbox fallback |
| `https://www.mineuqr.com` | `auth-local/httpHelpers.ts`, `routers.ts` | Auth/payment URL fallback |
| `k.sh61@yahoo.com` | `client/pages/Terms.tsx`, `Privacy.tsx` | Legal contact display |
| `support@qrmenu.com` | `SubscriptionSuccess.tsx`, `SubscriptionCancel.tsx` | Legacy brand on subscription pages |

Platform owner protection does **not** use email matching — only `openId`.

### Client governance (defense in depth)

Embedded in Operations Accounts workspace (`CustomerSuccessAccountsSection`):

- `SecurityRolesSection` — role edit/delete UI
- `SecurityClassificationSection` — classification UI
- `SecurityAccountControlsSection` — internal user create, delete confirm dialogs
- `SecurityPlatformAccountBadge` — protected account indicator

Registry: `client/src/lib/admin/domains/security/securityDomain.ts`.

---

## Sensitive Operations

### Operation matrix

| Operation | Entry point | Auth | Platform guard | Audited (success) |
|-----------|-------------|------|----------------|-------------------|
| **User create (subscriber)** | `admin.createSubscriberAccount` | Admin | No | **No** |
| **User create (internal)** | `admin.createInternalUser` | Admin | No | **Yes** — `internal_user_created` |
| **User create (owner register)** | `POST /api/auth/register` | Public | No | Partial — `email_verification_requested` only |
| **User delete** | `admin.deleteUser`, `profile.deleteUser` | Admin | Yes | **Yes** — `cascade_user_deleted` |
| **Role change** | `admin.updateUserRole`, `profile.updateUserRole` | Admin | Yes + self | **No** |
| **Classification change** | `admin.updateAccountClassification` | Admin | Yes + self + SYSTEM combo | **Yes** — `account_classification_changed` (before/after) |
| **Admin password reset** | `admin.resetSubscriberPassword` | Admin | Yes | **No** |
| **Tenant create (restaurant)** | `restaurant.create` | Verified; admin assigns owner | No | **No** |
| **Tenant delete (restaurant)** | `restaurant.delete` | Owner or admin | No | **Yes** — `cascade_restaurant_deleted` |
| **Subscription create** | `admin.createUserSubscriptionByAdmin` | Admin | Yes | **No** (user notification only) |
| **Subscription update** | `admin.updateUserSubscriptionByAdmin` | Admin | Yes | **No** |
| **Subscription delete** | `admin.deleteUserSubscriptionByAdmin` | Admin | Yes | **Yes** — `cascade_subscription_deleted` |
| **Plan create/update/delete** | — | **No runtime API** | — | **No** |
| **Pricing update** | `server/seed-plans.mjs` | Offline script | — | **No** |
| **Bulk notification** | `admin.sendBulkNotification` | Admin | No | **No** |
| **Commercial export** | `admin.exportCommercialReport` | Admin | No | **No** (export package has `generatedByUserId`) |
| **Payment activation** | PayPal/Tap webhooks | System | — | **Yes** — `payment_subscription_activated` (no actorId) |

### Subscription ownership model

- **Canonical:** `user_subscriptions.restaurantId = 0` (account-level)
- **Legacy:** `restaurantId > 0` — admin restaurant-scoped procedures retired
- Resolution: `subscriptionResolver.ts`, `ownerAccountSubscriptionAuthority.ts`, `adminSubscriptionHelpers.ts`

### Restaurant / tenant ownership model

- No `tenants` table — tenant = user + owned `restaurants`
- `restaurants.userId` → owning user
- `restaurants.ownerEmail` — display field, separate from `users.email`
- Admin can create restaurant for arbitrary owner via `ownerUserId` / `ownerEmail`

---

## Audit Coverage

### Infrastructure

| Component | Path | Persistence |
|-----------|------|-------------|
| `opsLog` | `server/_core/opsLog.ts` | **Stdout/stderr only** (`OPS_LOG_JSON=1` for JSON lines) |
| `OPS_EVENT` taxonomy | `server/_core/opsTaxonomy.ts` | Constants — no DB table |
| `authAudit` | `server/_core/authAudit.ts` | Denials + auth events → opsLog |
| `accountClassificationAudit` | `server/accountClassificationAudit.ts` | Classification + internal user create |
| `cascadeAudit` | `server/db/cascadeAudit.ts` | Delete cascades with actor context |
| `renewal_notifications` | DB table | **User-facing** notifications — not operator audit |

### ADMIN-category ops events (existing)

| Event | When emitted | Actor | Before/after |
|-------|--------------|-------|--------------|
| `unauthorized_admin_access` | Admin check denied | Attempted user | No |
| `account_classification_changed` | Classification mutation success | `actorId`, `role` | **Yes** — previous/next classification |
| `internal_user_created` | Internal user create success | `actorId`, `role` | After-state metadata |
| `cascade_user_deleted` | User delete start + complete | `actorId`, `role`, `procedure`, `ip` | Target ID only |
| `cascade_restaurant_deleted` | Restaurant delete | Same | Restaurant ID only |
| `cascade_subscription_deleted` | Subscription delete | Same | Subscription ID only |
| `tenant_boundary_violation` | Cross-tenant access denied | Actor | No |
| `suspicious_admin_activity` | Burst denied admin attempts | — | Threshold metadata |

### Missing audit trails (high priority)

| Operation | Gap |
|-----------|-----|
| `admin.updateUserRole` | No `user_role_changed` event; no `previousRole`/`nextRole` |
| `admin.createSubscriberAccount` | No operator audit |
| `admin.resetSubscriberPassword` | No credential-change audit |
| `restaurant.create` | No tenant provisioning audit (including admin-assigned owner) |
| `admin.createUserSubscriptionByAdmin` | No operator audit |
| `admin.updateUserSubscriptionByAdmin` | No before/after plan/status/billing |
| `admin.generateInvoicePDF` | No audit |
| `admin.sendBulkNotification` / `sendCustomNotification` | No audit |
| Plan/pricing changes | Out-of-band script only |

### Missing actor tracking

- Payment webhook `payment_subscription_activated` — has `userId`/`planId`, no `actorId` (system actor acceptable)
- Successful sensitive admin mutations listed above — no `actorId` in opsLog

### Persisted audit store

**None.** `opsLog` does not write to MySQL. Compliance-grade retention requires log shipping or a future `audit_events` table.

---

## Authority Boundaries

### Hierarchy

```
Platform (MineuQR)
├── users (role: admin | user)
│   ├── accountClassification (COMMERCIAL | INTERNAL | SYSTEM)
│   └── user_subscriptions (restaurantId=0, planId)
└── restaurants (per user)
    ├── categories, menu_items, offers, tables, orders, holidays
    └── legacy user_subscriptions (restaurantId>0, deprecated admin paths)
```

### Boundary rules

| Boundary | Enforcement | Violation handling |
|----------|-------------|-------------------|
| **Platform → Tenant** | `assertAdminAccess` for admin reads/mutations; admins bypass tenant ownership | `unauthorized_admin_access` on deny |
| **Tenant → Restaurant** | `assertRestaurantAccess` — owner or admin | `tenant_boundary_violation` + suspicious burst |
| **Restaurant → Menu domain** | Same `assertRestaurantAccess` on all scoped routers | Logged deny |
| **User → Subscription** | Owner reads via `verifiedProcedure`; admin via `assertAdminAccess` + platform guards | Protected user modify errors |
| **Platform owner** | `OWNER_OPEN_ID` guards on destructive governance | `ProtectedUser*Error` |

### Observed boundary characteristics

| Pattern | Assessment |
|---------|------------|
| Admin cross-tenant restaurant access | **By design** — any admin operates any restaurant |
| Admin can grant `role=admin` to any user | **Flat model** — no tiered platform roles |
| `INTERNAL` / `SYSTEM` excluded from commercial KPIs | **Correct** analytics boundary — not access control |
| `profile.*` duplicates `admin.*` | **Surface-area risk** — same checks, two API paths |
| Client `securityGovernance` | **Not a boundary** — server must enforce (does for listed guards) |
| `/admin/security` placeholder | Security governance lives in Operations Accounts today |

### Potential boundary violations (design-level)

1. **Privilege escalation without audit** — any admin can promote another user with no ops trail.
2. **Unbounded admin restaurant power** — no scoped admin (e.g. support-only); full cross-tenant write.
3. **Env misconfiguration** — empty `OWNER_OPEN_ID` removes platform protection entirely.
4. **Duplicate API paths** — `profile.updateUserRole` could be forgotten in future hardening reviews.

---

## Risks

| ID | Severity | Risk | Evidence |
|----|----------|------|----------|
| R1 | **High** | Role changes unaudited — privilege escalation invisible | `updateUserRole` in `db.ts` has no `opsLog` |
| R2 | **High** | `OWNER_OPEN_ID` unset → platform account unprotected | `isPlatformAccountOpenId` never matches empty string |
| R3 | **High** | Flat admin — no role granularity | Single `admin` role; `INTERNAL_STAFF_CATEGORIES` not enforced |
| R4 | **Medium** | Duplicate admin endpoints on `profile` router | `profile.listAllUsers`, `updateUserRole`, `deleteUser` |
| R5 | **Medium** | Console-only audit — no durable trail | `opsLog` → stdout; no `audit_events` table |
| R6 | **Medium** | Subscription create/update unaudited | Admin commercial state changes without operator log |
| R7 | **Medium** | `sendBulkNotification` — any admin, all users, no audit | `routers.ts` ~1265 |
| R8 | **Medium** | Admin password reset unaudited | `resetSubscriberPassword` |
| R9 | **Low** | `adminProcedure` unused — inconsistent enforcement pattern | Manual `assertAdminAccess` per handler |
| R10 | **Low** | Legacy redirect paths unauthenticated | Brief hop before gated destination |
| R11 | **Low** | `staffCategory` not persisted | `createInternalUser` logs category but no DB column |
| R12 | **Low** | Plan/pricing changes via seed script only | No runtime API; operational out-of-band risk |

---

## Missing Controls

| Control | Current state | Target for Security Center |
|---------|---------------|------------------------------|
| **Tiered platform roles** | Binary `admin` only | e.g. Platform Owner, Platform Admin, Support (design TBD) |
| **Persisted audit log** | Console `opsLog` only | `audit_events` table or mandatory log shipper |
| **Role change audit** | Missing | `user_role_changed` with before/after |
| **Subscriber create audit** | Missing | Operator + created user metadata |
| **Subscription mutation audit** | Delete only | Create/update with before/after snapshots |
| **Password reset audit** | Missing | Admin-initiated credential changes |
| **Notification audit** | Missing | Bulk/custom send with actor + recipient scope |
| **Plan admin API** | None | If needed — audited CRUD with approval workflow |
| **Scoped admin** | Full cross-tenant | Optional read-only / support-scoped roles |
| **Security Center UI** | Placeholder `/admin/security` | Dedicated governance console (registry exists) |
| **API deduplication** | `profile` mirrors `admin` | Deprecate or gate duplicate endpoints |
| **Mandatory `adminProcedure`** | Unused middleware | Reduce forgotten-check risk on new endpoints |

---

## Recommended Execution Plan

Phased plan for **ADMIN-SECURITY-CENTER** implementation (post-audit). No code in this phase.

### Phase 0 — Preconditions (complete)

- [x] `ADMIN-RTL-WORKSPACE` complete — admin shell uses Workspace-First geometry
- [x] Security domain asset registry (`securityDomain.ts`)
- [x] Platform account protection (ADMIN-AUTH-1D) in server + client UI embed

### Phase 1 — Audit hardening (server, minimal UX)

**Goal:** Close highest-risk gaps without redesign.

| Item | Action |
|------|--------|
| A1 | Add `OPS_EVENT.user_role_changed` + emit from `admin.updateUserRole` / `profile.updateUserRole` with `previousRole`/`nextRole` |
| A2 | Add audit for `createSubscriberAccount`, `resetSubscriberPassword`, `createUserSubscriptionByAdmin`, `updateUserSubscriptionByAdmin` |
| A3 | Add audit for `restaurant.create` when caller is admin |
| A4 | Deprecate or remove `profile.listAllUsers`, `profile.updateUserRole`, `profile.deleteUser` |
| A5 | Document / validate `OWNER_OPEN_ID` in deployment checklist |

**Exit:** All governance mutations in Phase 1 Review matrix emit ops events with actor.

### Phase 2 — Security Center UI (MVP)

**Goal:** Dedicated `/admin/security` surface (currently placeholder).

| Item | Action |
|------|--------|
| B1 | Security Center home — governance summary, protected account status, recent audit feed (if persisted) |
| B2 | Move or mirror Operations governance sections per `securityDomain.ts` registry |
| B3 | Role management table with platform/self guards (reuse `SecurityRolesSection` patterns) |
| B4 | Internal user creation flow (`SecurityAccountControlsSection`) |
| B5 | Read-only audit viewer (opsLog shipper integration or DB table from Phase 3) |

**Exit:** `/admin/security` replaces placeholder; operators can perform governance without Operations tab alone.

### Phase 3 — Persisted audit store

**Goal:** Durable, queryable audit trail.

| Item | Action |
|------|--------|
| C1 | `audit_events` table — `actorId`, `action`, `targetType`, `targetId`, `before`, `after`, `correlationId`, `procedure` |
| C2 | Dual-write: `opsLog` + DB insert for ADMIN-category mutations |
| C3 | Security Center audit explorer with filters (actor, action, date range) |
| C4 | Retention policy documentation |

**Exit:** Compliance-grade operator audit without relying on stdout alone.

### Phase 4 — Role model evolution (optional, design gate)

**Goal:** Reduce flat-admin risk if product requires it.

| Item | Action |
|------|--------|
| D1 | Design doc for platform role tiers (Owner / Admin / Support) |
| D2 | Schema migration for `platformRole` or permission bitmap |
| D3 | Middleware mapping — `adminProcedure` + scoped checks |
| D4 | Migrate `INTERNAL_STAFF_CATEGORIES` to persisted field if authorization-relevant |

**Exit:** Least-privilege admin model; gated by product decision.

### Phase 5 — Sensitive ops completion

| Item | Action |
|------|--------|
| E1 | Notification send audit (`sendBulkNotification`, `sendCustomNotification`) |
| E2 | Commercial export audit |
| E3 | Invoice generation audit |
| E4 | Plan/pricing governance — either formalize seed-script ops runbook or add audited admin API |

---

## Appendix A — Key file index

| Concern | Path |
|---------|------|
| User schema | `drizzle/schema.ts` |
| Account classification | `shared/accountClassification.ts` |
| Platform protection | `server/platformAccount.ts`, `shared/platformAccount.ts` |
| Cascade guards | `server/db/cascadeDeletes.ts` |
| Admin access | `server/_core/assertAdminAccess.ts` |
| tRPC procedures | `server/_core/trpc.ts`, `server/routers.ts` |
| Admin dashboard API | `server/commercial/adminDashboardRouter.ts` |
| Tenant access | `server/restaurantAccess.ts` |
| Ops taxonomy | `server/_core/opsTaxonomy.ts` |
| Classification audit | `server/accountClassificationAudit.ts` |
| Client security registry | `client/src/lib/admin/domains/security/securityDomain.ts` |
| Client governance guards | `client/src/components/admin/domains/security/securityGovernance.ts` |
| Admin routes | `client/src/App.tsx`, `client/src/lib/admin/routes/adminRoutes.ts` |
| Auth gate | `client/src/_core/hooks/useAuthGate.ts` |

## Appendix B — Test coverage (protection & auth)

| File | Scope |
|------|-------|
| `server/platformAccount.test.ts` | openId detection |
| `server/db/cascadeDeletes.test.ts` | Protected user assert helpers |
| `server/admin-auth-1d.test.ts` | Delete/role/classification tRPC enforcement |
| `server/admin-auth-1e.test.ts` | Subscription + invoice guards |
| `server/commercial/adminAuth1c.test.ts` | INTERNAL exclusion from commercial population |

---

## Verdict

The codebase provides a **solid server-side foundation** for platform governance (admin gate, platform owner protection, cascade delete audit, classification audit). The **ADMIN-SECURITY-CENTER program** should prioritize:

1. **Audit completeness** for role and subscription mutations (highest risk, lowest effort)
2. **Dedicated Security Center UI** at `/admin/security` (registry and embeds already exist)
3. **Persisted audit store** (opsLog alone is insufficient for operator accountability)
4. **Flat-admin model review** (product decision — not a bug, but a control gap)

This audit is **read-only**. No schemas, permissions, or routes were modified.

---

*Discovery complete. Ready for ADMIN-SECURITY-CENTER planning.*
