# ADMIN-DASHBOARD-REBUILD-2 — Operations Extraction Plan

**Program:** Admin Dashboard Rebuild  
**Phase:** REBUILD-2 — Operations Decomposition  
**Date:** 2026-06-09  
**Status:** Complete  

**Goal:** Transform `/admin/operations` from **entire platform** into **coordination surface** (or retire it).

**Source file:** `client/src/pages/AdminManagement.tsx`

---

## 1. Extraction Summary

| Action | Count | Sections |
|--------|-------|----------|
| **Move** | 8 | Restaurants, Users directory, dialogs (split destinations) |
| **Split** | 4 | UsersSection, create restaurant flow, subscription actions, KPI block |
| **Merge** | 2 | Duplicate add-restaurant CTAs; orphan `/users` into Accounts |
| **Retire** | 3 | KPI strip, monolith route (eventually), hardcoded status badges |
| **Keep Temporarily** | 2 | `/admin/operations` tabbed interim; edit→owner dashboard navigation |

---

## 2. Section-by-Section Extraction (2C)

### 2.1 `AdminKPISection` + `getDashboardSummary`

| Attribute | Value |
|-----------|-------|
| **Current** | Lines ~1199–1218, duplicate of `/admin` home |
| **Action** | **Retire** |
| **Destination** | None — `/admin` home is sole executive KPI surface |
| **Migration** | Remove query + component from `AdminManagement` in REBUILD-3 |
| **Risk** | Low — home already shows same KPIs |

### 2.2 Restaurants section (directory + filters + cards)

| Attribute | Value |
|-----------|-------|
| **Current** | Lines ~1221–1416 |
| **Action** | **Move** |
| **Destination** | `/admin/tenants` — `AdminTenantsPage` |
| **Extract** | `listRestaurants`, search, status filter, card list, delete flow |
| **Keep linked** | `ownerCommercial` read display on cards |
| **Component split** | `RestaurantsSection.tsx` (new) |

### 2.3 Create restaurant dialog + `handleCreateRestaurant`

| Attribute | Value |
|-----------|-------|
| **Current** | Lines ~1426–1617, header CTA ~1187–1196 |
| **Action** | **Split** |
| **Destination** | `/admin/tenants/new` wizard |
| **Split points** | |
| | **Step 1 (Tenants):** venue fields, country, currency |
| | **Step 2 (Accounts, optional):** `createSubscriberAccount` |
| | **Step 3 (Tenants):** `restaurant.create` with `ownerUserId` |
| **Merge** | Single header CTA on tenants page (remove duplicate empty-state CTA) |

### 2.4 Delete restaurant `AlertDialog`

| Attribute | Value |
|-----------|-------|
| **Action** | **Move** with Restaurants section |
| **Destination** | `/admin/tenants` |

### 2.5 Restaurant edit (navigate to owner dashboard)

| Attribute | Value |
|-----------|-------|
| **Action** | **Keep Temporarily** |
| **Destination** | `/admin/tenants/:restaurantId` in REBUILD-3b |
| **Interim** | Retain `setLocation(/dashboard?restaurant=)` until admin tenant detail ships |
| **Retire when** | Admin tenant detail provides in-shell editing |

### 2.6 `UsersSection` — directory + table

| Attribute | Value |
|-----------|-------|
| **Current** | Lines 63–696 (table), 457–508 (toolbar) |
| **Action** | **Move** |
| **Destination** | `/admin/accounts` — `AdminAccountsPage` |
| **Extract** | `getOwnerOverviewList`, search, classification filter, table/card layouts |
| **Component split** | `AccountsDirectory.tsx` (new) |

### 2.7 `UsersSection` — `renderUserActions` (role, classification, delete)

| Attribute | Value |
|-----------|-------|
| **Action** | **Move** |
| **Destination** | `/admin/accounts` row actions → migrate to `/admin/accounts/:ownerId` detail in REBUILD-3b |
| **Interim** | Keep inline edit on directory until detail page ships |
| **Protection** | Preserve `isProtectedPlatformAccountUser` guards (1D/1E) |

### 2.8 Subscription dialogs + mutations

| Attribute | Value |
|-----------|-------|
| **Current** | Lines 173–195, 254–291, 788–836, 944–963 |
| **Action** | **Split** from Accounts directory |
| **Destination** | **Commercial panel** on `/admin/accounts/:ownerId` |
| **Rationale** | Subscription mutations are commercial domain; directory shows read-only status + “Manage subscription” link |
| **Components** | Reuse `SubscriptionAdminFormFields` |

### 2.9 Invoice PDF action

| Attribute | Value |
|-----------|-------|
| **Action** | **Move** |
| **Destination** | Account detail → Commercial panel |
| **Policy** | COMMERCIAL accounts only (per ADMIN-AUTH-1E invoice review) |

### 2.10 Internal user dialog

| Attribute | Value |
|-----------|-------|
| **Current** | Lines 701–786, toolbar CTA 488–496 |
| **Action** | **Move** |
| **Destination** | `/admin/accounts/internal` or Accounts page “Internal” tab primary CTA |
| **API** | `createInternalUser` unchanged |

### 2.11 Notification dialogs (per-user + bulk)

| Attribute | Value |
|-----------|-------|
| **Current** | Lines 860–941, toolbar bulk CTA 497–505, per-row notify |
| **Action** | **Move** |
| **Destination** | `/admin/communications` |
| **Enhancement** | Add classification/role audience filter on bulk (REBUILD-3) |
| **Remove from** | Accounts row actions after migration |

### 2.12 `UsersSection` restaurant count join

| Attribute | Value |
|-----------|-------|
| **Action** | **Move** with Accounts |
| **Future** | Link count → `/admin/tenants?ownerId=` filter |

---

## 3. File Decomposition Plan

### 3.1 Current monolith

```text
AdminManagement.tsx (~1,650 lines)
```

### 3.2 Target module structure (REBUILD-3)

```text
client/src/pages/admin/
├── operations/
│   ├── OperationsHub.tsx          ← optional coordination (or delete)
│   └── index.ts
├── accounts/
│   ├── AdminAccountsPage.tsx
│   ├── AdminAccountDetailPage.tsx
│   ├── AccountsDirectory.tsx
│   ├── AccountCommercialPanel.tsx
│   ├── InternalUserCreateDialog.tsx
│   └── index.ts
├── tenants/
│   ├── AdminTenantsPage.tsx
│   ├── AdminTenantDetailPage.tsx
│   ├── TenantCreateWizard.tsx
│   ├── RestaurantsDirectory.tsx
│   └── index.ts
└── communications/
    ├── AdminCommunicationsPage.tsx
    ├── NotifyUserDialog.tsx
    ├── BulkNotifyDialog.tsx
    └── index.ts
```

### 3.3 Shared extraction (no duplication)

| Shared module | Used by |
|---------------|---------|
| `@/components/admin/operations/*` | All domain pages |
| `@/components/admin/subscription/*` | Account commercial panel |
| `@/lib/admin/ownerCommercialDisplay` | Accounts + Tenants read columns |
| `@shared/platformAccount` | Accounts protection UI |

---

## 4. Migration Phases

### Phase REBUILD-3a — Tab decomposition (low risk)

| Step | Work | Route impact |
|------|------|--------------|
| 1 | Extract `RestaurantsSection` + `UsersSection` + `CommunicationsPanel` as child components | None — still `/admin/operations` |
| 2 | Add tab bar: Tenants \| Accounts \| Communications | None |
| 3 | Remove `AdminKPISection` from operations | None |
| 4 | Update `adminNavigation.ts` — promote Operations, remove “legacy” label | Nav only |

**Operator outcome:** Same URL, clearer mental model.

### Phase REBUILD-3b — Route cutover

| Step | Work | Route impact |
|------|------|--------------|
| 5 | Register `/admin/tenants`, `/admin/accounts`, `/admin/communications` | New routes |
| 6 | Move tab content to dedicated pages | Pages live |
| 7 | Replace `/admin/tenants` placeholder with live tenants page | Placeholder resolved |
| 8 | `/admin/operations` → redirect `/admin/accounts` | Shim |

### Phase REBUILD-3c — Detail pages

| Step | Work |
|------|------|
| 9 | Ship `/admin/accounts/:ownerId` with `getOwnerOverview` |
| 10 | Ship `/admin/tenants/:restaurantId` admin detail |
| 11 | Move subscription + invoice actions to account detail |
| 12 | Move inline role/classification edit to detail (optional simplify directory) |

### Phase REBUILD-3d — Cleanup

| Step | Work |
|------|------|
| 13 | Redirect `/users`, `/super-admin` |
| 14 | Delete or hollow `AdminManagement.tsx` |
| 15 | Remove `ADMIN_LEGACY_NAV` |
| 16 | Replace `getStatusBadge` with `CommercialStatusBadge` |

---

## 5. Coordination Surface Definition

After extraction, **Operations** is **not** a fourth domain. It is an optional **hub**:

```text
/admin/operations  (optional future)
├── Quick actions
│   ├── Provision tenant (wizard entry)
│   ├── Add internal user
│   └── Send announcement
├── Cross-domain search (future)
└── Links to Accounts · Tenants · Communications
```

**Recommendation:** Skip dedicated hub — use `/admin` home quick actions (REBUILD-1 blueprint). **Retire `/admin/operations` route** after 3b unless operators request a hub.

---

## 6. What Survives from Operations

| Survives | Where | Form |
|----------|-------|------|
| Restaurant CRUD | `/admin/tenants` | Directory + wizard + detail |
| User directory + account mutations | `/admin/accounts` | Tabs + detail |
| Subscription mutations | Account detail Commercial panel | Dialogs |
| Notifications | `/admin/communications` | Dialogs + future campaigns |
| Internal user create | `/admin/accounts/internal` | Dialog |
| Platform protection UX | Accounts directory + detail | Badges + hidden actions |
| Cross-domain reads | Tenants ↔ Accounts | Links, not merged tables |

| Does not survive | Reason |
|------------------|--------|
| KPI strip on operations | Duplicate of home |
| Monolithic scroll layout | Replaced by domain pages |
| Mixed classification table as sole UX | Split by default tab |
| “Legacy operations” nav group | Stigma removed |

---

## 7. Risk Register

| Risk | Mitigation |
|------|------------|
| Broken bookmarks to `/admin/operations` | 302 redirect to `/admin/accounts` |
| Subscription ops harder to find | “Manage subscription” on account detail; customer-success queue later |
| Create restaurant loses one-step flow | Wizard preserves optional account step |
| Increased navigation depth | Detail drawers optional for P1 |
| Test coverage gaps | Reuse existing `admin-auth-*` server tests; add route smoke tests in REBUILD-3 |

---

## 8. Completion Condition

REBUILD-2 extraction plan is **unambiguous** when:

1. Every monolith section has **Move | Split | Merge | Retire | Keep Temporarily**.
2. Target files and routes are named.
3. Migration phases are ordered with route impact.
4. Operations is defined as **coordination optional**, not platform container.

**Next phase:** REBUILD-3 implements Phase 3a–3d.
