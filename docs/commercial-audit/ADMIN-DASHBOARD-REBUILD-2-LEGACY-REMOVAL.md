# ADMIN-DASHBOARD-REBUILD-2 — Legacy Removal Inventory

**Program:** Admin Dashboard Rebuild  
**Phase:** REBUILD-2 — Operations Decomposition  
**Date:** 2026-06-09  
**Status:** Complete  

**Scope:** Operations monolith content classified for removal during decomposition. Distinct from [REBUILD-1 Legacy Inventory](./ADMIN-DASHBOARD-REBUILD-1-LEGACY-INVENTORY.md) — this doc focuses on **what leaves `/admin/operations`**.

---

## 1. Classification Key (2F)

| Label | Definition |
|-------|------------|
| **Legacy** | Superseded pattern retained for compatibility |
| **Duplicate** | Same capability exists elsewhere |
| **Temporary** | Needed until replacement route ships |
| **Audit-Era** | Built for migration/audit programs, not operator workflow |
| **Dead** | Unused code or zero-import surface |

---

## 2. Operations Monolith Removal Table

| Item | Location | Class | Recommendation | Phase |
|------|----------|-------|----------------|-------|
| `AdminKPISection` on operations | `AdminManagement` ~1199 | **Duplicate** | **Remove** — home owns KPIs | REBUILD-3a |
| `getDashboardSummary` in operations | `AdminManagement` ~1010 | **Duplicate** | **Remove** with KPI section | REBUILD-3a |
| Monolithic scroll (restaurants + users) | `AdminManagement` layout | **Legacy** | **Remove** — split to domain pages | REBUILD-3b |
| `getStatusBadge` Arabic hardcoded | `UsersSection` ~295 | **Legacy** | **Remove** → `CommercialStatusBadge` | REBUILD-3d |
| Second “Add restaurant” CTA | Empty state + header | **Duplicate** | **Merge** — one CTA on tenants | REBUILD-3b |
| Inline subscription CRUD on directory row | `renderUserActions` secondary | **Legacy** | **Remove** from directory — detail only | REBUILD-3c |
| Inline invoice PDF on directory row | `renderUserActions` | **Legacy** | **Move** to account detail | REBUILD-3c |
| Per-row notify button | `renderUserActions` neutral | **Temporary** | **Move** to Communications | REBUILD-3b |
| Bulk notify on users toolbar | `UsersSection` ~497 | **Temporary** | **Move** to Communications | REBUILD-3b |
| Mixed classification single table | `UsersSection` default | **Legacy** | **Remove** — tabbed Accounts | REBUILD-3b |
| Edit restaurant → owner dashboard | Restaurant card ~1394 | **Temporary** | **Keep** until tenant detail | REBUILD-3c |
| `AdminManagement.tsx` file | Whole page | **Legacy** | **Retire** after extraction | REBUILD-3d |
| `/admin/operations` route | `App.tsx` | **Legacy** | **Redirect** → `/admin/accounts` | REBUILD-3b |
| `ADMIN_LEGACY_NAV` group | `adminNavigation.ts` | **Audit-Era** | **Remove** — promote domain nav | REBUILD-3a |
| “Legacy operations” i18n | `admin.nav.legacyGroup` | **Audit-Era** | **Remove** copy | REBUILD-3a |

---

## 3. Orphan Routes (outside monolith, remove with Accounts)

| Route | Class | Recommendation | Phase |
|-------|-------|----------------|-------|
| `/users` | **Duplicate** | Redirect `/admin/accounts` | REBUILD-3b |
| `/super-admin` | **Legacy** | Redirect `/admin` | REBUILD-3b |
| `Users.tsx` | **Duplicate** | Delete after redirect TTL | REBUILD-3d |
| `SuperAdminDashboard.tsx` | **Legacy** | Delete after redirect TTL | REBUILD-3d |

---

## 4. Dead Code

| Item | Evidence | Recommendation |
|------|----------|----------------|
| `AdminPageShell.tsx` | Zero imports | **Delete** REBUILD-3a |
| `Download` icon import | If unused in `AdminManagement` | **Delete** import |
| `getOwnerOverview` (server) | API exists, no page | **Keep API** — wire to account detail |

---

## 5. Audit-Era Surfaces (not operator workflow)

| Item | Class | Recommendation |
|------|-------|----------------|
| 6 placeholder nav pages | **Audit-Era** (EXEC-7 roadmap) | **Keep** until domain ships; badge in nav |
| `/commercial/diagnostics` | **Audit-Era** | **Move** `/admin/diagnostics` — not delete |
| `clientGateRegistry` diagnostics | **Audit-Era** | **Keep** — dev/audit tooling |
| Home “All sections” 16-card grid | **Duplicate** | **Remove** per REBUILD-1 (home cleanup — REBUILD-4) |

---

## 6. Temporary Retention Schedule

| Item | Retained until | Then |
|------|----------------|------|
| `/admin/operations` route | `/admin/accounts` + `/admin/tenants` live | 302 redirect |
| Tabbed monolith (3a) | Dedicated routes (3b) | Delete tabs |
| Edit → owner dashboard | Admin tenant detail | In-shell edit |
| Inline role edit on directory | Account detail governance panel | Optional simplify |
| `Statistics.tsx` redirect | Bookmark TTL (~2 releases) | Remove route |

---

## 7. What Must NOT Be Removed

| Item | Reason |
|------|--------|
| `SubscriptionAdminFormFields` | Still authoritative — moves to Commercial panel |
| `isProtectedPlatformAccountUser` guards | ADMIN-AUTH-1D/1E |
| `createInternalUser` flow | ADMIN-AUTH-1B |
| `getOwnerOverviewList` | Accounts directory API |
| `listRestaurants` | Tenants directory API |
| Server mutation guards | Authoritative protection |
| `/admin/commercial`, `/admin/analytics` | Live certified reads |

---

## 8. Removal Sequence (consolidated)

```text
REBUILD-3a
  ✓ Remove KPI dup from operations
  ✓ Tab: Tenants | Accounts | Communications
  ✓ Delete AdminPageShell
  ✓ Nav: remove legacy group label

REBUILD-3b
  ✓ Ship /admin/tenants, /admin/accounts, /admin/communications
  ✓ Redirect /admin/operations, /users, /super-admin
  ✓ Replace /admin/tenants placeholder

REBUILD-3c
  ✓ Account + tenant detail pages
  ✓ Move subscription + invoice off directory
  ✓ Move notify to communications

REBUILD-3d
  ✓ Delete AdminManagement.tsx
  ✓ Delete Users.tsx, SuperAdminDashboard.tsx
  ✓ Replace getStatusBadge
  ✓ Remove ADMIN_LEGACY_NAV
```

---

## 9. Success Criteria Answers

| Question | Answer |
|----------|--------|
| **What should be removed?** | KPI dup, monolith layout, mixed table UX, orphan routes, legacy nav stigma, hardcoded badges, directory-level subscription/invoice/notify |
| **What should remain temporarily?** | `/admin/operations` redirect shim, edit→dashboard navigation, tabbed interim, placeholder pages until data surfaces ship |
| **What survives from Operations?** | Nothing as monolith — capabilities migrate to Accounts, Tenants, Communications, Commercial panel |

---

## 10. REBUILD-2 Completion

| Deliverable | Status |
|-------------|--------|
| Domain map | ✅ [DOMAIN-MAP.md](./ADMIN-DASHBOARD-REBUILD-2-DOMAIN-MAP.md) |
| Route architecture | ✅ [ROUTE-ARCHITECTURE.md](./ADMIN-DASHBOARD-REBUILD-2-ROUTE-ARCHITECTURE.md) |
| Extraction plan | ✅ [OPERATIONS-EXTRACTION.md](./ADMIN-DASHBOARD-REBUILD-2-OPERATIONS-EXTRACTION.md) |
| Accounts blueprint | ✅ [ACCOUNTS-BLUEPRINT.md](./ADMIN-DASHBOARD-REBUILD-2-ACCOUNTS-BLUEPRINT.md) |
| Tenants blueprint | ✅ [TENANTS-BLUEPRINT.md](./ADMIN-DASHBOARD-REBUILD-2-TENANTS-BLUEPRINT.md) |
| Legacy removal | ✅ This document |

**Migration path is unambiguous.** Implementation begins at **REBUILD-3** with Phase 3a (tab decomposition).

**Constraints honored:** No authorization, classification, OWNER_OPEN_ID, commercial calculation, or location architecture changes in this phase.
