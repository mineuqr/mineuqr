# Admin RTL Workspace — Phase 1 Implementation

**Project:** MineuQR  
**Program:** ADMIN-RTL-WORKSPACE  
**Phase:** 1 — Shell boundary only  
**Date:** 2026-06-10  
**Authority:** `ADMIN-RTL-WORKSPACE-DESIGN.md`, `ADMIN-RTL-WORKSPACE-IMPLEMENTATION-PLAN.md`

---

## Summary

Phase 1 establishes the **Workspace-First (Model B)** direction boundary at the admin shell entry point. All routes mounted through `AdminOperationsShell` now render inside an **LTR workspace frame** regardless of `html[dir]` when Arabic is active.

**Scope delivered:** Shell boundary only.  
**Scope deferred:** Phases 2–8 (primitives, sections, tables, forms, dialogs).

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/components/admin/layout/AdminOperationsShell.tsx` | Workspace `dir="ltr"` boundary; `lang` from `useLanguage`; policy comment |

**Total:** 1 file modified.

### Not modified (per phase scope)

- `AdminSection`, `AdminStatCard`, `AdminPageSection`
- Overview, Commercial, Analytics domain sections
- Operations tables, toolbars, forms
- `LanguageContext` (document `html[dir]` unchanged)
- `AdminDashboardSidebar` / `sidebar.tsx`
- Dialogs and portals

---

## Direction Boundary Introduced

### Policy constant

```ts
const ADMIN_WORKSPACE_DIR = "ltr" as const;
```

### Boundary layers

| Layer | Element | `dir` | `lang` | Purpose |
|-------|---------|-------|--------|---------|
| **Admin console root** | Shell flex wrapper (`adminDash.shell` + `flex`) | `ltr` | `language` | Locks flex order (sidebar peer left, inset right); defines Zone 2 |
| **Workspace inset** | `SidebarInset` | `ltr` | `language` | Explicit workspace framing for header, title block, and `<main>` |

### Content origin policy

| Rule | Phase 1 behavior |
|------|------------------|
| **Workspace geometry** | LTR for all children of `AdminOperationsShell` |
| **Document root** | Unchanged — `html[dir=rtl]` still set when Arabic for tenant/marketing routes |
| **Sidebar position** | Unchanged — `side="left"`, `fixed left-0` (no prop changes) |
| **Hierarchy anchor** | Inline-start = **left edge of inset** (workspace-start beside sidebar gap) |
| **Arabic UI strings** | Still Arabic via i18n; glyph direction inherits from strings until Phase 2 text `dir` |
| **Numeric/data fields** | Unchanged — existing per-field `dir="ltr"` preserved in child components |

### Routes affected (automatic inheritance)

All pages using `AdminOperationsShell`:

- `/admin`
- `/admin/commercial`
- `/admin/analytics`
- `/admin/operations` (+ `?tab=tenants`, `?tab=communications`)
- `/admin/customer-success`
- `/admin/health`
- `/admin/security`
- `/admin/reports`
- `/admin/launch-readiness`

---

## Architecture Diagram (post Phase 1)

```
html[dir=rtl]  (unchanged — global LanguageContext)
└── App
    └── /admin/*
        └── SidebarProvider
            └── div[dir=ltr lang=ar|en]     ← NEW Zone 2 boundary
                ├── AdminDashboardSidebar   (physical left, inside LTR flex)
                └── SidebarInset[dir=ltr]   ← NEW workspace frame
                    ├── header (breadcrumbs, home)
                    ├── title block
                    └── main → page children
```

---

## Risks Discovered

| Risk | Severity | Status after Phase 1 |
|------|----------|----------------------|
| **Dialog portals** may render outside `SidebarInset` and inherit `html[dir=rtl]` | Medium | **Open** — deferred to Phase 7 |
| **Arabic labels** without explicit text `dir` may render with ambiguous bidi inside LTR workspace | Low–medium | **Partially improved** — layout anchor fixed; Phase 2 adds text `dir` on primitives |
| **Tenant routes** accidentally scoped to LTR | High if mis-scoped | **Mitigated** — boundary only inside `AdminOperationsShell` |
| **Sidebar nav label readability** in Arabic inside LTR chrome | Low | **Acceptable** — Arabic strings still display; Phase 3 may add label `dir` |
| **Chevron `rotate-180` language hacks** in child components | Low | **Open** — redundant under LTR workspace; cleanup in Phase 4 |
| **Flex order** with document RTL on parent App | Medium | **Mitigated** — shell flex wrapper now `dir=ltr` |

No regressions detected in automated validation.

---

## Validation Results

### Automated

| Command | Result |
|---------|--------|
| `npm run check` | **PASS** — `tsc --noEmit` |
| `npm test` | **PASS** — 90 files, 639 passed, 2 skipped |

### Phase 1 exit criteria (from implementation plan)

| Criterion | Expected | Status |
|-----------|----------|--------|
| Shell sets workspace `dir=ltr` | Yes | **Done** |
| Sidebar remains physical left | No `side` change | **Done** |
| Arabic page title at workspace-start | Beside sidebar, not viewport-right | **Expected** — requires manual browser verify; layout policy in place |

### Manual verification checklist (recommended)

Apply with `app-language=ar` on desktop:

| # | Check | Expected post Phase 1 |
|---|-------|----------------------|
| M1 | Sidebar on **left** | Yes |
| M2 | Breadcrumbs begin **left** of inset (near sidebar) | Yes |
| M3 | Page `h1` at **workspace-start** (left of content column) | Yes |
| M4 | Home icon remains **right** of top chrome | Yes |
| M5 | Tenant `/dashboard` still uses document RTL | Yes — unchanged |
| M6 | Operations accounts table column order unchanged | Yes — LTR workspace preserves order |

---

## What Phase 1 Does Not Fix Yet

These remain for later phases:

- `AdminSection` title/action row text direction tuning
- `AdminStatCard` header label explicit RTL
- `opsTabList` / chevron language hacks
- Dialog/modal `dir` inheritance
- Form field label alignment polish
- Explicit Arabic `dir` on breadcrumb/title text nodes

---

## Rollback

Revert `client/src/components/admin/layout/AdminOperationsShell.tsx` to remove `dir`, `lang`, and `useLanguage` import. Single-file rollback restores pre-Phase-1 hybrid model.

---

## Next Phase (not started)

**Phase 2 — Layout primitives:** `AdminSection`, `AdminStatCard`, `AdminPageSection`, `adminDashStyles` token review.

---

*Phase 1 complete. Stopped before Phase 2 per program instructions.*
