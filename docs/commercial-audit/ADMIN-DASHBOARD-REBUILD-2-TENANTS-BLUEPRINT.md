# ADMIN-DASHBOARD-REBUILD-2 — Tenants Domain Blueprint

**Program:** Admin Dashboard Rebuild  
**Phase:** REBUILD-2 — Operations Decomposition  
**Date:** 2026-06-09  
**Status:** Complete  

**Scope:** Design `/admin/tenants` as a first-class domain. **No location architecture.** **No visual redesign.**

---

## 1. Domain Purpose

**Tenants** answers: *Which restaurants exist, who owns them, and what is their operational and inherited commercial state?*

A **tenant** in MineuQR today is a **restaurant row** (`restaurants` table) with an **owning user** (`userId`). Multi-restaurant owners are modeled as multiple tenant rows sharing one account.

**Terminology:**

| Term | Maps to |
|------|---------|
| Tenant | Restaurant venue |
| Ownership | `restaurant.userId` → account |
| Tenant state | `restaurant.isActive` + venue metadata |
| Commercial state | Owner’s CRS slice (`ownerCommercial`) — **read only** on tenant surfaces |

---

## 2. Route Structure

```text
/admin/tenants                    Restaurant directory (default)
/admin/tenants/new                Create wizard
/admin/tenants/:restaurantId      Tenant detail (admin context)
```

**Query params (directory filters):**

```text
/admin/tenants?ownerId=123         Restaurants for one account
/admin/tenants?status=active       Subscription-derived status filter
/admin/tenants?q=search            Text search
```

---

## 3. Restaurant Directory (default view)

### 3.1 Extracted from operations

Source: `AdminManagement.tsx` restaurants block (lines ~1221–1416).

### 3.2 Toolbar

| Control | Behavior |
|---------|----------|
| Search | Name (ar/en), owner name, owner email, phone |
| Status filter | `all \| active \| trial \| expired \| canceled \| inactive` via `ownerSubscriptionStatus` |
| Owner filter | `?ownerId=` from Accounts deep link |
| Primary CTA | **Add restaurant** → `/admin/tenants/new` |

### 3.3 Directory columns (desktop table — future)

| Column | Source |
|--------|--------|
| Restaurant | `nameAr`, `nameEn` |
| Owner | `ownerName`, `ownerEmail` (link → `/admin/accounts/:userId`) |
| Status | `ownerCommercial` → `CommercialStatusBadge` |
| Plan | `ownerPlanLabel(ownerCommercial)` |
| Country | `countryCode` |
| Active | `isActive` operational badge |
| Created | `createdAt` |
| Actions | View, Edit, Delete |

**Interim:** Keep card layout from operations; evolve to table at scale in REBUILD-4.

### 3.4 Row actions

| Action | Current | Future |
|--------|---------|--------|
| View detail | — | `/admin/tenants/:restaurantId` |
| Edit | `/dashboard?restaurant=id` | Admin detail → later in-shell editor |
| Delete | `restaurant.delete` | Confirm dialog on detail or directory |

---

## 4. Ownership Mapping

### 4.1 Data flow

```text
admin.listRestaurants
  └── items[]
        ├── restaurant { id, userId, nameAr, ... }
        ├── ownerName
        └── ownerCommercial { planCode, subscriptionStatus, ... }
```

### 4.2 Ownership display rules

| Rule | UI |
|------|-----|
| Every tenant has `userId` | Owner link always shown when resolvable |
| Owner without subscription | “No account subscription” on tenant card |
| Owner with multiple tenants | Accounts detail lists all; tenant directory filterable by `ownerId` |
| Orphan email on restaurant | Show `ownerEmail` field even if no `userId` |

### 4.3 Cross-links

```text
Tenants ──owner──► Accounts (/admin/accounts/:ownerId)
Accounts ──restaurants──► Tenants (/admin/tenants?ownerId=)
Commercial overview ──► Tenants (active restaurant KPI drill-down future)
```

---

## 5. Tenant Status Model

### 5.1 Operational state (tenant-native)

| Field | Meaning | Editable on tenant detail |
|-------|---------|---------------------------|
| `isActive` | Venue enabled | Future — today via owner dashboard |
| `slug` | Public URL key | Read on admin detail |
| `countryCode`, `currencyCode` | Locale | Create wizard |
| `phone`, `address` | Contact | Create wizard / detail |

### 5.2 Inherited commercial state (owner-native, read-only on tenant)

Displayed in **Inherited entitlements** panel (preserve today’s copy + hint):

| Signal | Source |
|--------|--------|
| Entitled? | `isOwnerEntitled(ownerCommercial)` |
| Subscription status | `ownerSubscriptionStatus` |
| Plan label | `ownerPlanLabel` |

**Mutation rule:** Subscription changes happen on **Accounts → Commercial panel**, not on tenant detail (domain separation).

### 5.3 Status filter semantics

Operations today filters restaurant list by **owner subscription status**, not `isActive`.

| Filter value | Matches |
|--------------|---------|
| `active` | Owner entitled + status active |
| `trial` | Owner entitled + trial |
| `inactive` | Not entitled |
| `expired` / `canceled` | Owner entitled + matching status |

Document this dual semantics for operators: *“Status filter reflects owner billing, not venue paused state.”*

---

## 6. Create Restaurant Wizard (`/admin/tenants/new`)

### 6.1 Split from monolith dialog

Current: single dialog with optional `createSubscriberAccount` embedded.

### 6.2 Proposed steps

```text
Step 1 — Venue
  nameAr*, nameEn, descriptionAr, phone, address

Step 2 — Locale
  country, currency (countryCurrency.getAll)

Step 3 — Ownership
  ○ Link existing account (email lookup — future)
  ○ Create new subscriber account (email, password, name)
  ○ Skip (ownerEmail only — legacy path)

Step 4 — Review & Create
  restaurant.create + optional createSubscriberAccount
```

### 6.3 Domain boundaries in wizard

| Step | Domain |
|------|--------|
| 1–2 | Tenants |
| 3 (account create) | Accounts (calls `createSubscriberAccount`) |
| 4 | Tenants (calls `restaurant.create`) |

---

## 7. Tenant Detail Page (`/admin/tenants/:restaurantId`)

### 7.1 Sections

```text
┌─────────────────────────────────────────────────────────────┐
│  [← Tenants]  nameAr (nameEn)              [isActive badge]  │
├─────────────────────────────────────────────────────────────┤
│  VENUE INFO          │  OWNERSHIP           │  COMMERCIAL   │
│  Description         │  Owner name/email    │  Inherited    │
│  Phone, address      │  Link → Account      │  entitlements │
│  Country, currency   │  userId              │  (read-only)  │
│  Slug, created       │                      │  Link → manage│
├─────────────────────────────────────────────────────────────┤
│  ACTIONS: Edit (interim: owner dashboard) · Delete         │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 APIs

| Query | Use |
|-------|-----|
| `admin.listRestaurants` | Find by id (until `getRestaurant` admin endpoint) |
| `admin.getOwnerOverview` | Owner commercial if `userId` known |

**Future:** Dedicated `admin.getTenantDetail` read API (REBUILD-5+) — not required for REBUILD-3 cutover.

---

## 8. Relationship to `/admin/tenants` Placeholder

| Today | REBUILD-3 |
|-------|-----------|
| `AdminSectionPlaceholder` “Coming soon” | Replace with `AdminTenantsPage` extracted from operations |
| Nav item exists | Becomes **live** — resolves REBUILD-1 placeholder inflation |

---

## 9. What Tenants Domain Does NOT Own

| Capability | Owner domain |
|------------|--------------|
| User role / classification | Accounts |
| Subscription CRUD | Commercial (via Account detail) |
| MRR / ARR | Commercial overview |
| Notifications | Communications |
| Menu/content editing | Owner dashboard (subscriber app) |
| Location / branches | Future location architecture — **out of scope** |

---

## 10. Extraction Checklist

| Monolith artifact | Tenant home |
|-------------------|-------------|
| `listRestaurants` query | Directory |
| Search + status filter | Directory toolbar |
| Restaurant cards | Directory (cards → table later) |
| Create dialog fields | Wizard steps 1–4 |
| Delete restaurant dialog | Directory + detail |
| Edit → dashboard navigation | **Keep temporarily** on detail |
| `AdminKPISection` | **Not transferred** |
| Inherited entitlements panel | Detail + directory card |

---

## 11. Acceptance Criteria (Tenants)

| Criterion | Measurable |
|-----------|------------|
| `/admin/tenants` is first-class nav target | Placeholder replaced |
| Owner always linkable to Accounts | Click owner email |
| Commercial mutations absent from tenant UI | No subscription dialogs on tenant pages |
| Create flow supports account provisioning | Wizard step 3 |
| Status filter documented | Operator docs / in-ui hint |

**Companion:** [Legacy Removal](./ADMIN-DASHBOARD-REBUILD-2-LEGACY-REMOVAL.md)
