# ADMIN-DASHBOARD-REBUILD-1 — Information Architecture Audit

**Program:** Admin Dashboard Rebuild  
**Phase:** REBUILD-1 — Architecture & UX Audit (read-only)  
**Date:** 2026-06-09  
**Status:** Complete  

**Mode:** Design-first audit only. No implementation. No React changes.

**Prerequisites:** EXEC-7A–7C (shell + commercial overview), ADMIN-AUTH-1A–1E (classification, platform protection, subscription hardening).

**Companion docs:** [Navigation Audit](./ADMIN-DASHBOARD-REBUILD-1-NAVIGATION-AUDIT.md) · [UX Blueprint](./ADMIN-DASHBOARD-REBUILD-1-UX-BLUEPRINT.md) · [Legacy Inventory](./ADMIN-DASHBOARD-REBUILD-1-LEGACY-INVENTORY.md)

---

## 1. Executive Summary

MineuQR’s admin experience has **two coexisting architectures**:

1. **EXEC-7 canonical shell** (`/admin/*`) — sidebar navigation, certified commercial read surfaces, six placeholder domains awaiting implementation.
2. **Legacy operations monolith** (`/admin/operations`) — the only place where restaurants, users, subscriptions, and notifications can actually be managed.

The dashboard is **operationally correct** after ADMIN-AUTH-1A–1E but **architecturally bifurcated**. Operators must learn that “real work” lives under a sidebar item labeled **Legacy operations**, while six first-class nav items return “Coming soon.”

This audit inventories every admin surface, classifies it, and proposes a future information architecture that closes the gap between EXEC-7 vision and production reality.

---

## 2. Surface Inventory

### 2.1 Canonical admin routes (`/admin/*`)

| Route | Component | Classification | Maturity | Decision |
|-------|-----------|----------------|----------|----------|
| `/admin` | `AdminDashboardHome.tsx` | **Executive Dashboard** | Live — KPI strip + nav shortcuts | **REBUILD** — reduce duplication, add alerts layer |
| `/admin/commercial` | `AdminCommercialPage.tsx` | **Commercial Operations** / Executive | Live — CRS snapshot panels | **KEEP** — refine hierarchy |
| `/admin/analytics` | `AdminAnalyticsPage.tsx` + `StatisticsPanel.tsx` | **Analytics** | Live — charts + subscriber table | **MERGE** partial overlap with Commercial |
| `/admin/tenants` | `placeholderPages.tsx` | **Restaurant Management** / Tenancy | Placeholder | **REBUILD** — absorb `/admin/operations` restaurant section |
| `/admin/customer-success` | `placeholderPages.tsx` | **Subscription Management** | Placeholder | **REBUILD** — renewal/expiring queues |
| `/admin/health` | `placeholderPages.tsx` | **System Operations** | Placeholder | **REBUILD** |
| `/admin/security` | `placeholderPages.tsx` | **System Operations** | Placeholder | **REBUILD** |
| `/admin/reports` | `placeholderPages.tsx` | **Reports** | Placeholder | **REBUILD** — centralize exports |
| `/admin/launch-readiness` | `placeholderPages.tsx` | **Internal Tools** | Placeholder | **KEEP** as checklist domain |
| `/admin/operations` | `AdminManagement.tsx` | **Operations Center** (mixed) | Live — full CRUD | **SPLIT** → tenants + accounts + comms |

### 2.2 Orphan / legacy routes (outside canonical IA)

| Route | Component | Classification | Maturity | Decision |
|-------|-----------|----------------|----------|----------|
| `/statistics` | `Statistics.tsx` | **Analytics** | Redirect shim → `/admin/analytics` | **REMOVE** after redirect TTL |
| `/users` | `Users.tsx` | **User Management** | Live — role/delete only | **REMOVE** — merge into tenants/accounts |
| `/super-admin` | `SuperAdminDashboard.tsx` | **User Management** / Diagnostics | Live — Arabic-only subset | **REMOVE** |
| `/commercial/diagnostics` | `CommercialDiagnostics.tsx` | **Diagnostics** | Live — read-only CRS audit | **MOVE** → `/admin/diagnostics` (internal) |

### 2.3 `AdminManagement.tsx` internal domains (single page, ~1,650 lines)

| Section | Function | Classification | Decision |
|---------|----------|----------------|----------|
| `AdminKPISection` | Duplicate executive KPIs | **Executive Dashboard** | **REMOVE** from operations — home owns KPIs |
| Restaurants block | Search, filter, CRUD, entitlement display | **Restaurant Management** | **MOVE** → `/admin/tenants` |
| `UsersSection` | Owner list, role/classification, subscription CRUD, notify, invoice | **User Management** + **Subscription Management** | **SPLIT** |
| Internal user dialog | `createInternalUser` | **Internal Tools** | **MOVE** → `/admin/accounts/internal` |
| Bulk notify | `sendBulkNotification` | **System Operations** | **MOVE** → `/admin/communications` |
| Create restaurant dialog | Restaurant + optional subscriber account | **Restaurant Management** | **REBUILD** as guided wizard |

---

## 3. Current Information Architecture

```text
LandingNavbar (admin role)
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  EXEC-7 Shell (AdminOperationsShell + Sidebar)            │
├───────────────────────────────────────────────────────────┤
│  /admin              Executive home (KPIs + shortcuts)    │
│  /admin/commercial   Commercial snapshot (CRS)          │
│  /admin/analytics    Platform + commercial analytics      │
│  /admin/tenants      [PLACEHOLDER]                        │
│  /admin/customer-success  [PLACEHOLDER]                   │
│  /admin/health       [PLACEHOLDER]                        │
│  /admin/security     [PLACEHOLDER]                        │
│  /admin/reports      [PLACEHOLDER]                        │
│  /admin/launch-readiness  [PLACEHOLDER]                   │
│  ── Legacy group ──                                       │
│  /admin/operations   Restaurants + Users (LIVE)           │
└───────────────────────────────────────────────────────────┘

Orphan (no shell):
  /users, /super-admin, /statistics (redirect)
  /commercial/diagnostics (subscriber CRS audit)
```

### 3.1 Domain mixing problems

| Problem | Evidence |
|---------|----------|
| **Commercial + internal in one table** | `UsersSection` lists COMMERCIAL, INTERNAL, SYSTEM in one grid with subscription columns |
| **Restaurant + account in one scroll** | `/admin/operations` stacks KPIs → restaurants → users without section tabs |
| **Executive metrics in three places** | `/admin` KPI strip, `/admin/operations` KPI strip, `/admin/commercial` executive KPIs |
| **Subscription ops in user row** | Edit/delete/create subscription embedded per user — no subscription-centric view |
| **Placeholder nav dominates** | 6 of 10 sidebar items are non-functional |

---

## 4. Future Information Architecture

### 4.1 Target domain map

```text
MineuQR Admin
│
├── Home (/admin)
│   └── Executive summary · alerts · deep links
│
├── Commercial (/admin/commercial)
│   ├── Overview (MRR, ARR, health, attention, plans)
│   ├── Analytics (/admin/commercial/analytics)  ← optional sub-route
│   └── Reports (/admin/commercial/reports)
│
├── Tenants (/admin/tenants)
│   ├── Directory (restaurants + owner linkage)
│   └── Detail (/admin/tenants/:ownerId)
│
├── Accounts (/admin/accounts)
│   ├── Commercial owners
│   ├── Internal staff
│   └── Platform (read-only badge, no mutation UI)
│
├── Customer Success (/admin/customer-success)
│   └── Expiring · canceled · renewal pipeline
│
├── Operations (/admin/operations)  ← renamed, not "legacy"
│   ├── Communications (notifications)
│   └── Provisioning wizards
│
├── Platform Health (/admin/health)
├── Security (/admin/security)
├── Launch Readiness (/admin/launch-readiness)
└── Diagnostics (/admin/diagnostics)  ← internal, role-gated
```

### 4.2 Route decision matrix (future)

| Future route | Replaces | Classification |
|--------------|----------|----------------|
| `/admin` | Current home + KPI duplication | Executive Dashboard |
| `/admin/commercial` | Current commercial page | Commercial Operations |
| `/admin/commercial/analytics` or `/admin/analytics` | StatisticsPanel (deduped) | Analytics |
| `/admin/commercial/reports` or `/admin/reports` | Export buttons scattered today | Reports |
| `/admin/tenants` | Restaurant cards in operations | Restaurant Management |
| `/admin/tenants/:ownerId` | Dialogs + `getOwnerOverview` (unused in UI) | Tenant detail |
| `/admin/accounts` | `UsersSection` | User Management |
| `/admin/accounts/internal` | Internal user dialog | Internal Tools |
| `/admin/customer-success` | Needs-attention panel (commercial only today) | Subscription Management |
| `/admin/operations` | Narrowed to comms + provisioning | System Operations |
| `/admin/diagnostics` | `/commercial/diagnostics` | Diagnostics |

### 4.3 Classification coverage

| Classification | Current home | Future home |
|----------------|--------------|---------------|
| Executive Dashboard | `/admin` (partial) | `/admin` — single KPI authority |
| Commercial Operations | `/admin/commercial` | `/admin/commercial` + success center |
| User Management | `/admin/operations`, `/users`, `/super-admin` | `/admin/accounts` only |
| Subscription Management | Embedded in user rows | `/admin/customer-success` + account detail |
| Restaurant Management | `/admin/operations` | `/admin/tenants` |
| System Operations | Bulk notify, security placeholder | `/admin/operations`, `/admin/security` |
| Internal Tools | Internal user dialog, launch readiness | `/admin/accounts/internal`, launch readiness |
| Reports | Export on commercial + analytics | `/admin/reports` |
| Analytics | `/admin/analytics` | Sub-domain of commercial or peer route |
| Diagnostics | `/commercial/diagnostics` | `/admin/diagnostics` |

---

## 5. Gap Analysis

| Gap | Current | Target | Priority |
|-----|---------|--------|----------|
| **Operations without placeholder** | Real CRUD only under “Legacy operations” | Tenants + Accounts as first-class nav | P0 |
| **Tenant detail view** | `getOwnerOverview` API exists; no UI | Owner detail with restaurants + commercial slice | P0 |
| **Account segmentation** | Single mixed user table | Tabs: Commercial / Internal / All | P1 |
| **Platform account UX** | Row in mixed table; actions hidden per 1D/1E | Dedicated read-only platform profile | P1 |
| **Commercial command cohesion** | Overview vs analytics overlap | Clear read order: Overview → Analytics → Reports | P1 |
| **Executive alerts** | Needs-attention only on commercial page | Alert strip on home linking to success center | P1 |
| **Security / health visibility** | Server logs only | Placeholder routes need data contracts | P2 |
| **Global search** | Per-section search only | Cross-tenant owner/email search | P2 |
| **Consistent status language** | 4+ badge implementations | `CommercialStatusBadge` everywhere | P1 |
| **i18n parity** | `SuperAdminDashboard` Arabic-only | Single i18n surface | P0 (remove orphan) |

---

## 6. Operations Center Structure (Section D)

### 6.1 Current `/admin/operations`

```text
┌─────────────────────────────────────────┐
│ Header: Add Restaurant                  │
├─────────────────────────────────────────┤
│ KPI Strip (duplicate of /admin)         │
├─────────────────────────────────────────┤
│ Restaurants Section                     │
│   search · status filter · card list    │
│   actions: edit (→ owner dashboard)   │
│            delete restaurant            │
├─────────────────────────────────────────┤
│ Users Section                           │
│   search · classification filter        │
│   internal user · bulk notify           │
│   table: role · classification · sub    │
│   actions: role · classification ·      │
│            subscription CRUD · delete   │
│            notify · invoice PDF         │
└─────────────────────────────────────────┘
```

### 6.2 Recommended future structure

**Option A — Dedicated pages (preferred for scale)**

| Page | Contents | Source today |
|------|----------|--------------|
| `/admin/tenants` | Restaurant directory + filters + create wizard | Restaurants block |
| `/admin/accounts` | User directory with classification tabs | UsersSection |
| `/admin/accounts/:id` | Owner profile, commercial slice, safe actions | New (uses `getOwnerOverview`) |
| `/admin/customer-success` | Subscription queues (expiring, canceled) | `CommercialOverviewNeedsAttention` + analytics table |
| `/admin/communications` | Bulk + per-user notifications | Notify dialogs |
| `/admin` (home) | No CRUD — links only | Remove KPI dup from operations |

**Option B — Tabbed operations hub (interim)**

Single `/admin/operations` with tabs: `Tenants | Accounts | Communications` — faster migration, weaker scalability.

**Recommendation:** Ship Option B as interim (REBUILD-2), migrate to Option A (REBUILD-3+).

### 6.3 What belongs together vs separated

| Belongs together | Should separate |
|------------------|-----------------|
| Restaurant + owner email on tenant card | Restaurant CRUD vs user account CRUD |
| Commercial status + plan on owner row | Subscription mutations vs read-only success queues |
| Search + filter within a domain | Cross-domain KPIs on operations page |
| Platform protection rules (1D/1E) | Internal staff creation vs commercial owner editing |

---

## 7. Commercial Command Center (Section E summary)

| Surface | API | Overlap with |
|---------|-----|--------------|
| `/admin/commercial` | `getCommercialOverview` | Analytics (MRR, plans, health) |
| `/admin/analytics` | `getCommercialAnalytics` | Commercial (executive, plan pie, health grid) |
| `/admin/reports` | Placeholder; exports live on commercial + analytics | Both above |

**Operator confusion today:** Two sidebar entries show similar KPIs. Both expose `CommercialExportButtons`. Subscriber table only on analytics.

**Future workflow:**

```text
Commercial Overview  →  "What is revenue health right now?"
        ↓
Commercial Analytics →  "How is it trending? Who are subscribers?"
        ↓
Commercial Reports   →  "Export / schedule / executive PDF"
```

See [UX Blueprint](./ADMIN-DASHBOARD-REBUILD-1-UX-BLUEPRINT.md) for detailed commercial UX design.

---

## 8. Answers to Success Criteria

| Question | Answer |
|----------|--------|
| **What should the Admin Dashboard become?** | A multi-domain SaaS Operations Center: executive home, commercial command center, tenant/account directories, customer success queues, platform health — with legacy monolith decomposed. |
| **What should be removed?** | `/users`, `/super-admin`, duplicate KPI strip on operations, orphan badge systems, placeholder-first nav pattern. |
| **What should be rebuilt?** | Executive home, tenant directory, account management, operations split, commercial/analytics deduplication. |
| **What should remain?** | EXEC-7 shell, CRS read APIs, commercial overview components, ADMIN-AUTH protection model, `StatisticsPanel` data contract (relocated). |
| **Future IA?** | Section 4.1 domain map. |
| **Future navigation?** | [Navigation Audit](./ADMIN-DASHBOARD-REBUILD-1-NAVIGATION-AUDIT.md). |
| **Future visual direction?** | [UX Blueprint](./ADMIN-DASHBOARD-REBUILD-1-UX-BLUEPRINT.md) Section 8. |

---

## 9. Recommended Rebuild Phases (architecture only)

| Phase | Scope |
|-------|-------|
| REBUILD-2 | Decompose `/admin/operations` into tabs; remove orphan routes; dedupe home KPIs |
| REBUILD-3 | Ship `/admin/tenants` + `/admin/accounts` with detail views |
| REBUILD-4 | Commercial command center merge (overview/analytics/reports) |
| REBUILD-5 | Security, health, customer success data surfaces |
| REBUILD-6 | Visual system elevation (pricing-adjacent aesthetic) |

**Stop boundary:** REBUILD-1 ends here. No code changes.
