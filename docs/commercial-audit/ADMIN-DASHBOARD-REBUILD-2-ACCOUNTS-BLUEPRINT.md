# ADMIN-DASHBOARD-REBUILD-2 — Accounts Domain Blueprint

**Program:** Admin Dashboard Rebuild  
**Phase:** REBUILD-2 — Operations Decomposition  
**Date:** 2026-06-09  
**Status:** Complete  

**Scope:** Design the future Accounts experience. **No implementation.** No auth/classification/OWNER_OPEN_ID changes.

---

## 1. Domain Purpose

**Accounts** answers: *Who are the people on this platform, what type of account are they, and what safe actions can operators perform?*

Accounts is **not** the subscription system of record (Commercial). It is the **identity and governance** surface.

---

## 2. Account Segmentation (2D)

### 2.1 Three operator-facing segments

```text
┌─────────────────────────────────────────────────────────────┐
│  ACCOUNTS                                                    │
├─────────────────────────────────────────────────────────────┤
│  [ Commercial ]  [ Internal ]  [ Protected ]  [ All ]        │
└─────────────────────────────────────────────────────────────┘
```

| Segment | Filter rule | Default? |
|---------|-------------|----------|
| **Commercial Accounts** | `accountClassification === "COMMERCIAL"` | ✅ Default landing tab |
| **Internal Accounts** | `accountClassification === "INTERNAL"` | |
| **Protected Platform** | `isProtectedPlatformAccount === true` | Single row profile, not mixed into bulk actions |
| **All** | No classification filter | Audit / support use |

**SYSTEM classification:** Shown under Internal tab with visual distinction; no admin role allowed (1A).

### 2.2 Internal sub-segments (staff category)

| Sub-segment | Filter | UI label |
|-------------|--------|----------|
| Support | `staffCategory === "support"` | Support |
| Sales | `staffCategory === "sales"` | Sales |
| Operations | `staffCategory === "operations"` | Operations |
| **Marketing** | `staffCategory === "marketing"` | Marketing |

Staff category is **only set at create** today — blueprint adds **column on Internal tab** (requires read exposure on `getOwnerOverviewList` or detail API; no classification logic change).

### 2.3 Platform account (protected)

| Attribute | Value |
|-----------|-------|
| Detection | `isProtectedPlatformAccount` from API (OWNER_OPEN_ID) |
| Classification | Typically `INTERNAL` |
| UI treatment | Dedicated **Protected** tab OR pinned row at top of Internal with “Platform” badge |
| Mutations | None — 1D/1E enforced server-side |
| Display | Email, role, createdAt, linked restaurants — read-only |

**Do not** use hardcoded user IDs. **Do not** use role-based hiding alone.

---

## 3. Default Views

### 3.1 `/admin/accounts` — Commercial tab (default)

**Operator:** Customer ops, billing support.

| Column | Source | Sortable |
|--------|--------|----------|
| Name | `owner.name` | ✅ |
| Email | `owner.email` | ✅ |
| Role | `owner.role` | ✅ |
| Plan | `commercial.planCode` | ✅ |
| Status | `ownerSubscriptionStatus(commercial)` | ✅ |
| Restaurants | Joined count | ✅ |
| End date | `commercial.currentPeriodEnd` | ✅ |

**Row actions (commercial, non-protected):**

| Action | Location | Notes |
|--------|----------|-------|
| View detail | Primary | → `/admin/accounts/:ownerId` |
| Edit role | Detail or overflow | Hidden if protected |
| Edit classification | Detail | Hidden if protected |
| Manage subscription | Detail → Commercial panel | Not inline on directory |
| Send notification | Link to Communications with `?userId=` | Or overflow |
| Delete | Detail danger zone | Hidden if protected / self |

### 3.2 `/admin/accounts/internal` (or Internal tab)

**Operator:** HR / internal IT.

| Column | Extra vs Commercial |
|--------|---------------------|
| Staff category | `staffCategory` (new column) |
| Plan / billing | Hidden or “N/A” |
| Subscription actions | Hidden by default |

**Primary CTA:** `Add internal user` → `createInternalUser` dialog.

**Filters:** Staff category, role (admin/user).

### 3.3 `/admin/accounts/protected` (or Protected tab)

**Single-account view** — not a searchable directory of many rows.

```text
┌──────────────────────────────────────────┐
│  Platform Account                    🔒   │
│  k.sh61@yahoo.com                        │
│  Role: admin · INTERNAL · Protected      │
├──────────────────────────────────────────┤
│  Linked restaurants (read-only list)     │
│  Commercial state: excluded from CRS     │
│  No mutation actions                     │
└──────────────────────────────────────────┘
```

Route alias: `/admin/accounts/protected` redirects to `/admin/accounts/:platformOwnerId` with read-only layout.

---

## 4. Filters & Search

| Filter | Applies to | Implementation |
|--------|------------|----------------|
| Text search | All tabs | Name, email (client-side today; server param future) |
| Classification | All tab only | `getOwnerOverviewList.classificationFilter` |
| Staff category | Internal tab | Client filter until API extends |
| Role | All | `admin` / `user` |
| Subscription status | Commercial tab | Client filter on `commercial.subscriptionStatus` |
| Has restaurants | Commercial | `restaurants.length > 0` |

**Default on load:** Commercial tab, no filters, sort by `createdAt` desc.

---

## 5. Account Detail Page (`/admin/accounts/:ownerId`)

### 5.1 Layout

```text
┌─────────────────────────────────────────────────────────────┐
│  [← Accounts]  Name · email          [Platform 🔒] [badges] │
├─────────────────────────────────────────────────────────────┤
│  PROFILE          │  COMMERCIAL PANEL   │  TENANTS          │
│  Role             │  Plan · status      │  Restaurant list  │
│  Classification   │  Billing cycle      │  Links → tenants  │
│  Created          │  Period end         │                   │
│  Staff category   │  [Manage sub]       │                   │
│  (internal only)  │  [Invoice PDF]      │                   │
├─────────────────────────────────────────────────────────────┤
│  ACTIONS (context-aware)                                     │
│  Governance: role · classification · delete                  │
│  Comms: send notification (link)                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Data contract

| Query | Purpose |
|-------|---------|
| `admin.getOwnerOverview({ ownerId })` | Profile + commercial slice |
| `admin.listRestaurants` (filtered) | Linked tenants |
| `isProtectedPlatformAccount` on owner | Action gating |

### 5.3 Action matrix (detail page)

| Action | Commercial | Internal | Protected |
|--------|------------|----------|-----------|
| Edit role | ✅ | ✅ | ❌ |
| Edit classification | ✅ | ✅ | ❌ |
| Delete account | ✅ | ✅ | ❌ |
| Create/edit/delete subscription | ✅ | If entitled | ❌ |
| Invoice PDF | ✅ COMMERCIAL only | ❌ | ❌ |
| Send notification | ✅ | ✅ | ✅ |
| View restaurants | ✅ | ✅ | ✅ |

---

## 6. Account Health Indicators

Read-only signals on directory rows (no new calculations):

| Indicator | Source | Display |
|-----------|--------|---------|
| Subscription status | CRS `ownerSubscriptionStatus` | `CommercialStatusBadge` |
| Expiring soon | `currentPeriodEnd` within 30d | Amber dot + tooltip |
| No subscription | `!isOwnerEntitled` | Muted “No subscription” |
| No restaurants | `restaurants.length === 0` | Gray chip “No venues” |
| Protected | `isProtectedPlatformAccount` | Lock + “Platform” chip |
| Trial | `subscriptionStatus === "trial"` | Badge |

**Not in scope:** Custom health score algorithm (Platform Health center future).

---

## 7. Extraction from `UsersSection`

| Current artifact | Future home |
|------------------|-------------|
| `getOwnerOverviewList` + restaurant join | `AccountsDirectory` |
| Classification filter toolbar | Commercial/Internal/All tabs |
| `renderUserActions` | Detail page + slim directory overflow |
| Internal user dialog | Internal tab CTA |
| Subscription dialogs | `AccountCommercialPanel` on detail |
| Notify per-user | Redirect to Communications |
| `getStatusBadge` hardcoded colors | **Retire** → `CommercialStatusBadge` |
| Mixed mobile/desktop table | Keep responsive pattern in `AccountsDirectory` |

---

## 8. Orphan Route Consolidation

| Orphan | Merge into Accounts |
|--------|---------------------|
| `/users` | `/admin/accounts` — strict superset |
| `/super-admin` | Delete user only — covered by Accounts |

---

## 9. Non-Goals (REBUILD-2)

- Change `accountClassification` enum or rules
- Change `OWNER_OPEN_ID` / `isProtectedPlatformAccount` detection
- Change `createInternalUser` validation
- Add impersonation
- Location architecture

---

## 10. Acceptance Criteria (Accounts)

| Criterion | Measurable |
|-----------|------------|
| Commercial is default view | Tab order + landing redirect |
| Platform account visually distinct | Badge on directory + dedicated detail mode |
| Subscription mutations not on directory rows | Only on detail Commercial panel |
| Internal create only on Internal tab | CTA not shown on Commercial default |
| All actions respect 1D/1E | Same guards as today `renderUserActions` |

**Companion:** [Tenants Blueprint](./ADMIN-DASHBOARD-REBUILD-2-TENANTS-BLUEPRINT.md)
