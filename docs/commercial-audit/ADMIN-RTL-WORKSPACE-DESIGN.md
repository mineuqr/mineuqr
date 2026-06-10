# Admin RTL Workspace Design

**Project:** MineuQR  
**Phase:** Read-only design — authoritative reference before implementation  
**Date:** 2026-06-10  
**Status:** Design approved for planning (not implemented)  
**Authority chain:**

| Document | Role |
|----------|------|
| `ADMIN-RTL-WORKSPACE-AUDIT.md` | Problem diagnosis — accidental Model C hybrid |
| `OPERATIONS-EXPERIENCE-AUDIT.md` | Console UX baseline — workspace framing |
| `OCC-MVP-IMPLEMENTATION.md` | Current Overview structure — design must preserve command center IA |

**Out of scope:** Implementation, code, refactors, pseudo-code, file edits beyond this document.

---

## Executive Summary

MineuQR Admin shall adopt **Workspace-First (Model B)** as its canonical direction model.

| Principle | Rule |
|-----------|------|
| **Workspace geometry** | LTR-anchored — persistent left sidebar, hierarchy begins at **workspace-start** (adjacent to sidebar) |
| **Arabic language** | RTL **text** inside the workspace — not mirrored layout chrome |
| **English language** | LTR text inside the same workspace frame |
| **Data primitives** | Always LTR regardless of UI language |
| **Tenant / marketing surfaces** | May continue document-level RTL — **admin is a separate direction zone** |

This design preserves UX-REFINE visual tokens and OCC-MVP information architecture. It changes **spatial policy only**.

---

## Canonical Direction Model

### Three direction zones

```
Zone 1 — Application chrome (tenant, marketing, public)
         → Document direction follows language (existing behavior)

Zone 2 — Admin operator console (all /admin/* routes)
         → Workspace-first LTR frame (NEW policy)

Zone 3 — Embedded content (text, data, media inside Zone 2)
         → Language-dependent text direction + fixed LTR data direction
```

### What remains RTL

| Category | RTL? | Why |
|----------|------|-----|
| Arabic UI copy (labels, titles, descriptions, buttons) | **Yes** — text direction | Correct reading order for Arabic script |
| Arabic paragraph prose in dialogs / empty states | **Yes** | Readability |
| Breadcrumb labels (Arabic strings) | **Yes** — text only | String is Arabic; position stays workspace-start |
| Sidebar nav labels (Arabic) | **Yes** — text only | Localized strings |

### What becomes workspace-anchored (LTR geometry)

| Category | Workspace LTR? | Why |
|----------|----------------|-----|
| Sidebar position | **Yes** | Industry standard; already `side="left"` |
| Shell layout (header, main, inset) | **Yes** | Single console frame |
| Section/block order | **Yes** | Title before actions in reading flow near sidebar |
| Grid flow (KPI columns, card order) | **Yes** | Left-to-right tile progression |
| Toolbar control order (search → filter → actions) | **Yes** | Operations muscle memory |
| Tab order | **Yes** | Accounts → Tenants → Communications |
| Table column order | **Yes** | Identity → status → actions |
| Action row icon placement | **Yes** | Leading icon at workspace-start |
| `mx-auto` centered columns | **Yes** — centering unchanged | Centering is symmetric; anchor is workspace-start of column |

### What stays LTR always (ignore UI language)

| Category | Always LTR? | Why |
|----------|-------------|-----|
| Numbers, currency, KPI values | **Yes** | Canonical metrics, tabular alignment |
| Email addresses | **Yes** | Protocol and reading convention |
| URLs, slugs, IDs | **Yes** | Technical literals |
| Dates (ISO / formatted numerics) | **Yes** | Existing `dir="ltr"` pattern |
| Code, schema versions, plan codes | **Yes** | Technical fields |
| Phone numbers | **Yes** | International format |

### Language-dependent (text direction only)

| Category | Behavior |
|----------|----------|
| Page titles, section titles | `dir="auto"` or explicit `rtl` on text node; **align to workspace-start** |
| Button labels | RTL text; button position follows workspace layout |
| Table **text** cells (names in Arabic) | RTL glyph flow inside cell |
| Form labels | RTL text; label position follows form layout policy |
| Hints, descriptions | RTL text |

---

## 1. Direction Boundaries (Layer-by-Layer)

| Layer | Direction policy | EN | AR | Rationale |
|-------|------------------|----|----|-----------|
| **Sidebar** | Workspace-first (LTR chrome) | LTR layout | LTR layout | Nav stays left; labels RTL text only |
| **Shell** (`AdminOperationsShell`) | Workspace-first | LTR | LTR | Defines operator console frame |
| **Breadcrumbs** | Workspace-first position; language-dependent text | Start near sidebar | Same position; Arabic labels RTL | Trail begins at workspace-start |
| **Page header** (`h1`, subtitle) | Workspace-first position; language-dependent text | Title at workspace-start | Title at workspace-start (**not** viewport-right) | Fixes AR disconnect |
| **KPI sections** | Workspace-first grid; LTR tile order | LTR grid flow | LTR grid flow | Strip reads left → right |
| **Cards** | Workspace-first container; RTL titles | Card chrome LTR | Arabic title text RTL inside card | Avoid card-internal mirroring |
| **Tables** | Workspace-first columns; `text-start` = workspace-start | Identity column first | Same column order; Arabic names RTL in cells | Operations baseline |
| **Forms** | Workspace-first field order; RTL labels | Label above/left of field | Label above/start; Arabic RTL | No mirrored form grids |
| **Filters** | Workspace-first toolbar | Search → filter → actions | Same spatial order | Operations toolbar pattern |
| **Search inputs** | Workspace-first; **input content LTR** for email/ID search | Icon at start | Icon at start; Arabic placeholder RTL | Query literals often Latin |
| **Tabs** | Workspace-first; tabs from workspace-start | Left tab strip | Same — **not** right-floating | `opsTabList` alignment fix |
| **Action rows** | Workspace-first | Icon → label → chevron | Same order; Arabic label RTL | OCC quick actions |
| **Status badges** | Language-dependent text; workspace-first position in row | Inline after identity | Same relative placement | Badge text RTL |
| **Dialogs** | Workspace-first layout; RTL body copy | Standard modal | Arabic copy RTL; actions workspace-end pair | No full mirror |
| **Drawers / sheets** | Workspace-first; mobile sidebar from **start** side per shadcn `side` policy | Start sheet | Start sheet — not mirrored to end | Consistent with left nav |

**Summary rule:** If it defines **where something sits on screen**, it is **workspace-first**. If it defines **how characters flow**, it is **language-dependent**. If it is **data**, it is **always LTR**.

---

## 2. Workspace Origin

### Canonical workspace origin

**Definition:** The **left inner edge of `SidebarInset` content area** — immediately after the sidebar gap — is the **workspace origin** for all admin pages.

```
|← Sidebar (fixed left) →|← Workspace origin ············· workspace-end →|
```

### Definitive answers

| Question | Recommendation |
|----------|----------------|
| Where should visual hierarchy begin? | **Workspace-start** (left edge of inset content column) |
| Should content anchor near the sidebar? | **Yes** — hierarchy and section titles begin at workspace-start of the centered `max-w-*` column, not at the viewport-right |
| Should Arabic pages start hierarchy from workspace-start? | **Yes** — layout anchor is identical to English; only **glyph direction** changes |
| Should page titles remain right-aligned? | **No** — page titles must be **workspace-start aligned** with `text-align: start` under LTR workspace. Arabic titles render RTL glyphs but originate beside the sidebar |

### Column centering (unchanged)

`mx-auto max-w-5xl` / `max-w-7xl` remains valid. Centering is symmetric. Under workspace-first, **inline-start** of the column is always left, so Arabic and English share the same anchor point relative to the sidebar.

### Console UX consistency objective

English and Arabic admin pages must share:

1. Same sidebar relationship  
2. Same scan path (workspace-start → workspace-end)  
3. Same section order  
4. Same toolbar and table column order  
5. Different **text direction** only where language requires it  

---

## 3. Header Strategy

### Current problem (Arabic)

| Element | Current AR behavior | Issue |
|---------|---------------------|-------|
| Breadcrumbs | Appear at inline-start = **right** of header | Detached from sidebar |
| Title | Right side of centered column | Reads as “far” console |
| Header actions | Flipped to opposite end via RTL `justify-between` | Actions feel disconnected from title |
| Home button | Physical right of top bar | Acceptable |

### Designed behavior (both languages)

| Element | Position | Text direction | Notes |
|---------|----------|----------------|-------|
| **Sidebar trigger** | Workspace-start of top chrome | — | Unchanged |
| **Breadcrumbs** | After trigger; workspace-start cluster | EN: LTR / AR: RTL text | Separator `‹` / `›` already locale-aware |
| **Home icon** | Workspace-end of top chrome | — | Utility affordance |
| **Page title (`h1`)** | Workspace-start of title block | Language-dependent | **Never** viewport-right aligned |
| **Subtitle** | Below title; workspace-start | Language-dependent | Compact console pages omit |
| **Header actions** | **Workspace-end of title row** (same row as title) | Language-dependent labels | Actions stay on the **right side of the workspace**, not mirrored under RTL document |
| **Tabs (`headerFooter`)** | Workspace-start below title | Language-dependent | Operations tab strip anchors left |

### Header layout model

```
[ Trigger | Breadcrumbs ····································· Home ]

[ Title                                    [ Header actions ] ]
[ Subtitle (optional)                      ]

[ Tabs — workspace-start aligned                               ]
```

This model is **identical** in English and Arabic. Arabic titles wrap with RTL glyphs but occupy the **left title region**.

---

## 4. Section Strategy

### Components in scope

| Component | Role |
|-----------|------|
| `AdminSection` | Titled console sections + optional actions (Needs Attention, Commercial) |
| `AdminPageSection` | Lightweight section wrapper (KPI, Quick Actions) |
| `OperationsTabFrame` | Toolbar + list card rhythm |
| Overview panels | Executive Snapshot, Needs Attention, Quick Actions |

### Section title alignment

| Rule | Value |
|------|-------|
| Section title position | **Workspace-start** |
| Section description | Below title; workspace-start; RTL text in Arabic |
| Section icon (if any) | Leading at workspace-start (before title text) |

### Section action alignment

| Current | Designed |
|---------|----------|
| `justify-between` mirrors title/actions in RTL document | **Workspace-first row:** title cluster at start, actions at **workspace-end** (right side of section row) in **both** languages |

**Rationale:** Operator expectation — primary label on the left (near sidebar), secondary actions on the right (within workspace). Matches Operations experience audit “toolbar → data → actions” rhythm.

### Card group alignment

| Pattern | Policy |
|---------|--------|
| KPI grid (`ReportsHomeKpiSection`) | LTR grid flow; card 1 at workspace-start |
| Attention cards (`CommercialOverviewNeedsAttention`) | LTR grid flow (expiring → expired → canceled) |
| Quick action list (`OverviewQuickActionsSection`) | Vertical stack; each row: **icon at workspace-start**, label, chevron at workspace-end |
| `operationsCard` panels | Full width of column; internal content workspace-start |

### Overview command center (post OCC-MVP)

| Section | Workspace-first behavior |
|---------|------------------------|
| Executive Snapshot | KPI strip flows left → right; Arabic labels RTL inside cards |
| Needs Attention | Title + View Accounts / View Commercial on **designed header row** (not RTL-flipped) |
| Quick Actions | Action list rows follow Operations list row policy |

**OCC-MVP IA is preserved.** Only spatial policy changes.

---

## 5. Table Strategy

Operations is the UX baseline. Tables must not assume mirroring.

### Column order (both languages)

| Order | Column | Alignment |
|-------|--------|-----------|
| 1 | Identity (name, email) | `text-start` (workspace-start) |
| 2 | Classification / role | `text-start` |
| 3 | Subscription / commercial | `text-start`; numeric/date cells `dir="ltr"` |
| 4 | Details | `text-start` |
| 5 | Actions | `text-start` or dedicated actions cell; buttons at workspace-end **of cell** |

**Column order never reverses in Arabic.**

### Cell alignment

| Content type | Cell `dir` | Alignment |
|--------------|------------|-----------|
| Arabic names | `auto` or `rtl` | `text-start` |
| Email | `ltr` | `text-start` |
| Numbers, dates, plan codes | `ltr` | `text-start` |
| Badges | language-dependent text | `text-start` |
| Action button groups | — | Cluster at workspace-end of actions cell |

### Header row

| Rule | Value |
|------|-------|
| Header text | Language-dependent direction |
| Header alignment | `text-start` (existing `opsTableHead`) |
| Sort indicators (future) | Leading side of label at workspace-start |

### Filter toolbar (Operations)

| Element | EN | AR (designed) |
|---------|----|----|
| Search input | First at workspace-start | Same position |
| Classification select | After search | Same order |
| Toolbar actions | Workspace-end cluster | Same — not mirrored |
| Search icon | `end-2.5` inside input (logical) | Unchanged — logical positioning |

### Mobile card rows

Responsive Operations cards stack identity then metadata. Workspace-first preserves **top-to-bottom** order; Arabic identity text RTL; email/date fields `ltr`.

---

## 6. Form Strategy

### Labels

| Rule | Value |
|------|-------|
| Position | Above control (stacked) or leading (horizontal pairs) — **workspace-start anchored** |
| Text direction | Language-dependent (RTL for Arabic) |
| Required indicators | Leading side of label in workspace |

### Inputs

| Input type | `dir` | Placeholder |
|------------|-------|-------------|
| Arabic text (name) | `auto` / `rtl` | Arabic RTL |
| Email | `ltr` | LTR |
| Search (mixed) | `auto` | Language-dependent |
| Numeric | `ltr` | LTR |
| Date | `ltr` | LTR (existing subscription date pattern) |
| Password | `ltr` | LTR |

### Selects

| Rule | Value |
|------|-------|
| Trigger alignment | Workspace-start |
| Dropdown items | RTL text Arabic; LTR for codes/plan IDs |
| Chevron | Trailing at workspace-end of trigger |

### Elements that always ignore RTL

- MRR, ARR, KPI values  
- `ownerId`, `userId`, restaurant `slug`  
- Email, URL, phone  
- `schemaVersion`, `metricsSource` metadata  
- Invoice IDs, subscription end ISO dates  
- Chart axis numerics  

**Existing `dir="ltr"` on admin stat cards and accounts tables aligns with this policy — formalize, do not remove.**

---

## 7. Component Impact Analysis

### Primary choke point

| Component | Impact | Blast radius |
|-----------|--------|--------------|
| **`AdminOperationsShell`** | Establishes workspace `dir` boundary for all admin routes | **High** — intentional single point |

### Layout and section primitives

| Component | Change nature | Blast radius |
|-----------|---------------|--------------|
| `AdminSection` | Header row spatial policy (title/actions) | **Medium** |
| `AdminPageSection` | Text direction inheritance | **Low** |
| `AdminShellBreadcrumbs` | Position inherits shell; text RTL | **Low** |
| `AdminDashboardSidebar` | Text RTL only; layout unchanged | **Low** |
| `adminDashStyles` (`opsTabList`, `opsListRow`, table tokens) | `self-start` / alignment tokens review | **Medium** |

### Domain surfaces

| Component | Impact | Blast radius |
|-----------|--------|--------------|
| `ReportsHomeKpiSection` | KPI grid + card headers | **Medium** |
| `OverviewNeedsAttentionSection` | Section header row | **Medium** |
| `OverviewQuickActionsSection` | Row leading icon policy | **Low** |
| `CommercialOverviewNeedsAttention` | Card grid order (already LTR-friendly) | **Low** |
| `OperationsTabFrame` | Toolbar row | **Medium** |
| `CustomerSuccessAccountsSection` | Table + toolbar reference implementation | **Medium** |
| `CustomerSuccessTenantsSection` | Table + forms | **Medium** |
| `CustomerSuccessCommunicationsSection` | Form grid | **Low** |
| `StatisticsPanel` | Charts + table | **Medium** |
| `AdminStatCard` | Header row icon/title in workspace LTR | **Medium** |
| `NavShortcutCard` (deprecated) | N/A if unmounted | **None** |

### Shared UI primitives (indirect)

| Component | Impact | Blast radius |
|-----------|--------|--------------|
| `sidebar.tsx` (shadcn) | May need admin-specific wrapper, not fork | **Medium** |
| `breadcrumb.tsx` | Inherits shell direction | **Low** |
| `Dialog` / `Sheet` | Admin dialogs under shell boundary | **Low–medium** |
| `LanguageContext` | Document `dir` vs admin zone policy coexistence | **High** — policy only, not necessarily code at root |

### Pages (all `/admin/*`)

| Page | Sensitivity |
|------|-------------|
| `/admin` (OCC-MVP) | **High** — card grids expose RTL gap today |
| `/admin/operations` (+ tabs) | **Medium** — already strongest; verify no regression |
| `/admin/commercial` | **High** — many `AdminSection` headers |
| `/admin/analytics` | **Medium** |
| Placeholder routes | **Medium** — single card centering |

### Blast radius summary

| Tier | Count | Approach |
|------|-------|----------|
| **High** | Shell + commercial + overview KPI/attention | Shell policy first |
| **Medium** | Operations tables, section headers, stat cards | Validate against Operations baseline |
| **Low** | Breadcrumbs, badges, deprecated overview nav | Inherit shell policy |

**Estimated total:** **Medium–high** if attempted component-by-component without shell boundary; **medium** with shell-level policy first.

---

## 8. Migration Strategy

### Options evaluated

| Option | Description | Safety | Cohesion | Recommendation |
|--------|-------------|--------|----------|----------------|
| **A — Global admin policy** | All `/admin/*` routes enter workspace-first zone | High if routed correctly | Highest | **Strong candidate** |
| **B — Shell-level policy** | `AdminOperationsShell` establishes workspace `dir` | **Highest** — single choke point | High | **Recommended primary** |
| **C — Component-by-component** | Patch each section/table/card | Low — drift risk | Low | **Not recommended alone** |
| **D — Mixed** | Shell + targeted fixes for known mirroring | Medium | Medium | Acceptable **phase 2** only |

### Recommended rollout (design)

**Primary: Option B (shell-level policy)** reinforced by **Option A (route-level admin zone declaration)**.

| Phase | Design intent |
|-------|---------------|
| **1 — Boundary** | Admin operator console declares workspace-first frame at shell entry |
| **2 — Primitives** | `AdminSection`, `AdminStatCard`, toolbar rows align to designed header/table policies |
| **3 — Validation** | Operations accounts tab as regression baseline; Overview command center as card-grid baseline |
| **4 — Sweep** | Commercial, Analytics, placeholders inherit shell policy automatically where possible |

**Not recommended:** Starting with KPI cards or breadcrumbs alone (Option C) — preserves hybrid model.

### Coexistence with tenant app

| Surface | Document `dir` |
|---------|------------------|
| Tenant dashboard, menu, auth, pricing | Continues global language `dir` |
| Admin console | **Workspace-first override inside shell** |

This matches the audit finding that `Dashboard.tsx` already sets `dir` locally while admin does not.

### Rollback design

Shell boundary is **reversible in one place** without touching domain logic, OCC-MVP data wiring, or commercial authority.

---

## 9. Industry Fit

### Comparison matrix

| Product | Nav | Workspace layout in RTL locale | Text |
|---------|-----|-------------------------------|------|
| **Stripe** | Left persistent | LTR console frame | Localized RTL/LTR |
| **Vercel** | Left persistent | LTR frame | Localized |
| **GitHub** | Left persistent | LTR settings layout | Localized |
| **Linear** | Left persistent | LTR app shell | Localized |
| **Clerk** | Left persistent | LTR admin | Localized |

### Why Model B fits MineuQR

| Factor | Fit |
|--------|-----|
| **SaaS operations console** | Operators expect stable muscle memory across locales |
| **Left sidebar registry** (`ADMIN_NAV_GROUPS`) | Built for workspace-start navigation |
| **Operations-first UX target** | Tables/toolbars already imply LTR column order |
| **Platform Command Center** | Executive snapshot + attention + actions scan left → right |
| **Five-domain admin architecture** | Single shell (`AdminOperationsShell`) benefits from one direction zone |
| **Commercial numeric authority** | LTR data cells are mandatory — workspace LTR reduces bidi conflict |
| **Arabic as default language** | Workspace-first fixes default-locale disconnect without removing Arabic |

**Full RTL mirror (Model A)** would fight shadcn sidebar peer layout, Operations table order, and OCC action rows — high cost, low industry precedent.

---

## 10. Final Recommendation

### Canonical direction model

**Workspace-First (Model B)** with three zones:

1. **Admin workspace** — LTR geometry  
2. **Localized copy** — RTL text for Arabic, LTR for English  
3. **Data literals** — always LTR  

### Workspace strategy (single sentence)

**Anchor all admin layout to workspace-start beside the left sidebar; localize text direction inside that frame; never mirror the console chrome for Arabic.**

### Risk assessment

| Risk | Level | Mitigation (design-level) |
|------|-------|---------------------------|
| Arabic users expect full UI mirror | Low–medium | Industry norm; text remains RTL |
| Tenant vs admin direction inconsistency | Low | Document as intentional product boundary |
| shadcn sidebar physical CSS | Medium | Shell isolation; avoid forking sidebar if wrapper suffices |
| Section header regressions | Medium | Operations tab + Overview attention as validation baselines |
| Security Center built on hybrid model | **High if deferred** | **Implement workspace policy before Security Center UI** |

### Expected UX improvement

| Area | Improvement |
|------|-------------|
| **Arabic admin cohesion** | Hierarchy adjacent to sidebar; reduced “floating right column” |
| **Overview command center** | KPI + attention + actions share Operations scan rhythm |
| **Commercial / Analytics** | Section headers stable; less title/action separation |
| **English admin** | Neutral (already correct) |
| **Operations** | Preserved or slightly clarified — baseline must not regress |
| **Cross-language parity** | Same console **spatial** narrative; language affects text only |

### Timing relative to ADMIN-SECURITY-CENTER

| Order | Program | Rationale |
|-------|---------|-----------|
| **1** | **ADMIN-RTL-WORKSPACE implementation** | Foundational spatial policy for every admin route |
| **2** | **ADMIN-SECURITY-CENTER** | New governance UI should inherit workspace-first from day one |
| **3** | Health / Launch Readiness centers | Same shell inheritance |

**Recommendation:** Workspace-first implementation should occur **before** ADMIN-SECURITY-CENTER (and before other new admin center UIs). Building Security Center on the current hybrid model would reproduce Arabic disconnect and require a second remediation pass.

OCC-MVP **does not block** workspace-first work — command center structure is compatible. OCC-MVP **benefits** from workspace-first alignment (attention header row and KPI strip are highest-visibility AR pain points today).

---

## Design Invariants (Non-Negotiable)

| ID | Invariant |
|----|-----------|
| INV-1 | Admin sidebar remains on the **left** in all languages |
| INV-2 | Workspace hierarchy begins at **workspace-start** in all languages |
| INV-3 | Arabic page titles are **not** viewport-right aligned |
| INV-4 | Table column order **does not mirror** in Arabic |
| INV-5 | Numeric, email, URL, ID fields remain **LTR** |
| INV-6 | UX-REFINE visual tokens (colors, cards, borders) **unchanged** |
| INV-7 | OCC-MVP section structure (Snapshot → Attention → Actions) **unchanged** |
| INV-8 | Operations accounts table remains the **UX regression baseline** |

---

## Appendix — Direction Decision Quick Reference

| UI element | Layout | Text | Data |
|------------|--------|------|------|
| Sidebar | Workspace LTR | RTL if AR | — |
| Shell | Workspace LTR | — | — |
| Breadcrumbs | Workspace LTR | RTL if AR | — |
| Page title | Workspace LTR | RTL if AR | — |
| Section title | Workspace LTR | RTL if AR | — |
| Section actions | Workspace-end | RTL if AR | — |
| KPI value | Workspace LTR | — | LTR |
| KPI label | Workspace LTR | RTL if AR | — |
| Table headers | Workspace LTR | RTL if AR | — |
| Table email cell | Workspace LTR | — | LTR |
| Search input | Workspace LTR | RTL placeholder if AR | LTR for Latin queries |
| Tabs | Workspace LTR | RTL if AR | — |
| Badges | Workspace LTR | RTL if AR | — |
| Dialog body | Workspace LTR | RTL if AR | LTR for data |
| Drawer | Workspace LTR | RTL if AR | — |

---

## Related Documents

| Document | Relationship |
|----------|--------------|
| `ADMIN-RTL-WORKSPACE-AUDIT.md` | Problem statement — hybrid Model C |
| `OPERATIONS-EXPERIENCE-AUDIT.md` | Console rhythm target |
| `OCC-MVP-IMPLEMENTATION.md` | Overview structure to preserve |
| `OVERVIEW-COMMAND-CENTER-DISCOVERY.md` | Platform-first IA authority |

---

*Read-only design phase. Authoritative reference for RTL workspace implementation when approved. No code. No implementation steps.*
