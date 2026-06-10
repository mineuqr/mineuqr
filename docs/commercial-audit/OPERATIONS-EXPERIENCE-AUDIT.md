# Operations Experience Audit

**Project:** MineuQR  
**Program:** ADMIN-DASHBOARD-UX-REFINE-1  
**Audit type:** Read-only — UX / Information Architecture / Visual Composition  
**Date:** 2026-06-07  
**Reference page:** `/admin/operations` (Accounts tab as primary baseline)  
**Comparison pages:** `/admin`, `/admin/commercial`, `/admin/analytics`, `/admin/health`, `/admin/security`, `/admin/reports`, `/admin/launch-readiness`

**Out of scope:** Layout tokens, CSS classes, shell width, grid breakpoints, implementation proposals.

---

## Executive Summary

Operations feels stronger because it behaves like a **work console**: one job, one scan path, one dominant surface, live data, and tools before content. Overview and several sibling pages behave like **directories or dashboards** — they orient the user toward other pages rather than letting them act on platform state in place.

The perceptual gap is not primarily visual styling. Operations and Overview share the same design language (Pricing-aligned tokens, compact shell, cyan-bordered cards). The gap is **information architecture**: what each page asks the user to do, how much evidence it shows, and how continuously that evidence fills the viewport.

---

## Page Roles (Information Architecture)

| Route | Primary IA role | Above-the-fold content | User mode |
|-------|-----------------|------------------------|-----------|
| **Operations** | Work console | Tabs → search/filter → live list with count | **Do work** |
| **Overview** | Hub / wayfinding | KPI strip → shortcut links → full nav replay | **Choose destination** |
| **Commercial** | Reporting + health signals | Executive KPIs → metadata → health/attention blocks | **Review metrics** |
| **Analytics** | Analytics workspace | KPI grids → charts → subscriber table | **Analyze trends** |
| **Health / Security / Reports / Launch Readiness** | Placeholder | Single “coming soon” card | **Wait / leave** |

Operations is the only comparison page where the **primary content is operational records with inline actions**, not summaries or navigation.

---

## Dimensional Analysis

### 1. Information Density

**Operations**

- High density above the fold: page title, three tabs, search field, classification filter, internal-user action, list count label, and multiple data rows (or responsive row cards) visible without scrolling on typical laptop viewports.
- Each list row carries compound information: identity, role, classification, subscription state, restaurant count, plan, dates, and row-level governance actions.
- Perceived productivity is immediate: the page answers “who needs attention?” and “what can I do right now?” in the first screen.

**Overview**

- Moderate density in the KPI strip only (five metrics).
- Below KPIs, density drops sharply: twelve navigation tiles (three featured + nine “all sections”) that repeat sidebar information with label + one-line description + arrow.
- Header status badges are a **legend** (active / trial / grace), not live platform state tied to actionable rows.
- Content-to-empty-space ratio feels low because most of the viewport below KPIs is **meta-navigation**, not operational evidence.

**Commercial**

- Higher than Overview: executive KPIs, metadata, subscription health, needs-attention workflow, plan distribution.
- Still sectional and summary-oriented; no single continuous work list.

**Analytics**

- Highest non-Operations density: multiple KPI bands, chart pairs, status breakdowns, full subscriber table.
- Feels analytically rich but cognitively segmented (overview → subscriptions → charts → table).

**Placeholders (Health, Security, Reports, Launch Readiness)**

- Minimal density: title, description, back link inside one card.
- Perceived emptiness is structural — the page admits it has no job yet.

---

### 2. Visual Weight Distribution

**Operations**

- Eye lands on the **toolbar + primary list panel** — a single horizontal band of controls followed by a large continuous surface.
- Weight is distributed across the **full content width** by one dominant card containing the dataset.
- Secondary elements (tabs, badges in rows) support the main list rather than competing with it.

**Overview**

- Eye lands on **KPI numbers** first (correct for a hub), then drifts into a field of similar-weight navigation tiles.
- No single dominant surface; weight is **fragmented** across many equal-priority cards with visible background between them.
- “Quick Shortcuts” and “All Sections” compete at similar visual weight, creating ambiguity about which navigation tier matters.

**Commercial / Analytics**

- Weight alternates between KPI clusters and larger chart/table panels.
- Analytics gains a second anchor at the bottom via the full-width subscriber table (closer to Operations’ list gravity).

**Placeholders**

- Weight collapses to a small centered card; surrounding space reads as unused capacity.

---

### 3. Surface Architecture

**Operations**

- **Large panels:** toolbar card + list card (`OperationsTabFrame` rhythm).
- **Continuous surfaces:** list rows/table share one bordered container; scanning feels like reading one instrument panel.
- Background gradient appears at edges, not between every data unit.

**Overview**

- **Small cards:** KPI tiles + `NavShortcutCard` links in grids.
- **Fragmented surfaces:** each destination is an isolated interactive island; gaps expose shell background.
- Reads as a **tile mosaic** (app launcher) rather than a **workspace** (operations desk).

**Commercial / Analytics**

- Hybrid: sectional cards and grids, occasionally a wide chart or table panel.
- Analytics’ bottom table is the closest non-Operations continuous surface.

**Placeholders**

- One small card on an otherwise empty stage.

---

### 4. Content Rhythm

**Operations**

| Phase | Rhythm |
|-------|--------|
| Orient | Title + tabs establish scope |
| Focus | Toolbar narrows the dataset |
| Scan | List label + rows create vertical beat |
| Act | Row actions / dialogs complete the loop |

Reading flow is **task-linear**: filter → scan → act. Section transitions are functional (toolbar block → data block), not decorative.

**Overview**

| Phase | Rhythm |
|-------|--------|
| Orient | Title + status legend |
| Glance | KPI strip |
| Choose | Shortcuts section |
| Choose again | All sections section |

Reading flow is **wayfinding-circular**: every section asks “where next?” rather than “what now?” Transitions between KPIs → shortcuts → all sections feel like three different page types stacked vertically.

**Commercial / Analytics**

- Rhythm is **report-like**: metric block → explanatory block → visualization block → (optional) detail table.
- More coherent than Overview, but still multi-chapter rather than single-workspace.

**Placeholders**

- Single beat: explanation → back link. No scan loop.

---

### 5. Interaction Pattern

**Operations**

- **Filters:** search + classification select.
- **Search:** primary toolbar control.
- **Actions:** create subscription, edit, delete, role governance, internal user tooling — row-level and toolbar-level.
- **Navigation:** tabs switch workspace context without leaving the console mental model.

Interaction is **in-page and stateful**; the page mutates based on user input.

**Overview**

- **Filters:** none.
- **Search:** none.
- **Actions:** none on page content (only navigate away via cards).
- **Navigation:** duplicates sidebar destinations in two grids.

Interaction is **exit-navigation only**. The page does not respond to user intent beyond link selection.

**Commercial**

- Header export actions; sectional data with loading states; no unified filter layer.

**Analytics**

- Export buttons; passive charts and table; read-only analysis pattern.

**Placeholders**

- Single back-to-overview link.

---

### 6. Space Utilization

**Operations**

- Width is consumed by **meaningful columns and controls** spanning the work panel.
- Perceived fullness comes from **data column span**, not from page width tier.
- Even on a narrower console width, the page feels “full” because the list surface stretches edge-to-edge within its frame.

**Overview**

- Wider hub shell does not increase **utility density** — it increases **tile spread and inter-tile background**.
- Perceived emptiness comes from **non-work content** (navigation replicas) and **discrete card layout**, not from missing pixels.
- KPI strip uses width at `lg+`, but everything below it distributes link tiles rather than operational evidence.

**Commercial / Analytics**

- Analytics uses width better via chart pairs and a full-width table.
- Commercial fills vertical space with more sections but remains card-segmented.

**Placeholders**

- Lowest utilization: one card in a large frame.

---

### 7. Visual Hierarchy

**Operations**

| Element | Hierarchy strength |
|---------|-------------------|
| **Strongest** | Active dataset (list/table) + toolbar |
| **Secondary** | Tabs (scope switcher) |
| **Tertiary** | Row badges and micro-actions |
| **Weakest** | Chrome (breadcrumbs, shell) |

Hierarchy is **clear and functional**: tools → data → actions.

**Overview**

| Element | Hierarchy strength |
|---------|-------------------|
| **Strongest** | KPI values |
| **Competing** | Featured shortcuts vs all sections (similar card treatment) |
| **Weak** | Status legend in header (reference-only) |
| **Weakest** | Section titles below KPIs (compact but numerous) |

Hierarchy **decays after KPIs**: no single second focal point; navigation tiles flatten priority.

**Commercial / Analytics**

- Strongest: executive KPIs and (Analytics) charts/table.
- Hierarchy clearer than Overview because sections carry distinct data types, not duplicate navigation.

**Placeholders**

- Only the placeholder card matters; hierarchy is trivial and weak by design.

---

## Cross-Page Comparison Matrix

| Dimension | Operations | Overview | Commercial | Analytics | Placeholders |
|-----------|------------|----------|------------|-----------|--------------|
| Information density (above fold) | High | Medium → Low | Medium–High | High | Very low |
| Dominant surface | Single list panel | None (tile field) | Section stacks | Charts + table | One card |
| Interaction depth | Deep (filter/act) | Shallow (links) | Read + export | Read + export | Exit only |
| Primary user question | “Who / what do I act on?” | “Where do I go?” | “How is commercial health?” | “What are the trends?” | “Is this built yet?” |
| Perceived professionalism | Console / instrument | Launcher / directory | Report | Analytics desk | Stub |

---

## Required Answers

### 1. Why Operations feels better

Operations feels more balanced and professional because it commits to a **single operational narrative**:

1. **Purpose clarity** — The page name, tabs, and toolbar all reinforce one job: manage accounts, tenants, or communications.
2. **Evidence-first** — Live records with counts and filters appear immediately; the user sees platform reality, not links to elsewhere.
3. **Continuous workspace** — One primary surface carries visual authority; scanning and acting happen in the same frame.
4. **Toolbar-before-content** — Interaction precedes browsing, signaling a professional operator environment.
5. **Actionable hierarchy** — Data rows are the hero; navigation is secondary (tabs switch context, not leave the console).
6. **Productivity loop** — Filter → scan → act completes without route changes, which reads as “real admin software.”

These qualities are **experiential**, not decorative. Operations would still feel stronger than Overview even if both used identical colors and spacing, because the **information job** is different.

---

### 2. Why Overview feels weaker

Overview feels weaker relative to Operations because it optimizes for **orientation** at the expense of **operation**:

1. **Navigation duplication** — “Quick Shortcuts” and “All Sections” largely replay the sidebar, adding scroll without new intelligence.
2. **KPI strip isolation** — Metrics appear without adjacent interpretive context (queues, exceptions, trends, or drill-down rows), so they read as a scoreboard, not a control panel.
3. **No in-page interaction** — Absence of search, filters, or actions makes the page passive after the KPI glance.
4. **Fragmented surfaces** — Many small link cards create visual noise without cumulative weight; the eye finds no second anchor.
5. **Competing section purposes** — Three vertical blocks (KPIs, shortcuts, all sections) lack a unified task story; rhythm breaks after the first strip.
6. **Header legend vs live state** — Status badges explain taxonomy but do not surface “what needs attention now,” unlike Operations’ row-level status signals.

Overview was refined toward console density (UX-REFINE-1C), but its **IA remains hub-first**, not work-first — so it still feels like a lobby, not a desk.

---

### 3. Which Operations characteristics should be inherited

| Characteristic | Why inherit |
|----------------|-------------|
| **Workspace framing** | One primary “situation + action” frame above the fold, not a stack of peer sections |
| **Toolbar-first interaction** | A control row that expresses user intent before content (search, filter, quick jump, or queue toggle) |
| **Live evidence with counts** | Labels like “Users (142)” ground the page in reality; Overview should show counted queues, not static links |
| **Continuous primary surface** | A single scannable block (queue, feed, table, or unified panel) as the second focal point after KPIs |
| **Task-linear rhythm** | Orient → narrow → scan → act; avoid repeated “choose destination” beats |
| **Row-level meaning** | Information units should carry identity + status + next action, not label + description + arrow only |
| **Secondary nav that switches context** | Tabs or segmented controls that change *what you’re working on*, not duplicate global nav |

---

### 4. Which characteristics should NOT be inherited

| Characteristic | Why not |
|----------------|---------|
| **Full CRUD data tables on Overview** | Hub should summarize and route to work, not replicate Operations |
| **Operations tab strip for global domains** | Overview is cross-domain; tabs imply a single-domain console |
| **narrowContent / console width tier** | Hub benefits from breadth for summary panels; this is a layout concern, not the core UX lesson |
| **Placeholder emptiness pattern** | “Coming soon” card should not be the fallback aesthetic for any live hub section |
| **Deep row governance actions on hub** | Security/delete/subscription dialogs belong in Operations, not the landing page |
| **Sidebar duplication in card form** | Re-listing every admin route undermines both sidebar and hub value |

---

### 5. Top 5 changes to make Overview feel as strong as Operations

*Conceptual UX changes only — no implementation specification.*

1. **Promote Overview from directory to command center**  
   Replace or sharply demote the “All Sections” grid. The hub should not re-teach navigation the sidebar already provides. Reserve the main body for **platform state**: attention queues, expiring subscriptions, recent admin activity, or health exceptions.

2. **Pair KPIs with operational context in one unified first panel**  
   Treat the KPI strip as the header of a single “situation panel,” not five isolated tiles floating above unrelated links. Each metric should connect to **meaning** (threshold, trend, or drill target) so the first screen reads like Operations’ list header + evidence, not a passive dashboard widget row.

3. **Add a toolbar-equivalent interaction layer**  
   Introduce at least one above-the-fold control that expresses operator intent: global admin search, “needs attention” filter, status filter, or quick-open for accounts/tenants. This signals the same professional mode as Operations’ search bar even if the hub remains summary-oriented.

4. **Establish one dominant scan surface below KPIs**  
   Collapse the two navigation sections into a single prioritized destination list **or** convert “shortcuts” into **pinned work queues with live counts** (e.g., expiring trials, unresolved communications). One continuous surface should carry visual weight comparable to Operations’ list card.

5. **Align content rhythm to filter → scan → act**  
   Re-sequence Overview so the user can complete a micro-loop without leaving: glance KPIs → see prioritized items → take one action or drill to Operations/Commercial. Remove the repetitive “choose where to go” middle acts that flatten hierarchy and inflate empty perceived space.

---

## Per-Page Notes (Comparison Detail)

### `/admin/commercial`

- Closer to **reporting** than Operations: executive KPIs, metadata, health, attention, plan distribution.
- Gains credibility from **domain-specific sections with real data**, but lacks Operations’ unified toolbar + list loop.
- Feels more professional than Overview because sections deliver **evidence**, not navigation.

### `/admin/analytics`

- Strongest competitor to Operations on **density** (charts, multiple KPI bands, subscriber table).
- Hierarchy is **analytic** (metric → visualization → detail), not **operational** (filter → row → act).
- Bottom table provides Operations-like fullness; upper fragmented KPI grids echo Overview’s tile pattern.

### `/admin/health`, `/admin/security`, `/admin/reports`, `/admin/launch-readiness`

- Placeholder IA: single card, explanatory copy, back link.
- Professionally weakest comparison set — empty stage highlights how much Operations’ **content architecture** contributes to perceived quality.
- When built, these routes should adopt Operations’ **workspace + evidence + action** pattern, not Overview’s link-grid pattern.

---

## Conclusion

Operations feels better because it is architected as a **place to work**. Overview feels weaker because it is architected as a **place to leave**. Visual tokens are aligned across admin pages; the experiential gap is **what the page puts in front of the user first**, how continuously that content occupies attention, and whether the interaction model supports productivity in place.

Closing the gap does not mean turning Overview into Operations. It means giving Overview **Operations-grade purpose clarity**: one dominant narrative, live counted evidence, a toolbar moment, and a single scannable surface — while keeping the hub’s cross-domain summarization role.

---

*Audit only. No code changes, redesigns, or implementation steps.*
