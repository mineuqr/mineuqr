# Overview & Reports Layout Alignment Audit

**Program:** ADMIN-DASHBOARD-UX-REFINE-1  
**Audit type:** Read-only — no code, styling, or implementation changes  
**Date:** 2026-06-10  
**Reference baseline:** `/admin/operations` (Accounts tab) and `/admin/operations?tab=tenants` (Tenants tab)

---

## Executive Summary

All scoped admin routes share the **same outer shell component** (`AdminOperationsShell`). There is **no alternate page shell** in the routed admin tree (`AdminPageShell` exists but is **not mounted** by any route in `App.tsx`).

Visual inconsistency is **not** caused by different top-level layout components. It is caused by **inconsistent shell prop configuration** (compact / narrowContent / spacing) and **different inner workspace wrappers** (Operations console vs dashboard sections vs analytics panels vs placeholders).

`/admin/tenants` is not a separate layout — it **redirects** to `/admin/operations?tab=tenants` and therefore inherits the Operations layout entirely.

---

## AUDIT-1 — Layout Architecture Inventory

### Shared outer architecture (all pages)

| Layer | Component | Strategy |
|-------|-----------|----------|
| Root shell | `AdminOperationsShell` | `SidebarProvider` → `adminDash.shell` gradient → `AdminDashboardSidebar` + `SidebarInset` |
| Top chrome | Sticky bar (`h-14`) | `AdminShellBreadcrumbs` + Home link |
| Page header block | Title region inside shell | `border-b border-cyan-500/20`, horizontal padding `px-4 sm:px-6 lg:px-8` |
| Content wrapper | `<main>` inside shell | `contentMax` + `px-4 sm:px-6 lg:px-8` + vertical rhythm from `compact` flag |
| Width token | `contentMax` | `narrowContent ? adminDash.opsShellMax (max-w-5xl) : max-w-7xl` |

### Per-page inventory

#### `/admin` — Overview

| Attribute | Value |
|-----------|-------|
| Route component | `AdminDashboardHome` (`pages/admin/AdminDashboardHome.tsx`) |
| Shell | `AdminOperationsShell` |
| Shell props | `compact`, `headerActions={<ReportsStatusIndicator compact />}`, `className={adminDash.overviewMain}` |
| `narrowContent` | **false** → `max-w-7xl` |
| Subtitle | **none** (not passed) |
| `statusIndicator` | **none** |
| `headerFooter` | **none** |
| Workspace wrapper | `OverviewDashboardSections` → `LaunchReadinessOverviewComposition` (`overviewWorkspace`) |
| Inner sections | `ReportsHomeKpiSection` (`AdminPageSection`), `OverviewFeaturedShortcutsSection`, `OverviewAllSectionsSection` (`NavShortcutCard` grid) |
| Container strategy | Section stacks with `AdminPageSection` (`space-y-2` tight); KPI grid + shortcut cards — **no** `OperationsTabFrame` |

#### `/admin/operations` — Operations (baseline)

| Attribute | Value |
|-----------|-------|
| Route component | `AdminManagement` (`pages/AdminManagement.tsx`) |
| Shell | `AdminOperationsShell` |
| Shell props | `compact`, `narrowContent`, `headerFooter={<TabsList>}` |
| `narrowContent` | **true** → `max-w-5xl` (`adminDash.opsShellMax`) |
| Subtitle | **none** |
| `headerActions` | **none** |
| `statusIndicator` | **none** |
| Workspace wrapper | `Tabs` / `TabsContent` per tab |
| Inner sections | `CustomerSuccessAccountsSection`, `CustomerSuccessTenantsSection`, `CustomerSuccessCommunicationsSection` |
| Container strategy | `OperationsTabFrame` → `adminDash.opsWorkspace` (`space-y-1.5`) + `adminDash.operationsCard` toolbar/list cards |

#### `/admin/tenants` — Tenants

| Attribute | Value |
|-----------|-------|
| Route component | `AdminTenantsPage` → `AdminLegacyRedirect` → `/admin/operations?tab=tenants` |
| Effective layout | **Identical to Operations Tenants tab** (`CustomerSuccessTenantsSection` inside `OperationsTabFrame`) |

#### `/admin/commercial` — Commercial

| Attribute | Value |
|-----------|-------|
| Route component | `AdminCommercialPage` (`pages/admin/AdminCommercialPage.tsx`) |
| Shell | `AdminOperationsShell` |
| Shell props | Default (`compact=false`, `narrowContent=false`) |
| Subtitle | **yes** (`shell.subtitle` from route metadata) |
| `headerActions` | `ReportsExportActions` |
| Workspace wrapper | `ReportsCommercialBody` → `ReportsCommercialPageContent` |
| Inner sections | `ReportsExecutiveSection`, `ReportsMetadataSection`, `CustomerSuccessCommercialSections`, `ReportsPlanDistributionSection` — each wrapped in `AdminSection` (`space-y-4`) |
| Container strategy | Loose vertical stack; shell main uses **`space-y-8 py-6 sm:py-8`** |

#### `/admin/analytics` — Analytics

| Attribute | Value |
|-----------|-------|
| Route component | `AdminAnalyticsPage` (`pages/admin/AdminAnalyticsPage.tsx`) |
| Shell | `AdminOperationsShell` |
| Shell props | Default (`compact=false`, `narrowContent=false`) |
| Subtitle | **yes** |
| Workspace wrapper | `ReportsAnalyticsSection` → `StatisticsPanel` |
| Container strategy | Root `div.space-y-8`; multiple `adminDash.card` / `adminDash.kpiCard` blocks with section H2s — **no** `OperationsTabFrame` |

#### `/admin/health`, `/admin/security`, `/admin/reports`, `/admin/launch-readiness`

| Attribute | Value |
|-----------|-------|
| Route component | `createPlaceholderPage(routeId)` → `AdminSectionPlaceholder` |
| Shell | `AdminOperationsShell` |
| Shell props | Default (`compact=false`, `narrowContent=false`) |
| Subtitle | **yes** (from route `descriptionKey` / `pageSubtitleKey`) |
| `statusIndicator` | `PlaceholderComingSoonIndicator` (rendered **below** title block with `mt-4`) |
| Workspace wrapper | `LaunchReadinessPlaceholderSection` → `AdminRoutePlaceholderSection` |
| Container strategy | Single `adminDash.card` placeholder; shell main **`space-y-8 py-6 sm:py-8`** |

---

## Layout Matrix

| Page | Shell | Workspace | Header | Match Operations |
|------|-------|-----------|--------|------------------|
| `/admin` (Overview) | `AdminOperationsShell` | `LaunchReadinessOverviewComposition` + `AdminPageSection` | Compact title; badges in `headerActions`; no subtitle | **DIFFERENT** |
| `/admin/operations` | `AdminOperationsShell` | `OperationsTabFrame` + tab sections | Compact title; `headerFooter` tabs; `narrowContent` | **MATCH** (baseline) |
| `/admin/tenants` | Redirect → Operations | Same as Operations Tenants tab | Same as Operations | **MATCH** |
| `/admin/commercial` | `AdminOperationsShell` | `AdminSection` stack via Reports | Default title (`pageTitle`); subtitle; export actions | **DIFFERENT** |
| `/admin/analytics` | `AdminOperationsShell` | `StatisticsPanel` (`space-y-8`) | Default title; subtitle | **DIFFERENT** |
| `/admin/health` | `AdminOperationsShell` | `AdminRoutePlaceholderSection` | Default title; subtitle; `statusIndicator` strip | **DIFFERENT** |
| `/admin/security` | `AdminOperationsShell` | `AdminRoutePlaceholderSection` | Same as Health | **DIFFERENT** |
| `/admin/reports` | `AdminOperationsShell` | `AdminRoutePlaceholderSection` | Same as Health | **DIFFERENT** |
| `/admin/launch-readiness` | `AdminOperationsShell` | `AdminRoutePlaceholderSection` | Same as Health | **DIFFERENT** |

---

## AUDIT-2 — Workspace Comparison (vs Operations)

| Criterion | Operations | Overview | Commercial | Analytics | Placeholders (Health/Security/Reports/Launch) |
|-----------|------------|----------|------------|-----------|-----------------------------------------------|
| Same workspace structure? | `OperationsTabFrame` | `AdminPageSection` + card grid | `AdminSection` sections | `StatisticsPanel` div | Single placeholder card |
| Same content container? | `operationsCard` | `adminDash.card` (shortcuts/KPI) | Cards inside `AdminSection` | `adminDash.card` / `kpiCard` | `adminDash.card` |
| Same width constraints? | `max-w-5xl` | `max-w-7xl` | `max-w-7xl` | `max-w-7xl` | `max-w-7xl` |
| Same alignment? | Centered `mx-auto` | Centered `mx-auto` | Centered `mx-auto` | Centered `mx-auto` | Centered `mx-auto` |
| Same responsive strategy? | Table + mobile list in card | Responsive grids | Responsive grids | Chart grids | Single card |
| **Verdict** | Baseline | **DIFFERENT** | **DIFFERENT** | **DIFFERENT** | **DIFFERENT** |

**Tenants:** **MATCH** (same Operations workspace via redirect).

---

## AUDIT-3 — Header Architecture (vs Operations)

| Element | Operations | Overview | Commercial | Analytics | Placeholders |
|---------|------------|----------|------------|-----------|--------------|
| Breadcrumbs | Yes (`resolveAdminPageShell`) | Yes | Yes | Yes | Yes |
| Title placement | Compact H1 in header block | Compact H1 | Default H1 (`text-2xl sm:text-3xl`) | Default H1 | Default H1 |
| Subtitle | None | None | Yes (`pageSubtitle`) | Yes | Yes (route description) |
| Actions placement | None | `headerActions` (badge legend) | `headerActions` (export) | None | None |
| Status indicators | None | Inline badges (not `statusIndicator`) | None | None | `statusIndicator` below title (`mt-4`) |
| Header container padding | `py-2 sm:py-3` (compact) | `py-2 sm:py-3` (compact) | `py-6` (default) | `py-6` | `py-6` |
| Secondary nav | `headerFooter` tab list | None | None | None | None |
| **Verdict** | Baseline | **DIFFERENT** (badges vs tabs; wider content) | **DIFFERENT** | **DIFFERENT** | **DIFFERENT** |

---

## AUDIT-4 — Content Positioning

| Attribute | Operations / Tenants | Overview | Commercial / Analytics / Placeholders |
|-----------|---------------------|----------|--------------------------------------|
| Where content begins | After compact header + tab row; main `py-2 sm:py-3` | After compact header; main `py-2 sm:py-3` (via `overviewMain`) | After default header (+ status strip on placeholders); main `py-6 sm:py-8` |
| Horizontal alignment | `mx-auto`, symmetric padding | Same, but **wider** container | Same, **wider** container |
| Available content width | **896px cap** (`max-w-5xl`) | **1280px cap** (`max-w-7xl`) | **1280px cap** |
| Left/right spacing | `px-4 sm:px-6 lg:px-8` | Same | Same |
| RTL behavior | Inherited app `dir`; logical padding (`px-4`, `me-2`, `text-start`) — **no page-specific RTL overrides** | Same | Same |
| Vertical rhythm between blocks | `space-y-1.5` (ops workspace) | `space-y-3` (overview workspace) | `space-y-8` (shell main + inner sections) |

**Key positioning differences:**

1. Operations content is **~384px narrower** than other pages at `lg` breakpoint.
2. Non-operations pages add **extra header chrome** (subtitle, and/or status strip) before main content.
3. Non-operations main areas use **2–4× more vertical padding** (`py-6 sm:py-8` vs `py-2 sm:py-3`).
4. Overview is closest to Operations on header density but still uses the **wide container** and **dashboard section pattern** instead of `OperationsTabFrame`.

---

## AUDIT-5 — Root Cause Analysis

### What is shared?

- **Single shell component:** `AdminOperationsShell` for every scoped route.
- **Same sidebar:** `AdminDashboardSidebar`.
- **Same breadcrumb chrome:** `AdminShellBreadcrumbs` in sticky top bar.
- **Same horizontal padding tokens:** `px-4 sm:px-6 lg:px-8`.
- **Same Pricing-aligned visual tokens:** `adminDashStyles` (UXR-1B).

### What is different?

| Factor | Evidence | Impact |
|--------|----------|--------|
| **C — Header architecture** | Only Operations (+ Overview partial) use `compact`. Commercial, Analytics, placeholders use default `pageTitle` + subtitle. Placeholders add `statusIndicator` row. | Hero-like header block on 6 routes; more vertical space before content |
| **D — Width constraints** | Only Operations sets `narrowContent={true}`. All other pages use `max-w-7xl`. | Operations feels centered and dense; others feel full-bleed and loose |
| **B — Container strategy** | Operations uses `OperationsTabFrame` + `operationsCard`. Others use `AdminSection`, `AdminPageSection`, or `StatisticsPanel` with `space-y-8`. | Different card framing, section gaps, and content density |
| **A — Layout architecture** | Same shell, **different prop matrix** — not a second layout system | Configuration drift, not architectural fork |
| **E — Page-level overrides** | Overview alone passes `className={adminDash.overviewMain}` | Overview partially converged (UXR-1C); still diverges on width and inner workspace |

### Primary root cause (ranked)

1. **D — Different width constraints** (`narrowContent` only on Operations) — strongest visual signal for “console vs dashboard”.
2. **C — Different header architecture** (compact/default split, subtitles, status strips) — pushes content down and increases marketing feel.
3. **B — Different container strategy** (OperationsTabFrame vs section stacks) — changes card density and alignment inside the shell.

**Not the primary cause:** A separate layout architecture — all routes already use `AdminOperationsShell`. `AdminPageShell` is unused in production routes.

---

## Findings

### Shared

- One shell (`AdminOperationsShell`), one sidebar, one breadcrumb bar, one token file (`adminDashStyles.ts`).
- Tenants is not a separate layout; it is Operations.

### Different

- **Shell configuration matrix** splits pages into two families:
  - **Console family:** Operations (+ Overview partially) — `compact`, tighter main padding.
  - **Dashboard family:** Commercial, Analytics, Health, Security, Reports, Launch Readiness — default header, `max-w-7xl`, `space-y-8`.
- **Inner workspace components** are domain-specific and were not normalized to `OperationsTabFrame`.

### What creates the visual inconsistency?

Operators perceive Operations/Tenants as “aligned” because they combine **narrow width + compact header + card-in-card workspace**. Overview, Commercial, Analytics, and placeholder routes feel like a **different product area** because they retain **wide layout + tall header block + loose section spacing**, even though the outer shell component is identical.

---

## Root Cause

**Primary source of inconsistency:** **D (width constraints)** and **C (header architecture)**, compounded by **B (inner container strategy)**.

Evidence: `AdminOperationsShell.tsx` lines 53, 77–78, 117–121 — `narrowContent` and `compact` control width and vertical rhythm; only `AdminManagement.tsx` passes both. `AdminCommercialPage.tsx`, `AdminAnalyticsPage.tsx`, and `AdminSectionPlaceholder.tsx` use default shell props (`compact=false`, `narrowContent=false`, `py-6`, `space-y-8`).

---

## Recommendation

### Should Overview, Commercial, Analytics, Health, Security, Reports, and Launch Readiness inherit the Operations Layout Architecture?

**YES**

### Technical justification

1. **Architecture is already unified at the shell layer** — inheritance means propagating the **Operations shell configuration**, not introducing a new layout system.
2. **`narrowContent` + `compact`** are the documented operations console tokens (`UX-REFINE-1A` / `adminDash.opsShellMax`) and are the measurable delta versus other routes.
3. **Overview (UXR-1C) partially adopted console header density** but still uses `max-w-7xl` and dashboard section wrappers — proving convergence is a **prop + workspace alignment** task, not a rebuild.
4. **Placeholder routes** should inherit compact header and spacing even before feature delivery, to avoid a third visual tier.
5. **Exception (narrow):** Analytics chart panels may retain `max-w-7xl` where chart readability benefits from width — but header density and main padding should still match Operations. Width can be the one justified divergence.

**Inheritance scope (recommended):**

| Layer | Inherit from Operations? |
|-------|-------------------------|
| Shell props (`compact`, tighter main padding) | **Yes** — all listed routes |
| `narrowContent` (`max-w-5xl`) | **Yes** — Overview, Commercial, Health, Security, Reports, Launch Readiness |
| `narrowContent` | **Evaluate** — Analytics (charts may need full width) |
| `OperationsTabFrame` inner wrapper | **Where console-like** (lists, KPI strips); not required for full-width chart canvases |
| Subtitle + `statusIndicator` below header | **Reduce or relocate** — match Operations inline/header pattern |

---

## Appendix — Unused layout artifact

`AdminPageShell` (`components/admin/layout/AdminPageShell.tsx`) is exported but **not referenced** by any route in `App.tsx`. It represents a legacy/alternate shell pattern and is not part of the live admin layout split observed in this audit.
