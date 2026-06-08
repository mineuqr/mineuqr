# ADMIN DASHBOARD AUDIT — ADA-2 — Role Architecture Audit

**Program:** Admin Dashboard Audit (ADA)  
**Phase:** ADA-2 — Role architecture audit  
**Date:** 2026-06-08  
**Status:** Complete — read-only documentation  

**Mode:** Audit only. No code, schema, database, migration, cleanup, or rebuild.

**Upstream:** `ADMIN-DASHBOARD-AUDIT-ADA-0.md`, `ADMIN-DASHBOARD-AUDIT-ADA-1.md`

---

## 1. Executive Summary

### 1.1 Who is allowed to do what?

MineuQR implements a **two-role** platform model stored on `users.role`:

| Role | Meaning in code |
|------|-----------------|
| **`admin`** | Platform operator — full access to `admin.*` procedures and **all restaurants** via `assertRestaurantAccess` admin bypass |
| **`user`** | Default account — restaurant tenant owner when they own `restaurants` rows; **no** platform admin API access |

There is **no** separate `superAdmin`, `restaurantAdmin`, `employee`, or `platformOwner` role in the schema.

### 1.2 Can a restaurant user become a platform role?

**Yes — by explicit admin promotion.**

Any authenticated `admin` can call `admin.updateUserRole` / `profile.updateUserRole` and assign `role: "admin"` to another user (including restaurant owners). There is **no** self-service escalation path; registration always inserts `role: "user"`.

The reported historical behavior — *a restaurant user promoted to `admin` gained platform administration visibility* — is **consistent with the implemented role model**, not a session bug. Promotion grants:

- Platform dashboard access (`/admin`, `/statistics`, MRR, user management)
- `assertAdminAccess` on all `admin.*` mutations
- Commercial entitlements `plan: ADMIN` (separate from subscription rows)
- Cross-tenant restaurant access on all `assertRestaurantAccess` paths

### 1.3 Platform vs restaurant isolation

**Not hard-isolated.** The `admin` role is a **superset** that spans platform governance and any restaurant operation. Restaurant authority for `user` role is **tenant-scoped** (owner of `restaurants.userId` only).

### 1.4 Protected accounts

User `1` is in `PROTECTED_USER_IDS` — delete, role demotion, and password reset blocked **server-side** (not UI-only).

### 1.5 Super Admin model

**Not explicitly modeled.** `/super-admin` is an alternate UI with the **same** `role === "admin"` requirement as `/admin`.

### 1.6 Authority drift connection

Role architecture **contributes to dashboard drift perception** when a promoted restaurant user becomes `admin`: they immediately see platform metrics (S6) and commercial admin tools while their **subscription entitlements** still follow ASN rules (`plan: ADMIN` bypass, not scoped subscription truth). Role escalation does not fix commercial authority fragmentation documented in ADA-0/ADA-1.

### 1.7 Output classification

## **YELLOW**

Bounded overlap — backend admin routes are **enforced**; no evidence of non-admin mutation access. However:

- Platform and restaurant authorities **merge** under `admin` role
- Restaurant → platform escalation is **intentional but unbounded** (single promotion step)
- No Super Admin / Platform Owner distinction
- Frontend route guards are **UI-only** (backend compensates)

Not **GREEN** (no hard isolation). Not **RED** (no backend leakage to `role: user` for platform mutations).

---

## 2. ADA-2.1 — Role Inventory

### 2.1 Persisted roles

| Role | Location | Definition |
|------|----------|------------|
| **`user`** | `drizzle/schema.ts` — `users.role` enum | Default account; restaurant owner when owning venues |
| **`admin`** | `drizzle/schema.ts` — `users.role` enum | Platform operator; bypasses tenant boundaries |

**Enum definition:** `mysqlEnum(['user','admin'])` — only two values.

### 2.2 Implicit / conceptual roles (not separate DB roles)

| Concept | How represented | Location |
|---------|-----------------|----------|
| **Restaurant owner** | `users.role = 'user'` + `restaurants.userId` | Tenant ownership chain |
| **Platform owner** | Not distinct — typically protected `admin` user `1` | `PROTECTED_USER_IDS`, operator practice |
| **Super Admin** | **Alias only** — still `users.role = 'admin'` | `SuperAdminDashboard.tsx` |
| **Restaurant admin** | **Not modeled** | — |
| **Employee** | **Not modeled** | — |
| **Commercial ADMIN plan** | Entitlement state, not `users.role` | `resolveCommercialEntitlements` when `role === "admin"` |

### 2.3 Role assignment sources

| Source | Role assigned | File |
|--------|---------------|------|
| Self-service register | `user` | `server/auth-local/registerOwner.ts` |
| Admin create subscriber | `user` | `admin.createSubscriberAccount` |
| Admin role update | `admin` \| `user` | `admin.updateUserRole`, `profile.updateUserRole` |
| OAuth upsert (legacy) | `admin` if `openId === ENV.ownerOpenId` | `server/db.ts` `upsertUser` |
| DB default | `user` | Schema default |

### 2.4 Search terms not found as roles

| Term | Found? |
|------|--------|
| `superAdmin` | Route label only (`/super-admin`) |
| `restaurantAdmin` | **No** |
| `platformAdmin` | **No** |
| `employee` | **No** |
| `owner` | Restaurant ownership (`userId`), not a role enum |

---

## 3. ADA-2.2 — Authentication → Authorization Flow

```text
Login (email/password or register)
  ↓
sdk.createSessionToken(openId) — JWT in HTTP-only cookie (COOKIE_NAME)
  ↓
Each tRPC request → createContext()
  ↓
sdk.authenticateRequest(req)
  ├─ verify JWT (jose jwtVerify)
  ├─ check sessionValidAfter revocation boundary
  └─ db.getUserByOpenId(openId) → SelectUser (includes role)
  ↓
ctx.user on TrpcContext
  ↓
Procedure middleware:
  ├─ publicProcedure — user optional
  ├─ protectedProcedure — require ctx.user
  ├─ verifiedProcedure — require user + email verified (if policy on)
  └─ adminProcedure — defined but UNUSED on routers (admin uses assertAdminAccess instead)
  ↓
Per-procedure guards:
  ├─ assertAdminAccess(ctx) — role === "admin"
  ├─ assertRestaurantAccess(ctx, restaurantId) — owner OR admin
  └─ inline ctx.user.role !== "admin" — subscription/limit bypass for admin
```

| Layer | Implementation |
|-------|----------------|
| **Authentication** | Email/password (`server/auth-local.ts`), register (`registerOwner.ts`); JWT session cookie |
| **Session** | Stateless JWT (`server/_core/sdk.ts`); revocation via `users.sessionValidAfter` |
| **User lookup** | `getUserByOpenId` on each authenticated request |
| **Role resolution** | `users.role` column on `SelectUser` — no external RBAC service |
| **Permission enforcement** | `assertAdminAccess`, `assertRestaurantAccess`, `protectedProcedure`, `verifiedProcedure` |

**Note:** `auth.me` is `publicProcedure` — returns `ctx.user` or `null` (role visible to client for UI gating).

---

## 4. ADA-2.3 — Admin Route Protection Map

### 4.1 Frontend routes

| Route | Component | Frontend guard | Backend dependency |
|-------|-----------|----------------|-------------------|
| `/admin` | `AdminManagement.tsx` | `useAuthGate` → `showAdminDenied` if `role !== admin` | All queries use `adminQueriesEnabled` + `assertAdminAccess` on server |
| `/statistics` | `Statistics.tsx` | Same pattern | `admin.getStatistics`, etc. |
| `/users` | `Users.tsx` | Same pattern | `admin.listAllUsers`, mutations |
| `/super-admin` | `SuperAdminDashboard.tsx` | `showAdminDenied` (same check as admin) | `admin.listAllUsers`, `admin.getExtendedStats` |
| `/commercial/diagnostics` | `CommercialDiagnostics.tsx` | Login + verified | `commercial.getEntitlements` — **not admin-only** |

**Frontend finding:** Routes are **not** protected at `App.tsx` router level — any user can **navigate** to `/admin`. UI shows access denied; **mutations fail** on server without `admin` role.

**Nav visibility:** `LandingNavbar.tsx` shows Admin link only when `user?.role === "admin"`.

### 4.2 Backend `admin.*` procedures (all require `assertAdminAccess`)

| Procedure | Guard | Required role | Frontend + backend |
|-----------|-------|---------------|-------------------|
| `admin.createSubscriberAccount` | `assertAdminAccess` | `admin` | Both |
| `admin.resetSubscriberPassword` | `assertAdminAccess` + `assertProtectedUserPasswordResetAllowed` | `admin` | Both |
| `admin.listAllRestaurantsWithSubscriptions` | `assertAdminAccess` | `admin` | Both |
| `admin.createRestaurantSubscription` | `assertAdminAccess` | `admin` | Both |
| `admin.updateRestaurantSubscription` | `assertAdminAccess` | `admin` | Both |
| `admin.cancelRestaurantSubscription` | `assertAdminAccess` | `admin` | Both |
| `admin.deleteRestaurantSubscription` | `assertAdminAccess` | `admin` | Both |
| `admin.getStatistics` | `assertAdminAccess` | `admin` | Both |
| `admin.getRevenueByMonth` | `assertAdminAccess` | `admin` | Both |
| `admin.getSubscriptionDetails` | `assertAdminAccess` | `admin` | Both |
| `admin.getExtendedStats` | `assertAdminAccess` | `admin` | Both |
| `admin.listAllUsers` | `assertAdminAccess` | `admin` | Both |
| `admin.updateUserRole` | `assertAdminAccess` + protections | `admin` | Both |
| `admin.deleteUser` | `assertAdminAccess` + protections | `admin` | Both |
| `admin.listAllUsersWithSubscriptions` | `assertAdminAccess` | `admin` | Both |
| `admin.createUserSubscriptionByAdmin` | `assertAdminAccess` | `admin` | Both |
| `admin.updateUserSubscriptionByAdmin` | `assertAdminAccess` | `admin` | Both |
| `admin.deleteUserSubscriptionByAdmin` | `assertAdminAccess` | `admin` | Both |
| `admin.sendCustomNotification` | `assertAdminAccess` | `admin` | Both |
| `admin.sendBulkNotification` | `assertAdminAccess` | `admin` | Both |
| `admin.generateInvoicePDF` | `assertAdminAccess` | `admin` | Both |
| `admin.getUserInvoices` | `assertAdminAccess` | `admin` | Server only (not wired in client) |

### 4.3 Duplicate admin surface (`profile.*`)

| Procedure | Guard | Notes |
|-----------|-------|-------|
| `profile.listAllUsers` | `assertAdminAccess` | Duplicate of admin list |
| `profile.updateUserRole` | Same as `admin.updateUserRole` | Duplicate escalation path |
| `profile.deleteUser` | Same as `admin.deleteUser` | Duplicate delete path |

### 4.4 `commercial.*` (not platform-admin gated)

| Procedure | Guard | Required role |
|-----------|-------|---------------|
| `commercial.getEntitlements` | `verifiedProcedure` | Any verified user (owner diagnostics) |

### 4.5 `adminProcedure` middleware

Defined in `server/_core/trpc.ts` but **not used** by `adminRouter` — all admin endpoints use `protectedProcedure` + manual `assertAdminAccess`.

---

## 5. ADA-2.4 — Role Escalation Analysis

### 5.1 Escalation paths

```text
Restaurant User (role: user)
  ↓
Existing admin calls admin.updateUserRole { userId, role: "admin" }
  ↓
updateUserRole() — unrestricted DB update (no audit role transition table)
  ↓
Next auth.me / session → role: admin
  ↓
Platform dashboard visible + all admin.* allowed
```

### 5.2 Questions answered

| # | Question | Answer |
|---|----------|--------|
| 1 | Who can change roles? | Only callers passing `assertAdminAccess` (`admin.*`, `profile.*`) |
| 2 | What roles can be assigned? | `admin` or `user` only (`z.enum(["admin", "user"])`) |
| 3 | Are assignments validated? | Partial — self-target blocked; protected user `1` role change blocked; **no** check that target is "appropriate" for platform admin |
| 4 | Can restaurant-scoped actions modify platform roles? | **No** — tenant mutations use `assertRestaurantAccess` only; role changes are admin-only |

### 5.3 Blocked escalation paths

| Path | Blocked? | Mechanism |
|------|----------|-----------|
| Self-promote to admin | **Yes** | `assertNotSelfAdminTarget` on role update |
| Register as admin | **Yes** | `registerOwner` inserts `role: "user"` |
| Non-admin calls `updateUserRole` | **Yes** | `assertAdminAccess` → FORBIDDEN |
| Demote protected user `1` | **Yes** | `assertProtectedUserRoleModifiable` server-side |
| OAuth auto-admin | **Conditional** | Only `openId === ENV.ownerOpenId` on upsert |

### 5.4 Deliberate escalation (not a leak)

Promoting a restaurant owner to `admin` is **allowed by design** and immediately grants platform authority. This explains historical reports of "gaining platform visibility" after promotion.

---

## 6. ADA-2.5 — Platform Authority Boundary Review

### 6.1 Expected vs actual hierarchy

**Expected (brief):**

```text
Platform Owner / Super Admin
────────────────────────────
Restaurant Owner / Restaurant Admin / Employee
```

**Actual:**

```text
admin (platform + cross-tenant restaurant superset)
────────────────────────────
user (tenant-scoped via restaurants.userId)
```

### 6.2 Permission overlap

| Permission | Platform (`admin` role) | Restaurant (`user` owner) |
|------------|-------------------------|---------------------------|
| View `/admin` dashboard | **Yes** | **No** (UI denied; API blocked) |
| View MRR / platform stats | **Yes** (`admin.getStatistics`) | **No** |
| List all users | **Yes** | **No** |
| Promote/demote roles | **Yes** | **No** |
| Create restaurant for another user | **Yes** (`restaurant.create` admin branch) | **No** (own account only) |
| Edit any restaurant | **Yes** (`assertRestaurantAccess` admin bypass) | **Own only** |
| Delete any restaurant | **Yes** | **Own only** |
| Manage subscriptions (platform tools) | **Yes** (`admin.*` subscription APIs) | **No** |
| Owner dashboard `/dashboard` | **Yes** (admin is also a user) | **Yes** |
| Guest ordering / menu ops | **Yes** (any owned or all if admin) | **Own venues** |
| Premium template/colors bypass | **Yes** (`role !== admin` check skipped) | Subscription-gated |
| Category/menu quota bypass | **Yes** (admin skips `assert*CreateAllowed`) | Plan limits enforced |

### 6.3 Ambiguity sources

| Issue | Evidence |
|-------|----------|
| **Single `admin` role** conflates platform operator and promoted restaurant users | No tier below platform admin |
| **`assertRestaurantAccess` admin bypass** | Admin can act on any `restaurantId` |
| **Commercial `plan: ADMIN`** | Entitlement bypass parallel to platform `role: admin` |
| **Super Admin route** | Same guard as Admin — naming implies tier that does not exist |

---

## 7. ADA-2.6 — Protected Account Review

### 7.1 Mechanism

| Constant | Value | Location |
|----------|-------|----------|
| `PROTECTED_USER_IDS` | `[1]` | `shared/const.ts` |

### 7.2 Enforcement points

| Action | Protected? | Layer |
|--------|------------|-------|
| Delete user `1` | **Blocked** | Server — `deleteUserCascade` → `ProtectedUserDeleteError` |
| Demote user `1` (`user` role) | **Blocked** | Server — `assertProtectedUserRoleModifiable` |
| Reset password for user `1` | **Blocked** | Server — `assertProtectedUserPasswordResetAllowed` |
| Hide delete button for user `1` | UI | `isProtectedUserId` in AdminManagement, Users, SuperAdmin |
| Self-delete admin | **Blocked** | `assertNotSelfAdminTarget` |

### 7.3 Questions answered

| # | Question | Answer |
|---|----------|--------|
| 1 | Can admin account be deleted? | **Not user `1`** — server enforced; other admins could be deleted by another admin |
| 2 | Can admin role be removed? | **Not user `1`** — server enforced |
| 3 | Can ownership be reassigned? | **No dedicated API** — restaurants have `userId`; admin can create restaurants for other users but no "transfer platform ownership" flow |
| 4 | Frontend-only protection? | **No** — cascade and mutation guards are server-side |

---

## 8. ADA-2.7 — Super Admin Model Assessment

| Model | Status |
|-------|--------|
| **Explicit Super Admin role** | **Absent** — no DB enum, no distinct permission set |
| **Admin only** | **Active** — single `admin` role gates all platform procedures |
| **Mixed** | **Yes** — `/super-admin` UI + `/admin` UI both require `role === admin`; identical `AdminAccessDenied` / `SuperAdminAccessDenied` messaging |

**`/super-admin` capabilities vs `/admin`:**

| Feature | `/super-admin` | `/admin` |
|---------|----------------|----------|
| User list + delete | Yes | Yes (richer Users section) |
| Entity count cards | `getExtendedStats` | KPI + restaurants + users |
| MRR / subscriptions | **No** | **Yes** |
| Restaurant management | **No** | **Yes** |

Super Admin is a **subset UI**, not a higher authority tier.

---

## 9. ADA-2.8 — Authority Leakage Register

| ID | Finding | Severity | Evidence |
|----|---------|----------|----------|
| **AL-01** | Restaurant user **can** become platform admin via `updateUserRole` | **Medium** (by design) | `admin.updateUserRole` — no "platform invite" separation |
| **AL-02** | Promoted user immediately sees MRR, all users, subscription admin | **Medium** | Expected after AL-01; matches historical report |
| **AL-03** | `admin` role bypasses **all** restaurant tenant boundaries | **Medium** | `assertRestaurantAccess` L24 |
| **AL-04** | Frontend admin routes lack router-level auth guard | **Low** | `App.tsx` — URL navigable; server blocks API |
| **AL-05** | `adminProcedure` middleware unused — inconsistent pattern | **Low** | Manual `assertAdminAccess` per handler (still enforced) |
| **AL-06** | Duplicate escalation via `profile.updateUserRole` | **Low** | Same guards as `admin.updateUserRole` |
| **AL-07** | Non-admin **cannot** invoke `admin.*` mutations | **None** | `assertAdminAccess` tested pattern |
| **AL-08** | `commercial.getEntitlements` exposed to any verified user | **Info** | Owner diagnostics — not platform metrics |
| **AL-09** | Commercial authority drift independent of role promotion | **Medium** | ADA-0/ADA-1 — S1–S6 coexist; promotion does not unify commercial reads |

**No evidence** of `role: user` successfully invoking platform admin mutations without promotion.

---

## 10. ADA-2.9 — Boundary Matrix

Legend: **Y** = allowed, **N** = not allowed, **Y\*** = allowed via `admin` cross-tenant bypass, **—** = not modeled

| Action | Platform Owner (protected admin `1`) | Admin (`role: admin`) | Restaurant Owner (`user` + venues) | Restaurant Admin | Employee |
|--------|--------------------------------------|----------------------|-----------------------------------|------------------|----------|
| View Admin Dashboard | **Y** | **Y** | **N** | **—** | **—** |
| View MRR / platform analytics | **Y** | **Y** | **N** | **—** | **—** |
| Edit subscription (platform admin APIs) | **Y** | **Y** | **N** | **—** | **—** |
| Delete user | **Y** (except protected/self) | **Y** | **N** | **—** | **—** |
| Delete restaurant | **Y\*** | **Y\*** | **Y** (own) | **—** | **—** |
| Manage plan catalog (CRUD) | **N** (read catalog only) | **N** | **N** | **—** | **—** |
| Promote user to admin | **Y** | **Y** | **N** | **—** | **—** |
| Owner dashboard `/dashboard` | **Y** | **Y** | **Y** | **—** | **—** |
| Manage own menu/orders | **Y\*** | **Y\*** | **Y** | **—** | **—** |

*Restaurant Admin and Employee columns are empty because those roles do not exist.*

---

## 11. Success Criteria Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | What roles exist? | **`user`, `admin`** only (+ implicit restaurant owner) |
| 2 | Which role controls platform governance? | **`admin`** |
| 3 | Can restaurant users gain platform authority? | **Yes** — via admin promotion (`updateUserRole`) |
| 4 | Are admin routes backend protected? | **Yes** — `assertAdminAccess` on all `admin.*` / duplicate `profile.*` admin ops |
| 5 | Are protected accounts actually protected? | **Yes** — server-side for user `1` |
| 6 | Is Super Admin explicitly modeled? | **No** — route label only |
| 7 | Are platform and restaurant authorities isolated? | **No** — `admin` is superset; `user` is tenant-scoped |
| 8 | Does role architecture contribute to dashboard drift? | **Partially** — promotion exposes S6 platform metrics; commercial S1–S6 fragmentation remains (ADA-1) |

---

## 12. Deliverables Checklist

| # | Deliverable | Section |
|---|-------------|---------|
| 1 | Role Inventory | §2 |
| 2 | Auth → Authorization Flow | §3 |
| 3 | Admin Route Protection Map | §4 |
| 4 | Role Escalation Analysis | §5 |
| 5 | Platform Authority Boundary Review | §6 |
| 6 | Protected Account Review | §7 |
| 7 | Super Admin Model Assessment | §8 |
| 8 | Authority Leakage Register | §9 |
| 9 | Boundary Matrix | §10 |
| 10 | Executive Summary | §1 |

---

## 13. Related documents

| Document | Relationship |
|----------|--------------|
| `ADMIN-DASHBOARD-AUDIT-ADA-1.md` | Commercial authority mapping per screen |
| `DATA-INTEGRITY-1-AUDIT.md` Phase E1 | User `1` protected admin on launch DB |
| `ASN-FINAL-EXECUTIVE-REPORT.md` | Commercial authority model |

---

*End of ADA-2. Role architecture audit. Read-only. No remediation.*
