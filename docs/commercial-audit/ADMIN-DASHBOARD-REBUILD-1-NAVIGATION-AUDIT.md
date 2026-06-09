# ADMIN-DASHBOARD-REBUILD-1 — Navigation Architecture Audit

**Program:** Admin Dashboard Rebuild  
**Phase:** REBUILD-1 — Navigation Audit (read-only)  
**Date:** 2026-06-09  
**Status:** Complete  

**Config source:** `client/src/lib/admin/adminNavigation.ts`  
**Shell:** `AdminDashboardSidebar.tsx` inside `AdminOperationsShell.tsx`

---

## 1. Executive Summary

EXEC-7B delivered a **config-driven sidebar** — a major improvement over the pre-7A top-bar-only model. However, the navigation now suffers from **placeholder inflation**: six of ten primary items lead to “Coming soon” pages, while the only fully operational CRUD surface is relegated to a **Legacy operations** group at the bottom.

Operators experience a **discoverability inversion**: the sidebar promises a mature SaaS ops center, but production work still requires finding the legacy link.

This audit maps current navigation, evaluates hierarchy and workflow fit, and proposes a migration path to a scalable operator nav model.

---

## 2. Current Navigation Map

### 2.1 Sidebar structure (production)

```text
┌─────────────────────────────────────┐
│ [Store icon] MineuQR Admin          │
│            Operations Center         │
├─────────────────────────────────────┤
│ MAIN (no group label)               │
│   ○ Overview          /admin        │  LIVE
│   ○ Commercial        /admin/commercial │ LIVE
│   ○ Analytics         /admin/analytics  │ LIVE
│   ○ Tenants           /admin/tenants    │ PLACEHOLDER
│   ○ Customer Success  /admin/customer-success │ PLACEHOLDER
│   ○ Health Center     /admin/health     │ PLACEHOLDER
│   ○ Security          /admin/security   │ PLACEHOLDER
│   ○ Reports           /admin/reports    │ PLACEHOLDER
│   ○ Launch Readiness  /admin/launch-readiness │ PLACEHOLDER
├─────────────────────────────────────┤
│ LEGACY                              │
│   ○ Operations        /admin/operations │ LIVE (full CRUD)
├─────────────────────────────────────┤
│ Footer: canonical hint              │
└─────────────────────────────────────┘
```

### 2.2 Entry points (outside sidebar)

| Entry | Target | Notes |
|-------|--------|-------|
| `LandingNavbar` “Admin Panel” | `/admin` | Only for `role === "admin"` |
| `AdminDashboardHome` shortcut cards | All nav items + operations | Duplicates sidebar |
| `AdminDashboardHome` legacy card | `/admin/operations` | Third link to operations |
| Direct URL bookmarks | `/users`, `/super-admin`, `/statistics` | Orphans — no nav links |

### 2.3 Breadcrumb model

All shell pages use: `Overview → [Current Section]`

Tenant detail and account detail **do not exist** — no third-level breadcrumbs today.

---

## 3. Navigation Evaluation

### 3.1 Hierarchy

| Criterion | Score | Finding |
|-----------|-------|---------|
| **Logical grouping** | ⚠️ Weak | Single flat list of 9 items; no commercial vs operations vs platform grouping |
| **Depth** | ✅ Shallow | Max 2 levels — good for speed, bad for detail views |
| **Priority ordering** | ⚠️ Inverted | Placeholders rank above live operations |
| **Legacy signaling** | ❌ Harmful | “Legacy” label trains operators to avoid future primary nav |

### 3.2 Grouping

| Domain cluster | Current nav items | Issue |
|----------------|-------------------|-------|
| **Executive** | Overview | OK |
| **Commercial** | Commercial, Analytics, Reports (placeholder), Customer Success (placeholder) | Fragmented across 4 items; 2 dead |
| **Tenancy** | Tenants (placeholder), Operations (legacy) | Split — live work not under Tenants |
| **Platform** | Health, Security, Launch Readiness (all placeholder) | No live signal |

### 3.3 Labels & discoverability

| Item | Label key | Operator clarity |
|------|-----------|------------------|
| `overview` | Overview | Clear |
| `commercial` | Commercial | Clear |
| `analytics` | Analytics | Overlaps mentally with Commercial |
| `tenants` | Tenants | Implies restaurants; page empty |
| `customer-success` | Customer Success | Jargon; page empty |
| `health` | Health Center | Ambiguous (tenant vs platform) |
| `operations` | Operations (legacy) | Underlabeled — actually “Restaurants & Users” |

**i18n:** Nav labels use `admin.nav.*` keys — good. `SuperAdminDashboard` orphan has no i18n.

### 3.4 Scalability

Adding tenant detail (`/admin/tenants/:id`) requires:
- Sidebar active-state logic update (`isAdminNavItemActive` already supports prefix match)
- Breadcrumb third level
- Optional sub-nav on detail pages

Current flat sidebar **does not scale** beyond ~12 items without collapsible groups.

### 3.5 Icon consistency

| Item | Icon | Note |
|------|------|------|
| Overview | `LayoutDashboard` | ✅ |
| Commercial | `TrendingUp` | ✅ |
| Analytics | `BarChart3` | ✅ |
| Tenants | `Building2` | ✅ |
| Customer Success | `Users` | ⚠️ Conflicts with account management semantics |
| Health | `HeartPulse` | ✅ |
| Security | `Shield` | ✅ |
| Reports | `FileText` | ✅ |
| Launch Readiness | `Rocket` | ✅ |
| Operations | `Store` | ⚠️ Same icon family as brand header `Store` |

### 3.6 Operator workflow (today)

```mermaid
flowchart TD
  A[Admin logs in] --> B[/admin home]
  B --> C{Task type?}
  C -->|Check revenue| D[/admin/commercial]
  C -->|Charts / export| E[/admin/analytics]
  C -->|Manage restaurant or user| F[Find Legacy operations]
  F --> G[/admin/operations]
  C -->|Explore future feature| H[Placeholder → dead end]
```

**Friction points:**
1. Three clicks to realize Tenants nav is empty.
2. No nav path to user management except Legacy operations or orphan `/users`.
3. Home page duplicates every sidebar link as cards — navigation redundancy without added value.

---

## 4. Recommended Navigation Map

### 4.1 Target sidebar (REBUILD-2+)

```text
┌─────────────────────────────────────┐
│ MineuQR Admin                       │
├─────────────────────────────────────┤
│ EXECUTIVE                           │
│   Overview                          │
├─────────────────────────────────────┤
│ COMMERCIAL                          │
│   Overview                          │
│   Analytics                         │
│   Customer Success                  │
│   Reports                           │
├─────────────────────────────────────┤
│ OPERATIONS                          │
│   Tenants                           │  ← restaurants (live)
│   Accounts                          │  ← users (live)
│   Communications                    │  ← notifications
├─────────────────────────────────────┤
│ PLATFORM                            │
│   Health                            │
│   Security                          │
│   Launch Readiness                  │
├─────────────────────────────────────┤
│ [collapsed] Diagnostics             │  ← internal only
└─────────────────────────────────────┘
```

### 4.2 Route mapping (migration)

| Current | Future | Nav change |
|---------|--------|------------|
| `/admin/operations` (restaurants) | `/admin/tenants` | Promote to OPERATIONS group; remove “legacy” label |
| `/admin/operations` (users) | `/admin/accounts` | New nav item |
| `/admin/operations` (notify) | `/admin/communications` | New nav item |
| `/admin/tenants` placeholder | `/admin/tenants` live | Same path — content swap |
| `/admin/customer-success` placeholder | Live queue UI | Same path |
| `/admin/operations` | **Retired** or redirect | After split complete |
| `/users` | Redirect → `/admin/accounts` | Remove orphan |
| `/super-admin` | Redirect → `/admin` | Remove orphan |
| `/commercial/diagnostics` | `/admin/diagnostics` | Hidden nav; admin-only link from footer |

### 4.3 Interim nav (minimal change, high impact)

Until full rebuild ships, **reorder and regroup without new pages**:

1. Move **Operations** out of “Legacy” into main group — rename **“Operations Center”**.
2. Mark placeholders with visual badge (sidebar `Construction` icon + muted style) — avoid full page dead-ends.
3. Remove duplicate shortcut grid on home — keep 3 deep links: Commercial, Analytics, Operations.
4. Add `ADMIN_NAV_GROUPS` `labelKey` for group headers (Executive, Commercial, Operations, Platform).

---

## 5. Migration Notes

### 5.1 Config changes (future implementation)

| File | Change |
|------|--------|
| `adminNavigation.ts` | Add `AdminNavGroup.labelKey`; split items into 4 groups; deprecate `ADMIN_LEGACY_NAV` |
| `AdminDashboardSidebar.tsx` | Render group labels; optional placeholder badge on `comingSoon: true` nav items |
| `AdminDashboardHome.tsx` | Remove “All sections” grid; add needs-attention alert strip |
| `App.tsx` | Add `/admin/accounts`, `/admin/communications`; redirects for orphans |
| `en.json` / `ar.json` | Rename `admin.nav.operations` → “Operations Center”; remove “legacy” copy |

### 5.2 Active-state rules

| Rule | Rationale |
|------|-----------|
| `/admin` exact match only | Prevent home highlighting on all `/admin/*` |
| `/admin/tenants/:id` highlights Tenants | Prefix match already supported |
| `/admin/accounts/:id` highlights Accounts | New |
| Commercial sub-routes highlight Commercial parent | Optional `parentId` on `AdminNavItem` |

### 5.3 Breadcrumb conventions (future)

```text
Overview → Tenants → [Restaurant Name]
Overview → Accounts → [Owner Email]
Overview → Commercial → Analytics   (if nested)
```

### 5.4 Mobile / RTL

- Sidebar uses shadcn `Sidebar` with `collapsible="icon"` — verify touch targets on operations tables.
- Breadcrumbs already RTL-aware (`AdminShellBreadcrumbs`).
- Nav labels must stay concise in Arabic — test `customer-success` translation length.

---

## 6. Comparison to EXEC-7A Target

| EXEC-7A proposal | REBUILD-1 status | Delta |
|------------------|------------------|-------|
| Persistent left sidebar | ✅ Shipped (7B) | Done |
| Analytics first-class | ✅ `/admin/analytics` | Done |
| Tenants as operational landing | ❌ Placeholder only | **Gap — P0** |
| Retire `/users`, `/super-admin` | ❌ Still registered | **Gap — P0** |
| Security / health centers | ❌ Placeholders | Expected — needs data APIs |
| Global search in header | ❌ Not built | REBUILD-3+ |

---

## 7. Closure Recommendation

**Navigation is structurally sound (EXEC-7B) but operationally misleading.**

Approve REBUILD-2 navigation migration:
1. Promote operations to first-class nav (drop “legacy” stigma).
2. Badge or collapse placeholder items until they ship.
3. Split operations route into Tenants + Accounts nav targets.
4. Remove orphan routes with redirects.

No navigation code changes in REBUILD-1 — this document is the approved blueprint.
