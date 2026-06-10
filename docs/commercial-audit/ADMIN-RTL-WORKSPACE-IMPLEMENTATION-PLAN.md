# Admin RTL Workspace — Implementation Plan

**Project:** MineuQR  
**Program:** ADMIN-RTL-WORKSPACE  
**Phase:** Implementation planning only — execution blueprint  
**Date:** 2026-06-10  
**Authority:**

| Document | Role |
|----------|------|
| `ADMIN-RTL-WORKSPACE-AUDIT.md` | Problem diagnosis |
| `ADMIN-RTL-WORKSPACE-DESIGN.md` | Approved Workspace-First (Model B) design |

**Out of scope for this document:** Code changes, implementation, pseudo-code.

**Prerequisite programs (complete):** UX-REFINE-1B/C/D, OCC-MVP  
**Recommended sequencing:** Complete **before** ADMIN-SECURITY-CENTER UI.

---

## Executive Summary

Implement Workspace-First by establishing an **LTR geometry boundary** at `AdminOperationsShell`, then aligning **layout primitives** and **high-visibility surfaces** to the design invariants. Most admin routes mount through the shell — **Phase 1 alone resolves the majority of Arabic disconnect**.

| Strategy | Choice |
|----------|--------|
| Primary choke point | `AdminOperationsShell` |
| Reference UX baseline | Operations Accounts tab |
| Command center baseline | Overview (OCC-MVP) |
| Rollout | Shell → primitives → headers → sections → tables → forms → sweep |
| Estimated effort | **Medium** with shell-first; **High** if skipping shell boundary |

---

## 1. Exact Components to Modify

### Tier 1 — Boundary (mandatory)

| Component | Path | Modification intent |
|-----------|------|---------------------|
| **`AdminOperationsShell`** | `client/src/components/admin/layout/AdminOperationsShell.tsx` | Establish workspace `dir="ltr"` boundary; optional `lang` passthrough for accessibility |

### Tier 2 — Layout primitives (mandatory)

| Component | Path | Modification intent |
|-----------|------|---------------------|
| **`AdminSection`** | `client/src/components/admin/layout/AdminSection.tsx` | Stable title/actions row under workspace LTR; Arabic text `dir` on copy nodes |
| **`AdminStatCard`** | `client/src/components/admin/layout/AdminStatCard.tsx` | Card header row workspace-stable; title RTL text; value remains `valueDir` |
| **`adminDashStyles`** | `client/src/components/admin/layout/adminDashStyles.ts` | Review `opsTabList`, `opsListRow`, table tokens for physical vs logical alignment |
| **`AdminPageSection`** | `client/src/components/admin/sections/AdminPageSection.tsx` | Title/description text direction for Arabic |

### Tier 3 — Chrome & navigation

| Component | Path | Modification intent |
|-----------|------|---------------------|
| **`AdminShellBreadcrumbs`** | `client/src/components/admin/layout/AdminShellBreadcrumbs.tsx` | Breadcrumb trail workspace-start; Arabic label RTL on text |
| **`AdminDashboardSidebar`** | `client/src/components/admin/layout/AdminDashboardSidebar.tsx` | Nav label text direction; verify icon+label order under workspace LTR |
| **`sidebar.tsx` (shadcn)** | `client/src/components/ui/sidebar.tsx` | Audit only unless shell wrapper insufficient — `text-left`, physical `right-*` on menu actions |

### Tier 4 — Operations frame (verify + minor)

| Component | Path | Modification intent |
|-----------|------|---------------------|
| **`OperationsTabFrame`** | `client/src/components/admin/operations/OperationsTabFrame.tsx` | Toolbar row order stable |
| **`ResponsiveOperationsBar`** | `client/src/components/admin/operations/ResponsiveOperationsBar.tsx` | Flex order search → filter |
| **`CustomerSuccessAccountsSection`** | `client/src/components/admin/domains/customer-success/CustomerSuccessAccountsSection.tsx` | Regression baseline — verify table/toolbar |
| **`CustomerSuccessTenantsSection`** | `client/src/components/admin/domains/customer-success/CustomerSuccessTenantsSection.tsx` | Table + form fields |
| **`CustomerSuccessCommunicationsSection`** | `client/src/components/admin/domains/customer-success/CustomerSuccessCommunicationsSection.tsx` | Form grid order |

### Tier 5 — Overview command center (OCC-MVP)

| Component | Path | Modification intent |
|-----------|------|---------------------|
| **`ReportsHomeKpiSection`** | `client/src/components/admin/domains/reports/ReportsHomeKpiSection.tsx` | KPI grid LTR flow; Arabic labels |
| **`OverviewNeedsAttentionSection`** | `client/src/components/admin/domains/customer-success/OverviewNeedsAttentionSection.tsx` | Section header + drill actions |
| **`OverviewQuickActionsSection`** | `client/src/components/admin/sections/overview/OverviewQuickActionsSection.tsx` | Row icon/chevron policy; remove EN-only `rotate-180` if obsolete |
| **`CommercialOverviewNeedsAttention`** | `client/src/components/admin/commercial/CommercialOverviewNeedsAttention.tsx` | Card header row under workspace LTR |

### Tier 6 — Commercial reporting

| Component | Path | Modification intent |
|-----------|------|---------------------|
| **`ReportsExecutiveSection`** | `client/src/components/admin/domains/reports/ReportsExecutiveSection.tsx` | Inherits `AdminSection` |
| **`CommercialOverviewExecutiveKpis`** | `client/src/components/admin/commercial/CommercialOverviewExecutiveKpis.tsx` | KPI grid |
| **`CustomerSuccessAttentionSection`** | `client/src/components/admin/domains/customer-success/CustomerSuccessAttentionSection.tsx` | Attention block |
| **`CustomerSuccessHealthSection`** | `client/src/components/admin/domains/customer-success/CustomerSuccessHealthSection.tsx` | Health block |
| **`CommercialOverviewSubscriptionHealth`** | `client/src/components/admin/commercial/CommercialOverviewSubscriptionHealth.tsx` | Card headers |
| **`CommercialOverviewPlanDistribution`** | `client/src/components/admin/commercial/CommercialOverviewPlanDistribution.tsx` | Card headers |
| **`CommercialOverviewMetadataPanel`** | `client/src/components/admin/commercial/CommercialOverviewMetadataPanel.tsx` | Metadata rows |
| **`ReportsMetadataSection`** | `client/src/components/admin/domains/reports/ReportsMetadataSection.tsx` | Section wrapper |
| **`ReportsPlanDistributionSection`** | `client/src/components/admin/domains/reports/ReportsPlanDistributionSection.tsx` | Section wrapper |

### Tier 7 — Analytics

| Component | Path | Modification intent |
|-----------|------|---------------------|
| **`StatisticsPanel`** | `client/src/pages/admin/StatisticsPanel.tsx` | KPI grids, chart cards, subscriber table |
| **`ReportsAnalyticsSection`** | `client/src/components/admin/domains/reports/ReportsAnalyticsSection.tsx` | Wrapper only |

### Tier 8 — Forms, dialogs, subscription

| Component | Path | Modification intent |
|-----------|------|---------------------|
| **`SubscriptionAdminFormFields`** | `client/src/components/admin/subscription/SubscriptionAdminFormFields.tsx` | Labels RTL; dates/numbers LTR |
| **`SubscriptionSummaryPreview`** | `client/src/components/admin/subscription/SubscriptionSummaryPreview.tsx` | Definition list alignment |
| **`SecurityAccountControlsSection`** | `client/src/components/admin/domains/security/SecurityAccountControlsSection.tsx` | Dialog form fields |
| **`SecurityRolesSection`** | `client/src/components/admin/domains/security/SecurityRolesSection.tsx` | Inline governance UI in accounts |
| Account/tenant **dialogs** (inside CS sections) | `CustomerSuccessAccountsSection.tsx`, `CustomerSuccessTenantsSection.tsx` | Modal content inherits shell; verify field `dir` |

### Tier 9 — Placeholders & misc

| Component | Path | Modification intent |
|-----------|------|---------------------|
| **`AdminRoutePlaceholderSection`** | `client/src/components/admin/sections/placeholder/AdminRoutePlaceholderSection.tsx` | Card copy + chevron policy |
| **`AdminKPISection`** | `client/src/components/admin/layout/AdminKPISection.tsx` | Legacy KPI wrapper if still referenced |
| **`AdminPageShell`** | `client/src/components/admin/layout/AdminPageShell.tsx` | **Not routed** — align only if revived; low priority |
| **`OverviewQuickActionsSection` chevron** | — | Align with workspace-end chevron convention |

### Tier 10 — Page hosts (no logic change expected)

| Page | Path | Notes |
|------|------|-------|
| `AdminDashboardHome` | `pages/admin/AdminDashboardHome.tsx` | Inherits shell |
| `AdminCommercialPage` | `pages/admin/AdminCommercialPage.tsx` | Inherits shell |
| `AdminAnalyticsPage` | `pages/admin/AdminAnalyticsPage.tsx` | Inherits shell |
| `AdminManagement` | `pages/AdminManagement.tsx` | Inherits shell + tabs |
| `AdminSectionPlaceholder` | `pages/admin/AdminSectionPlaceholder.tsx` | Inherits shell |
| All `placeholderPages` | `pages/admin/placeholderPages.tsx` | Inherits shell |

### Documentation (post-implementation)

| Artifact | Purpose |
|----------|---------|
| `ADMIN-RTL-WORKSPACE-IMPLEMENTATION.md` | Completion report (future) |
| `launchReadinessDomain.ts` / `reportsDomain.ts` | Optional asset metadata note for workspace policy |

---

## 2. Direction Boundaries (Layer-by-Layer)

| Layer | Current behavior | Target behavior | Implementation location |
|-------|------------------|-----------------|-------------------------|
| **Document root** | `html[dir=rtl]` when Arabic (`LanguageContext`) | **Unchanged** for tenant app | `LanguageContext.tsx` — no change required if shell isolates |
| **Admin shell** | Inherits document RTL | **`dir="ltr"`** workspace geometry | `AdminOperationsShell.tsx` — `SidebarInset` or inner wrapper |
| **Sidebar** | Fixed `left-0`; `text-left` menu buttons | Stay left; Arabic labels **RTL text** on label spans | `AdminDashboardSidebar.tsx`; optional `sidebar.tsx` audit |
| **SidebarInset / main** | RTL block flow | LTR block flow | `AdminOperationsShell.tsx` |
| **Top chrome header** | Breadcrumbs flip to inline-start (right in AR) | Breadcrumbs at **workspace-start** (left) | Shell boundary + inherit |
| **Page title row** | Title right in AR; actions mirrored | Title **workspace-start**; actions **workspace-end** | `AdminOperationsShell.tsx` title block |
| **Breadcrumbs** | Position follows document RTL | Workspace-start; Arabic text RTL | `AdminShellBreadcrumbs.tsx` — text `dir` on items |
| **Tabs (`opsTabList`)** | `self-start` → right in AR | **Workspace-start** (left) always | `adminDashStyles.ts` + shell LTR |
| **AdminSection header** | `justify-between` mirrors in AR | Title cluster start; actions end — **stable in both locales** | `AdminSection.tsx` |
| **AdminPageSection titles** | RTL inherited from document | Title text RTL; block anchored start | `AdminPageSection.tsx` |
| **KPI grids** | Grid flow mirrors in AR | **LTR column order** (card 1 → N left to right) | Shell + `ReportsHomeKpiSection`, `CommercialOverviewExecutiveKpis`, `StatisticsPanel` |
| **KPI values** | Often `dir="ltr"` already | **Always LTR** | `AdminStatCard`, commercial widgets — preserve |
| **KPI labels** | RTL from document | **RTL text**, workspace-start in card header | `AdminStatCard.tsx` title node |
| **Attention cards** | Grid + headers mirror | LTR grid; RTL labels | `CommercialOverviewNeedsAttention.tsx` |
| **Quick action rows** | Icon/label flip in AR | **Icon start → label → chevron end** | `OverviewQuickActionsSection.tsx`, `opsListRow` |
| **Chevron / ArrowRight** | `rotate-180` when `language === "en"` | **Workspace-end points right** in both locales — remove EN-only hack | `OverviewQuickActionsSection.tsx`, `NavShortcutCard.tsx`, `AdminRoutePlaceholderSection.tsx` |
| **Operations toolbar** | Search/filter order mirrors | Search → filter → actions **left to right** | `OperationsTabFrame.tsx`, `ResponsiveOperationsBar.tsx` |
| **Tables** | `text-start` flips to right in AR doc | **`text-start` = workspace-start (left)**; Arabic names RTL in cell | Shell LTR + existing `opsTableHead` / cell `dir` |
| **Table emails/dates** | `dir="ltr"` on many cells | **Preserve LTR** | `CustomerSuccessAccountsSection.tsx`, `CustomerSuccessTenantsSection.tsx` |
| **Forms — labels** | Mirror with document | Above/leading at workspace-start; RTL Arabic text | Subscription + security form components |
| **Forms — inputs** | Mixed | Email/URL/date **`dir="ltr"`**; Arabic name fields RTL/auto | CS tenants/accounts dialogs |
| **Search inputs** | Icon `end-2.5` (logical) | Unchanged — logical positioning works in LTR workspace | Accounts toolbar |
| **Dialogs** | Inherit document RTL | Inherit **shell LTR** when opened from admin | Radix portals — verify portal parent; may need `dir` on dialog content |
| **Drawers / mobile sidebar** | Sheet `side` from sidebar default | **Start-side sheet** under workspace LTR | `sidebar.tsx` mobile path — verify |
| **Status badges** | Text RTL | RTL Arabic text; position in row unchanged | `CommercialStatusBadge.tsx` |
| **Charts (Analytics)** | Recharts container inherits RTL | LTR workspace; axis numerics LTR | `StatisticsPanel.tsx` — verify chart layout |
| **Placeholder cards** | Centered card, RTL text right-heavy | Workspace-start copy inside card | `AdminRoutePlaceholderSection.tsx` |

---

## 3. Blast Radius

### HIGH

| Component / area | Reason |
|------------------|--------|
| **`AdminOperationsShell`** | Single boundary affects all 10 admin routes |
| **`AdminSection`** | Used across Commercial, Overview attention, CS sections |
| **`AdminStatCard`** | Overview KPIs + commercial executive KPIs |
| **`/admin` Overview (OCC-MVP)** | Highest visibility AR pain — KPI + attention + actions |
| **`/admin/commercial`** | Many section headers and widget grids |
| **Dialog portals** | May escape shell `dir` if not explicitly set |

### MEDIUM

| Component / area | Reason |
|------------------|--------|
| **`adminDashStyles` tokens** | Tabs, list rows, tables — shared across Operations + Overview |
| **`OperationsTabFrame` + Accounts** | Regression-sensitive baseline |
| **`CustomerSuccessTenantsSection`** | Tables + multi-field dialogs |
| **`StatisticsPanel`** | KPI grids + charts + table |
| **`CommercialOverview*` widgets** | Card header rows |
| **`OverviewQuickActionsSection`** | Chevron policy change |
| **`sidebar.tsx` primitives** | Physical CSS if shell wrapper insufficient |
| **Security inline controls** | Embedded in accounts table |

### LOW

| Component / area | Reason |
|------------------|--------|
| **`AdminShellBreadcrumbs`** | Inherits shell; minor text `dir` |
| **`AdminPageSection`** | Thin wrapper |
| **`AdminDashboardSidebar`** | Layout unchanged; label text only |
| **Placeholder pages** | Inherit shell automatically |
| **Deprecated overview nav** | Unmounted — no user impact |
| **`AdminPageShell`** | Not routed |
| **`ReportsExportActions`** | Header actions cluster |
| **Domain registry metadata** | Documentation only |

---

## 4. Rollout Order

### Phase 1 — Shell boundary (critical path)

**Goal:** Admin workspace geometry is LTR regardless of `html[dir]`.

| Step | Target | Outcome |
|------|--------|---------|
| 1.1 | `AdminOperationsShell` | `dir="ltr"` on workspace wrapper (`SidebarInset` content tree or equivalent) |
| 1.2 | Verify sidebar remains physical left | No `side` prop change |
| 1.3 | Smoke test all admin routes in Arabic | Titles should move to workspace-start immediately |

**Exit criteria:** Arabic `/admin` page title appears beside sidebar, not viewport-right.

---

### Phase 2 — Layout primitives

**Goal:** Section and card internals match design invariants.

| Step | Target |
|------|--------|
| 2.1 | `AdminSection` — stable header row |
| 2.2 | `AdminStatCard` — title RTL text, header row stable |
| 2.3 | `AdminPageSection` — heading/description text direction |
| 2.4 | `adminDashStyles` — `opsTabList` workspace-start; review `opsListRow` |

**Exit criteria:** Overview Needs Attention title + View Accounts buttons on designed row in Arabic.

---

### Phase 3 — Header & chrome

**Goal:** Top bar and page header match design header strategy.

| Step | Target |
|------|--------|
| 3.1 | `AdminOperationsShell` title/actions row — confirm workspace-end actions |
| 3.2 | `AdminShellBreadcrumbs` — Arabic breadcrumb text RTL |
| 3.3 | `AdminDashboardSidebar` — nav label text direction |
| 3.4 | Operations `TabsList` visual anchor left in Arabic |

**Exit criteria:** Breadcrumbs + title cluster left; home icon remains workspace-end.

---

### Phase 4 — Overview command center

**Goal:** OCC-MVP surfaces validated as reference card-grid console.

| Step | Target |
|------|--------|
| 4.1 | `ReportsHomeKpiSection` |
| 4.2 | `OverviewNeedsAttentionSection` + `CommercialOverviewNeedsAttention` |
| 4.3 | `OverviewQuickActionsSection` — chevron policy |
| 4.4 | Remove obsolete `language === "en" && rotate-180` where workspace LTR makes it redundant |

**Exit criteria:** KPI strip flows left → right; quick actions icon → label → chevron in both locales.

---

### Phase 5 — Operations verification

**Goal:** No regression on strongest UX baseline.

| Step | Target |
|------|--------|
| 5.1 | `OperationsTabFrame` toolbar order |
| 5.2 | `CustomerSuccessAccountsSection` desktop table + mobile cards |
| 5.3 | `CustomerSuccessTenantsSection` |
| 5.4 | `CustomerSuccessCommunicationsSection` |

**Exit criteria:** Accounts search → filter order unchanged in Arabic; column order identical EN/AR.

---

### Phase 6 — Commercial & Analytics

**Goal:** Section-heavy pages inherit primitives correctly.

| Step | Target |
|------|--------|
| 6.1 | Commercial section stack (`ReportsCommercialPageContent` children) |
| 6.2 | `CommercialOverview*` widgets |
| 6.3 | `StatisticsPanel` |

**Exit criteria:** Commercial executive + attention + health sections stable in Arabic.

---

### Phase 7 — Forms, dialogs, security embeds

**Goal:** Data fields stay LTR; labels RTL.

| Step | Target |
|------|--------|
| 7.1 | Subscription admin forms |
| 7.2 | Tenant create/edit dialogs |
| 7.3 | Security dialogs in accounts |
| 7.4 | **Dialog portal `dir` audit** — ensure modals inherit workspace LTR |

**Exit criteria:** Email/date fields LTR in Arabic admin dialogs; labels readable RTL.

---

### Phase 8 — Sweep & documentation

| Step | Action |
|------|--------|
| 8.1 | Placeholder routes visual pass |
| 8.2 | `npm run check` + `npm test` |
| 8.3 | Write `ADMIN-RTL-WORKSPACE-IMPLEMENTATION.md` |
| 8.4 | Optional: note in `ADMIN-RTL-WORKSPACE-DESIGN.md` status → implemented |

---

## 5. Risk Analysis

### Layout risks

| Risk | Severity | Mitigation in plan |
|------|----------|-------------------|
| Shell `dir=ltr` insufficient for portaled dialogs | **Medium** | Phase 7 portal audit |
| shadcn sidebar physical `left-0` conflicts with future RTL mirror attempts | **Low** | Design forbids mirror — no change |
| `mx-auto` columns look asymmetric in AR | **Low** | Expected — workspace-start anchor is the fix |
| Double-`dir` conflict (shell LTR + Arabic text without `dir=rtl`) | **Medium** | Explicit text `dir` on Arabic copy nodes in primitives |

### RTL regressions

| Risk | Severity | Mitigation |
|------|----------|------------|
| Arabic labels render LTR glyphs | **Medium** | Phase 2 text `dir` on titles/descriptions |
| Tenant app accidentally gets LTR shell | **High** if mis-scoped | Boundary **only** inside `AdminOperationsShell` — never on `LanguageProvider` root |
| Removing `rotate-180` breaks EN chevrons | **Low** | Workspace LTR → chevron always workspace-end |

### Table risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Column order appears reversed | **Low** if shell LTR | Phase 5 regression on Accounts |
| Arabic names display incorrectly in cells | **Medium** | `dir=auto` on name cells where needed |
| Action buttons clip in actions cell | **Low** | Visual pass on accounts actions column |

### Form risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Date inputs break in Arabic locale | **Medium** | Keep `subscription-date-input-ltr` pattern |
| Email fields display RTL | **High** for usability | Preserve explicit `dir="ltr"` |
| Dialog form layout mirrored | **Medium** | Portal `dir` in Phase 7 |

### Mobile risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Mobile sidebar sheet opens wrong side | **Medium** | Verify `SheetContent side` in `sidebar.tsx` under workspace LTR |
| Stacked toolbar wraps incorrectly | **Low** | Operations communications + accounts mobile pass |
| KPI grid single-column — acceptable | **None** | Already `grid-cols-1` below `lg` |

---

## 6. Validation Plan

### Arabic verification checklist

Apply with `app-language=ar` (default) on desktop (≥1024px) and mobile (<768px).

| # | Check | Routes |
|---|-------|--------|
| A1 | Sidebar remains on **left** | All admin routes |
| A2 | Breadcrumbs begin **near sidebar**, not viewport-right | All |
| A3 | Page `h1` aligns **workspace-start** (left of content column) | All |
| A4 | Header actions appear on **workspace-end** (right of workspace), not far left | Commercial (export), Overview attention |
| A5 | Operations tabs anchored **left** | `/admin/operations` |
| A6 | KPI strip reads **left → right** (card 1 is leftmost) | `/admin`, `/admin/commercial`, `/admin/analytics` |
| A7 | KPI **values** are LTR numerals | `/admin` |
| A8 | KPI **labels** are readable Arabic (RTL glyphs) | `/admin` |
| A9 | Needs Attention title + buttons on **one logical row** (title start, buttons end) | `/admin` |
| A10 | Quick actions: **icon left**, chevron **right** | `/admin` |
| A11 | Accounts table column order: identity → classification → subscription → details → actions | `/admin/operations` |
| A12 | Search field **before** classification filter (left to right) | `/admin/operations` |
| A13 | Email cells LTR | Operations accounts/tenants |
| A14 | Commercial section titles workspace-start | `/admin/commercial` |
| A15 | Placeholder card copy workspace-start, not floating right | `/admin/health` |
| A16 | Dialog forms: labels Arabic RTL, email/date LTR | Create tenant, edit subscription |
| A17 | No horizontal scroll regression on tables | Operations accounts |
| A18 | Document root may still be `html[dir=rtl]` — **tenant routes unaffected** | `/dashboard` spot check |

### English verification checklist

| # | Check | Routes |
|---|-------|--------|
| E1 | No visual regression vs current English admin | All |
| E2 | Sidebar, breadcrumbs, titles unchanged in position | All |
| E3 | Operations accounts table identical to pre-change baseline | `/admin/operations` |
| E4 | Overview OCC-MVP structure unchanged (3 sections only) | `/admin` |
| E5 | Chevrons point **right** on quick actions | `/admin` |
| E6 | `npm run check` passes | CI |
| E7 | `npm test` passes | CI |

### Operations verification (reference model)

| # | Check |
|---|-------|
| O1 | Toolbar card spans full `operationsCard` width |
| O2 | List card table fills width at `lg+` |
| O3 | Mobile card list identity block readable |
| O4 | Tab switch accounts → tenants → communications — no layout jump between locales |
| O5 | Row actions reachable and not mirrored under Arabic |

### Overview verification

| # | Check |
|---|-------|
| V1 | Executive Snapshot → Needs Attention → Quick Actions order preserved |
| V2 | Attention cards drill to accounts |
| V3 | All-clear empty state centered **within card**, copy workspace-start |
| V4 | Section spacing unchanged (UX-REFINE density) |

### Commercial verification

| # | Check |
|---|-------|
| C1 | Executive → metadata → CS health/attention → plan distribution order preserved |
| C2 | Export actions in header workspace-end |
| C3 | Metadata panel label/value rows readable in Arabic |
| C4 | Health + attention grids LTR column flow |

---

## 7. Success Criteria

### Objective completion criteria

| ID | Criterion | Measurable |
|----|-----------|------------|
| SC-1 | All `/admin/*` routes render inside **workspace LTR** boundary | `AdminOperationsShell` sets `dir="ltr"` on workspace tree |
| SC-2 | Arabic page titles anchor **workspace-start** on all admin pages | Visual A3 passes |
| SC-3 | Arabic and English share **identical** table column order on Operations | O5 + A11 pass |
| SC-4 | Arabic and English share **identical** toolbar control order | A12 passes |
| SC-5 | KPI grids flow **left → right** in Arabic | A6 passes |
| SC-6 | Numeric/email/date fields remain **LTR** in Arabic admin | A7, A13, A16 pass |
| SC-7 | Arabic UI copy remains **RTL-readable** | A8, A14 pass |
| SC-8 | Operations UX **no regression** in English | E3, O1–O5 pass |
| SC-9 | OCC-MVP **IA unchanged** (3 sections, no nav grids) | V1 passes |
| SC-10 | UX-REFINE **visual tokens unchanged** (no color/card redesign) | Design review — spacing/colors diff-free |
| SC-11 | Tenant/non-admin routes **unchanged** | A18 passes |
| SC-12 | `npm run check` + `npm test` **pass** | CI green |
| SC-13 | Design invariants INV-1 through INV-8 from `ADMIN-RTL-WORKSPACE-DESIGN.md` satisfied | Checklist mapping |

### Non-goals (explicit)

- Mirroring sidebar to the right  
- Changing `LanguageContext` global `html[dir]` behavior for the whole app  
- Commercial authority / API / routing changes  
- ADMIN-SECURITY-CENTER feature work  
- New visual design system  

---

## 8. Implementation Constraints (from approved design)

| Rule | Enforcement |
|------|-------------|
| Sidebar remains left | No `side="right"` on `AdminDashboardSidebar` |
| Workspace LTR geometry | Shell boundary only |
| Arabic text RTL | Text nodes in primitives and headings |
| Data LTR | Preserve existing `dir="ltr"` on values |
| Titles workspace-start | No `text-right` on page/section titles |
| Headers do not flip | Stable `justify-between` under LTR workspace |
| Operations is reference | Phase 5 before declaring complete |
| Before Security Center | Program sequencing per design §10 |

---

## 9. Rollback Plan

| Trigger | Action |
|---------|--------|
| Critical Arabic layout break | Revert shell `dir` boundary (single file) |
| Dialog regression | Revert Phase 7 portal changes only |
| Operations table break | Revert shell + table-specific changes |

Domain logic, OCC-MVP data wiring, and commercial snapshots are **out of rollback scope** — they should not be touched.

---

## 10. Program Sequencing

```
ADMIN-RTL-WORKSPACE (this plan)
        ↓
ADMIN-SECURITY-CENTER (new UI inherits workspace-first)
        ↓
ADMIN-HEALTH-CENTER / LAUNCH-READINESS-CENTER
```

---

## Appendix — File Change Summary (estimated)

| Files touched (estimate) | Count |
|--------------------------|-------|
| Mandatory (Phases 1–2) | 4–6 |
| Overview + commercial widgets (Phases 4–6) | 10–15 |
| Operations + forms (Phases 5–7) | 5–8 |
| Chevron cleanup | 3 |
| Documentation | 1–2 |
| **Total** | **~20–30 files** |

**Single highest-leverage change:** `AdminOperationsShell.tsx` (Phase 1).

---

*Implementation planning only. This document is the execution blueprint for the ADMIN-RTL-WORKSPACE implementation phase. No code included.*
