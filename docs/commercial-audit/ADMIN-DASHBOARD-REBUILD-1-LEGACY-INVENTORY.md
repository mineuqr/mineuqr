# ADMIN-DASHBOARD-REBUILD-1 — Legacy Inventory

**Program:** Admin Dashboard Rebuild  
**Phase:** REBUILD-1 — Legacy Detection Audit (read-only)  
**Date:** 2026-06-09  
**Status:** Complete  

**Classification key:**

| Label | Meaning |
|-------|---------|
| **Remove Immediately** | Orphan route or dead code — safe to delete with redirect |
| **Remove During Rebuild** | Active but superseded — retire when replacement ships |
| **Keep** | Still authoritative |
| **Investigate** | Unclear usage or policy decision needed |

---

## 1. Executive Summary

The admin ecosystem carries **three generations** of UI: pre-EXEC-7 orphans (`/users`, `/super-admin`), the EXEC-7 shell with placeholders, and the EXEC-7B legacy operations monolith. Additionally, **commercial diagnostics tooling** lives outside admin nav, and **audit-era placeholder routes** create false completeness signals.

This inventory classifies every legacy element for rebuild prioritization.

---

## 2. Routes & Pages

| Item | Path | Classification | Rationale | Action |
|------|------|----------------|-----------|--------|
| Statistics redirect | `/statistics` → `/admin/analytics` | **Remove Immediately** | Shim only; bookmark compat served | 301 redirect retained 1 release, then remove route |
| Users orphan | `/users` | **Remove Immediately** | Duplicate subset of operations; no shell | Redirect → `/admin/accounts` when built; interim → `/admin/operations` |
| SuperAdminDashboard | `/super-admin` | **Remove Immediately** | Arabic-only duplicate; no nav links | Redirect → `/admin` |
| AdminManagement | `/admin/operations` | **Remove During Rebuild** | Authoritative CRUD today | Split into tenants + accounts; then retire path |
| AdminPageShell | (unused component) | **Remove Immediately** | Zero imports | Delete file + barrel export |
| Placeholder pages (×6) | `/admin/tenants`, etc. | **Keep** (interim) | EXEC-7 roadmap anchors | Replace content incrementally; badge in nav |
| CommercialDiagnostics | `/commercial/diagnostics` | **Investigate** → **Move** | Useful for CRS audits; wrong nav context | Relocate to `/admin/diagnostics` |
| AdminDashboardHome legacy card | `/admin` section | **Remove During Rebuild** | Redundant third link to operations | Remove when operations promoted |

---

## 3. Navigation & Config Legacy

| Item | File | Classification | Notes |
|------|------|----------------|-------|
| `ADMIN_LEGACY_NAV` | `adminNavigation.ts` | **Remove During Rebuild** | “Legacy operations” group — relabel and promote |
| `ADMIN_LEGACY_ROUTES` | `adminNavigation.ts` | **Keep** (docs) | Registry only — not rendered; useful for redirects |
| `admin.nav.legacyGroup` i18n | `en.json`, `ar.json` | **Remove During Rebuild** | Stigmatizes primary workflow |
| `admin.nav.operationsDesc` “(legacy)” | locales | **Remove During Rebuild** | Copy update on promotion |
| Duplicate home shortcuts | `AdminDashboardHome.tsx` | **Remove During Rebuild** | 16-card grid duplicates sidebar |
| Footer “canonical hint” | `AdminDashboardSidebar.tsx` | **Investigate** | May confuse — replace with “last synced” |

---

## 4. UI Components & Patterns

### 4.1 Legacy buttons & actions

| Item | Location | Classification | Notes |
|------|----------|----------------|-------|
| `getStatusBadge` hardcoded Arabic colors | `AdminManagement.tsx` `UsersSection` | **Remove During Rebuild** | Replace with `CommercialStatusBadge` |
| Restaurant edit → owner dashboard | `AdminManagement.tsx` | **Investigate** | Leaves admin context — rebuild as admin detail |
| Invoice PDF per user row | `UsersSection` | **Keep** until Reports ships | Move to account detail + reports |
| Bulk notify all users | `UsersSection` toolbar | **Keep** | Add audience filter during rebuild |
| `Download` icon import (if unused) | `AdminManagement.tsx` | **Remove Immediately** | Dead import if still present |
| SuperAdmin delete-only actions | `SuperAdminDashboard.tsx` | **Remove Immediately** | With page retirement |

### 4.2 Legacy dialogs

| Dialog | Location | Classification |
|--------|----------|----------------|
| Delete user | `UsersSection`, `Users.tsx`, `SuperAdminDashboard` | **Keep** (consolidate to accounts) |
| Delete subscription | `UsersSection` | **Keep** |
| Subscription create/edit | `UsersSection` + `SubscriptionAdminFormFields` | **Keep** — move to account detail |
| Internal user create | `UsersSection` | **Keep** — move to accounts/internal |
| Bulk notify | `UsersSection` | **Keep** — move to communications |
| Create restaurant + subscriber | `AdminManagement` | **Keep** — rebuild as wizard |
| Delete restaurant | `AdminManagement` | **Keep** |

### 4.3 Legacy subscription flows

| Item | Path | Classification | Notes |
|------|------|----------------|-------|
| `SubscriptionAdminFormFields` | `components/admin/subscription/` | **Keep** | Admin subscription form — still authoritative |
| `SubscriptionCycleSelector` | same | **Keep** | |
| `SubscriptionSummaryPreview` | same | **Keep** | |
| `SubscriptionPriceDisplay` | same | **Keep** | |
| Customer `SubscriptionManagement` cancel TODO | `/subscription` | **Investigate** | Subscriber-facing — out of admin rebuild scope |
| Deprecated server restaurant sub APIs | `routers.ts` comments | **Keep** (server) | Already deprecated — not admin UI |

---

## 5. Diagnostics & Audit Tooling

| Item | Path | Classification | Notes |
|------|------|----------------|-------|
| `CommercialDiagnostics` page | `pages/CommercialDiagnostics.tsx` | **Move** | PG-1C.3A read-only |
| `CommercialEntitlementsDiagnostics` | `components/commercial/` | **Keep** | Used by diagnostics page |
| `CommercialGateConsolidationDiagnostics` | same | **Keep** | Migration progress |
| `CommercialVisibilityDiagnostics` | same | **Keep** | Legacy vs canonical visibility |
| `clientGateRegistry.ts` | `lib/commercial/` | **Keep** | “Diagnostics and audits consume this list” |
| `featureVisibility.ts` | `lib/commercial/` | **Keep** | Audit map |
| `useCommercialEntitlements` hook | `hooks/` | **Keep** | Read-only; not admin gate |

**Policy:** Diagnostics remain **read-only** — do not gate production admin actions. Relocate under `/admin/diagnostics` with admin role gate.

---

## 6. Dead / Unused UI

| Item | Evidence | Classification |
|------|----------|----------------|
| `AdminPageShell.tsx` | Exported in `layout/index.ts`; zero page imports | **Remove Immediately** |
| `getOwnerOverview` API | Server exists; no client page | **Keep API** — build detail view |
| `ADMIN_LEGACY_ROUTES` UI surface | Config only; never rendered | **Keep** as redirect registry |
| Renewal rate KPI | `StatisticsPanel` shows “—” | **Keep** empty state — honest |
| Revenue by month chart | Empty placeholder in analytics | **Keep** until canonical metric ships |

---

## 7. Duplicate Surfaces Matrix

| Capability | Implementations | Winner |
|------------|-----------------|--------|
| User list + delete | `/admin/operations`, `/users`, `/super-admin` | `/admin/accounts` (future) |
| Platform stats | `/admin` KPIs, `/admin/operations` KPIs, `/admin/analytics`, `/admin/commercial` | `/admin` home + domain pages |
| MRR display | Commercial + Analytics | Commercial overview authoritative |
| Export | Commercial header + Analytics inline | `/admin/reports` (future) |
| Status badges | 4+ implementations | `CommercialStatusBadge` |

---

## 8. ADMIN-AUTH Era Surfaces (post-1E)

| Item | Status | Classification |
|------|--------|----------------|
| `isProtectedPlatformAccountUser` UI guards | Active in operations | **Keep** |
| Subscription UI hidden for platform | 1E complete | **Keep** |
| Classification filter in users | 1B | **Keep** — promote to accounts tabs |
| Internal user creation dialog | 1B | **Keep** |
| `PROTECTED_USER_IDS` deprecated | `shared/const.ts` | **Keep** deprecated — no client usage |

---

## 9. Removal Sequence (recommended)

### Phase A — Immediate (low risk)

1. Delete `AdminPageShell.tsx` + export.
2. Add redirects: `/users` → `/admin/operations`, `/super-admin` → `/admin`.
3. Remove dead imports in `AdminManagement.tsx`.

### Phase B — Rebuild interim

1. Rename “Legacy operations” → “Operations Center”.
2. Tab `AdminManagement`: Tenants | Accounts.
3. Remove home “all sections” grid + legacy card.
4. Replace `getStatusBadge` with `CommercialStatusBadge`.

### Phase C — Structural

1. Ship `/admin/tenants`, `/admin/accounts` pages.
2. Retire `/admin/operations` monolith.
3. Remove `/users`, `/super-admin` routes entirely.
4. Move `/commercial/diagnostics` → `/admin/diagnostics`.

### Phase D — Placeholder resolution

Replace each placeholder with live content per EXEC-7 roadmap (7D–7H).

---

## 10. Investigation Items

| Item | Question | Default recommendation |
|------|----------|------------------------|
| Invoice PDF for INTERNAL accounts | Should non-commercial accounts generate invoices? | **Disable** in UI for non-COMMERCIAL |
| Restaurant edit via owner dashboard | Should admin stay in admin shell? | **Rebuild** admin tenant detail |
| Placeholder nav items | Hide or show disabled? | **Show with “Preview” badge** until live |
| `ADMIN_NAV` Customer Success icon `Users` | Conflicts with Accounts? | Change to `Headphones` or `LifeBuoy` |

---

## 11. Closure Summary

| Category | Count | Remove Immediately | Remove During Rebuild | Keep |
|----------|-------|--------------------|-----------------------|------|
| Routes | 12 | 3 | 1 | 8 |
| Components | 8 | 1 | 3 | 4 |
| Nav/config | 6 | 0 | 4 | 2 |
| Diagnostics | 6 | 0 | 0 | 6 (relocate) |

**Legacy debt is manageable** — no blocking unknowns. Primary risk is **operator confusion**, not data authority. Rebuild should prioritize **promoting operations out of “legacy”** before adding new placeholder domains.

**REBUILD-1 status:** Inventory complete. No code changes.
