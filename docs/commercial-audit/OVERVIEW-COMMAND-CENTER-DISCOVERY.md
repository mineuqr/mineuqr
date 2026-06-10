# Overview Command Center Discovery

**Project:** MineuQR  
**Program:** ADMIN-DASHBOARD-UX-REFINE-1 (evolution) / ADMIN-DASHBOARD-REBUILD-5 (architecture)  
**Mode:** Research and planning only — no implementation, no UI, no code  
**Date:** 2026-06-07  
**Inputs:** Live admin surfaces, tRPC data contracts, domain registries, `EXEC-7C.1` commercial authority, `OPERATIONS-EXPERIENCE-AUDIT.md`, `ADMIN-DASHBOARD-REBUILD-5BD` extraction readiness

---

## Context

Today `/admin` (Overview) behaves as a **navigation hub**: five KPI tiles, three featured shortcuts, and a nine-item grid that repeats sidebar destinations. Live operational work lives elsewhere — primarily `/admin/operations` (accounts, tenants, in-app communications), `/admin/commercial` (executive reporting + attention/health widgets), and `/admin/analytics` (charts and subscriber table).

Five admin routes (`/admin/health`, `/admin/security`, `/admin/reports`, `/admin/launch-readiness`, `/admin/customer-success`) are placeholders. Their future domains are partially implemented in backend modules and embedded UI, but not surfaced as first-class operator experiences.

This document defines what a future **Admin Command Center** should show, prioritize, and enable — grounded in what MineuQR can truthfully provision today and what the roadmap commits to next.

---

## 1. Purpose Statement

The Admin Command Center is the **first screen an operator opens to understand platform state and decide what to do next**.

It must answer, in order:

1. **Is the business healthy right now?** — canonical subscription and revenue snapshot  
2. **What needs my attention?** — prioritized, countable, actionable queues  
3. **Where do I go to act?** — deep links into domain workspaces, not a full re-listing of navigation  
4. **Is the platform ready to operate and launch?** — readiness and health signals as they become available  

It is **not** a replacement for Operations, Commercial, Analytics, Security, or Health workspaces. It is the **cross-domain situational layer** that orients operators before they enter a domain console.

---

## 2. Target Users

| Persona | Primary need on first screen | Success criterion |
|---------|------------------------------|-------------------|
| **Platform operator** (day-to-day CS) | Find accounts requiring lifecycle action — expiring, expired, canceled, trial ending | Can identify top queue and reach Accounts workspace in one step |
| **Commercial / revenue operator** | Confirm MRR, entitled owners, subscription health distribution | Sees canonical executive snapshot without opening Commercial page |
| **Technical operator** (future) | Know if probes, email, auth, or deployment checks are failing | Sees health/readiness exceptions when Health and Launch Readiness centers exist |
| **Security / governance operator** (future) | Know if governance events or suspicious activity need review | Sees security alert summary when Security Center exists |
| **Executive viewer** (occasional) | Fast read on scale (users, restaurants) and revenue | Gets authoritative numbers without navigating charts |

All personas share one constraint: **only canonical or explicitly operational metrics** — no inferred trends, no presentation-only states masquerading as counts.

---

## 3. Command Center Principles

| # | Principle | Rationale |
|---|-----------|-----------|
| P1 | **Evidence before navigation** | Every block must show live platform state or a counted queue; link grids alone are insufficient |
| P2 | **Canonical truth only** | Commercial numbers from CRS / `CANONICAL_OWNER`; label operational DB counts separately |
| P3 | **Attention is finite** | Surface 3–5 priority queues maximum above the fold; defer exhaustive lists to domain pages |
| P4 | **Count → drill → act** | Each attention item shows a count and routes to the workspace where action happens |
| P5 | **No vanity on the hub** | Metrics without operator meaning or without authority stay off the first screen |
| P6 | **Honest gaps** | If grace, suspended, renewal rate, or activity feed are unavailable, do not imply them |
| P7 | **Domain ownership respected** | Reports owns executive KPIs; CS owns lifecycle queues; Security owns governance; Health owns probes; Launch Readiness owns certification |
| P8 | **Hub summarizes, consoles execute** | Overview enables orientation and shallow actions; CRUD, governance, and bulk tools stay in domain workspaces |
| P9 | **One narrative rhythm** | Situation → attention → next actions → readiness (not three competing navigation sections) |
| P10 | **Progressive maturity** | MVP uses existing APIs; later phases add row-level queues, activity feeds, and center summaries as domains ship |

---

## 4. Recommended Sections

Sections are ordered by information hierarchy (see §9). Each maps to a domain and a maturity phase.

| Section | Domain owner | MVP | Phase 2 | Mature |
|---------|--------------|-----|---------|--------|
| **Executive Snapshot** | Reports | ✅ | ✅ | ✅ |
| **Needs Attention** | Customer Success | ✅ | ✅ | ✅ |
| **Subscription Health** | Customer Success / Reports | Partial (summary counts) | ✅ | ✅ |
| **Priority Work Queue** | Customer Success | — | ✅ | ✅ |
| **Quick Actions** | Cross-domain | ✅ | ✅ | ✅ |
| **Platform Scale** | Reports (operational) | Optional fold | ✅ | ✅ |
| **Communications Status** | Customer Success | — | Partial | ✅ |
| **Security Alerts** | Security | — | — | ✅ |
| **Platform Health** | Health | — | Partial | ✅ |
| **Launch Readiness** | Launch Readiness | — | Partial | ✅ |
| **Recent Activity** | Reports / CS | — | — | ✅ (requires new read API) |

### Section definitions

**Executive Snapshot**  
Canonical headline: entitled commercial posture — MRR, active subscriptions, active trials, expiring within 30 days. Contextual operational counts (active restaurants, total users) secondary.

**Needs Attention**  
Aggregated attention contract from `CommercialOverviewSnapshot.needsAttention`: expiring (30d), canceled accounts, expired accounts. Each count links to filtered Accounts or Commercial drill-down.

**Subscription Health**  
Five-bucket distribution: trial, active, canceled, expired, inactive (`planCode === NONE` && not entitled). Supports “is the base healthy?” without opening Commercial.

**Priority Work Queue** (Phase 2+)  
Row-level feed: top N owners by urgency (trial ending ≤7d, period end ≤14d, recently expired). Sourced from existing `getOwnerOverviewList` with client or server-side prioritization — not a new authority layer.

**Quick Actions**  
Pinned operator intents with counts: open Accounts, open Tenants, send announcement, view Commercial export, open Analytics. Replaces passive shortcut cards.

**Platform Scale**  
Operational inventory: total users, active restaurants, (later) menu items / categories when analytically useful for operators.

**Communications Status**  
In-app only until email ops exist: last bulk send result, pending draft indicator, link to Communications tab. No fake email queue.

**Security Alerts** (mature)  
Summary from `authAudit`, `suspiciousActivity`, failed admin access — when Security Center read APIs exist.

**Platform Health** (mature)  
Probe summary: email config, entitlements diagnostics, tRPC pressure — when `/admin/health` ships.

**Launch Readiness** (mature)  
Certification scorecard: deployment auth readiness, feature visibility completion %, blocking dependencies — when `/admin/launch-readiness` ships.

**Recent Activity** (mature)  
Admin commercial events stream — **blocked today** by `NO_ADMIN_COMMERCIAL_EVENT_READ_API`.

---

## 5. Recommended KPIs

### Tier A — Show on first screen (operationally meaningful, provisionable today)

| KPI | Source | Type | Why it belongs |
|-----|--------|------|----------------|
| **Estimated MRR (USD)** | `getDashboardSummary` / CRS | Canonical | Primary revenue health indicator; owner-based, `countsInMrr` only |
| **Active subscriptions** | CRS `subscriptionStatus === active` | Canonical | Core lifecycle health |
| **Expiring within 30 days** | CRS entitled owners, period window | Canonical | Direct operator action trigger |
| **Active trials** | CRS `subscriptionStatus === trial` | Canonical | Conversion and outreach queue input |
| **Entitled owners / commercial subscribers** | CRS `isEntitled` | Canonical | True paying/trial base (available in overview snapshot; not currently on Overview strip) |

### Tier B — Show as secondary context (operational, valid but not subscription truth)

| KPI | Source | Type | Why it belongs |
|-----|--------|------|----------------|
| **Active restaurants** | DB `restaurants.isActive` | Operational | Venue activity; can diverge from entitlement — must be labeled operational |
| **Total users** | DB user count | Operational | Platform scale |
| **Inactive accounts** (no plan / not entitled) | `subscriptionHealth.inactive` | Canonical | Onboarding and conversion funnel signal |

### Tier C — Show in expanded / Phase 2 panels (meaningful but not above-the-fold)

| KPI | Source | Type | Why deferred |
|-----|--------|------|--------------|
| **ARR** | MRR × 12 | Canonical derivative | Useful but redundant with MRR on hub; keep on Commercial |
| **Canceled accounts** | `needsAttention.canceledAccounts` | Canonical | Better as attention queue than KPI tile |
| **Expired accounts** | `needsAttention.expiredAccounts` | Canonical | Same — attention item |
| **Plan distribution top plan** | `planDistribution.entries` | Canonical | Detail for Commercial/Analytics |
| **Subscription health buckets** | trial / active / canceled / expired | Canonical | Better as health strip than five separate KPI cards |

### Tier D — Do not show on Command Center (vanity or non-provisionable)

| Metric | Status | Reason to exclude |
|--------|--------|-------------------|
| **Renewal rate** | `NO_CANONICAL_RENEWAL_METRIC` | Chart placeholder only; would mislead |
| **Revenue by month / trend** | `NO_CANONICAL_REVENUE_TREND` | Legacy deprecated; no certified series |
| **Canonical growth / MoM delta** | `NO_CANONICAL_GROWTH_METRIC` | Not in authority |
| **Grace accounts** | `graceAccounts: null` | Presentation badge only; no CRS mapping |
| **Suspended accounts** | `suspendedAccounts: null` | Not in authority |
| **Total menu items / categories / offers** | `getExtendedAdminStats` | Inventory analytics — belongs on Analytics, not command center |
| **Raw subscription row count** | Legacy `getAdminStatistics` | Not owner-based |
| **Churn / retention / forecast** | Explicitly excluded in EXEC-7C.1 | No authority |
| **Status badge legend alone** | UI reference | Teaches taxonomy; does not show live state |

---

## 6. Recommended Action Areas

Actions available **directly from Overview** should be shallow, high-frequency, and route into domain consoles for depth.

### MVP actions (no new APIs)

| Action | Target | Rationale |
|--------|--------|-----------|
| **View expiring accounts** | `/admin/operations?tab=accounts` (+ future filter deep link) | Highest-attention queue |
| **View all accounts** | Operations → Accounts | Primary CS workspace |
| **Manage tenants** | `/admin/operations?tab=tenants` | Venue lifecycle |
| **Send announcement** | `/admin/operations?tab=communications` | In-app broadcast; API exists |
| **Open commercial report** | `/admin/commercial` | Executive + attention detail |
| **Open analytics** | `/admin/analytics` | Trend and subscriber table |
| **Export commercial data** | Commercial page export (header action) | Reporting workflow entry |

### Phase 2 actions (existing APIs, richer hub wiring)

| Action | Prerequisite | Rationale |
|--------|--------------|-----------|
| **Open owner from queue row** | Priority queue UI + `getOwnerOverviewList` | Micro-loop without search |
| **Filter accounts by attention type** | Deep link or query param convention | Count → filtered list |
| **Quick search owner** | Global search across owner list | Operations-style toolbar on hub |
| **View trial-ending soon** | Server or client filter on `trialStatus.daysRemaining` | Actionable trial queue |
| **Create internal user** | Link to Security workflow (future center or accounts-hosted) | Governance entry |

### Mature actions (new read/write surfaces required)

| Action | Blocker | Domain |
|--------|---------|--------|
| **Review security events** | Security Center read API | Security |
| **Run / view health probes** | Health Center UI + probe endpoints | Health |
| **Review launch blockers** | Launch Readiness scorecard | Launch Readiness |
| **Email campaign / delivery log** | Email operations layer (not built) | Communications |
| **Reset subscriber password** | `resetSubscriberPassword` unwired | Security / CS |
| **View recent admin activity** | `NO_ADMIN_COMMERCIAL_EVENT_READ_API` | Reports |

### Actions that should NOT live on Overview

| Action | Why not |
|--------|---------|
| Full subscription CRUD dialogs | Depth belongs in Accounts workspace |
| Delete user / role governance | Security domain; destructive |
| Bulk classification changes | Governance console |
| Chart interaction / export configuration | Analytics workspace |
| Feature visibility editing | Launch Readiness program tooling |

---

## 7. Recommended Alert Areas

Alerts are **exception-based** — they appear when thresholds or failures demand operator response.

### Provisionable today (count-based alerts)

| Alert | Condition | Severity | Drill target |
|-------|-----------|----------|--------------|
| **Expiring subscriptions** | `expiringWithin30Days > 0` | High | Accounts (filtered) |
| **Expired accounts** | `expiredAccounts > 0` | High | Accounts |
| **Canceled accounts** | `canceledAccounts > 0` | Medium | Accounts |
| **Active trials ending soon** | Owners with `trialStatus.daysRemaining ≤ 7` | Medium | Accounts (Phase 2 queue) |
| **Inactive entitled gap** | High `inactive` count vs low conversions | Low | Commercial health section |

### Phase 2 alerts (derived from existing owner list)

| Alert | Condition | Notes |
|-------|-----------|-------|
| **Trial not converted** | Trial ended, no active subscription | Per-owner scan |
| **Restaurant without active owner** | Tenant active, owner not entitled | Tenants workspace |
| **Zero entitled owners** | `commercialSubscribers === 0` | Platform-critical edge case |

### Future alerts (domain centers required)

| Alert | Domain | Signal source (exists in codebase) |
|-------|--------|-----------------------------------|
| **Failed admin access spike** | Security | `authAudit`, `suspiciousActivity` |
| **Email delivery failure** | Health | `email-config.test.ts` probe |
| **Deployment auth misconfiguration** | Launch Readiness | `deploymentReadiness.ts` |
| **tRPC / runtime pressure** | Health | `healthSignals.ts` |
| **Feature visibility regressions** | Launch Readiness | `UI_VISIBILITY_INVENTORY` |
| **Session revocation events** | Security | `sessionRevocation.ts` |

### Non-alerts (do not surface as warnings)

| Item | Reason |
|------|--------|
| Grace period accounts | Not provisionable (`null`) |
| Suspended accounts | Not provisionable (`null`) |
| Static status badge legend | Reference UI, not live alert |
| Placeholder route “coming soon” | Not operational state |

---

## 8. Things that Should NOT Appear

| Exclusion | Category | Rationale |
|-----------|----------|-----------|
| **“All Sections” nav grid** | Navigation duplication | Sidebar already provides; weakens command center narrative |
| **Featured shortcuts as plain link cards** | Passive navigation | Replace with counted quick actions |
| **Welcome / onboarding hero** | Marketing | Removed in UXR-1C; must not return |
| **Renewal rate, revenue trend charts** | Vanity / non-provisionable | Explicitly unavailable in authority |
| **Grace / suspended counts** | False precision | No CRS backing |
| **Menu items / categories / offers KPIs** | Analytics inventory | Wrong mental model for first screen |
| **Full accounts table** | Workspace duplication | Operations owns list CRUD |
| **Security delete / role dialogs** | Wrong risk level | Governance depth in Security |
| **Email operations UI** | Not built | Communications is in-app only today |
| **Launch Readiness scorecard (until live)** | Empty promise | Placeholder card pattern |
| **Health diagnostics raw dumps** | Wrong audience | Belongs in Health Center |
| **Recent activity feed (until API)** | Honest gap | `recentActivity.available: false` |
| **MoM growth badges** | Non-canonical | `growth.available: false` |

---

## 9. Proposed Information Hierarchy

Vertical read order for the Command Center — each level answers a sharper question.

```
Level 0 — Chrome (existing shell)
  Breadcrumb · Page title · Live status context (not static legend only)

Level 1 — Situation (above the fold)
  Executive Snapshot: MRR · Active subs · Active trials · Expiring 30d
  [Operational subline: active restaurants · total users]

Level 2 — Attention (primary body)
  Needs Attention panel: expiring · expired · canceled (counts + drill links)
  OR Phase 2: Priority Work Queue (top N owners with next action)

Level 3 — Health context (supporting)
  Subscription Health distribution: trial · active · canceled · expired · inactive
  (compact strip, not five hero KPIs)

Level 4 — Actions (intent shortcuts)
  Quick Actions: Accounts · Tenants · Announce · Commercial · Analytics
  (each with live count or last-known state where honest)

Level 5 — Readiness (as domains mature)
  Platform Health summary · Security summary · Launch Readiness summary
  (collapsed by default; expand on exception)

Level 6 — Navigation (minimal)
  Single “All workspaces” entry or sidebar reference — NOT nine duplicate cards
```

**Eye path:** Title → executive numbers → red/amber attention counts → queue or drill → quick action.

**Rhythm:** Situation → exception → distribution → intent → readiness → exit.

This hierarchy aligns with `OPERATIONS-EXPERIENCE-AUDIT.md`: Operations’ strength comes from toolbar → list → act; the Command Center adapts that to **count → queue → drill → act** at hub scope.

---

## 10. MVP Version

**Goal:** Transform Overview from navigation hub to **minimal command center** using **only existing read APIs and routes**. No new backend contracts.

### Data sources (all live today)

- `admin.getDashboardSummary` — executive KPIs  
- `admin.getCommercialOverview` — `needsAttention`, `subscriptionHealth`, `executive`  
- `admin.getOwnerOverviewList` — optional Phase 2-lite top-N (can defer)  
- Existing routes for drill-down  

### MVP content spec

| Block | Content |
|-------|---------|
| **Executive Snapshot** | 5 KPIs: MRR, active subscriptions, active trials, expiring 30d, total users — add trials (in summary API but not currently shown on Overview) |
| **Needs Attention** | Three counts: expiring, canceled, expired — mirror Commercial attention section on hub |
| **Quick Actions** | 4–5 pinned intents with counts: Accounts, Tenants, Communications, Commercial, Analytics |
| **Remove** | “All Sections” grid; demote featured shortcuts to quick actions |

### MVP interactions

- Every attention count links to Operations Accounts or Commercial  
- Quick actions link to domain workspaces  
- No hub CRUD; no search bar required for MVP  
- Keep `ReportsStatusIndicator` only if upgraded to show **live** counts tied to health buckets — otherwise demote or remove static legend  

### MVP non-goals

- Row-level priority queue  
- Security / Health / Launch Readiness summaries  
- Email operations  
- Recent activity  
- Global search  

### MVP success metrics (experiential)

- Operator can name top attention queue within 5 seconds of load  
- No navigation-only content below executive snapshot  
- First screen reads as “what’s happening” not “where can I go”  

---

## 11. Phase 2 Version

**Goal:** Add **work-queue depth** and **CS-owned widgets** moved from Commercial per REBUILD-5BD extraction plan.

### Added capabilities

| Capability | Dependency |
|------------|------------|
| **Priority Work Queue** | `getOwnerOverviewList` + prioritization rules (trial days, period end) |
| **Global owner search** | Reuse Accounts search pattern on hub |
| **Subscription Health strip** | Full five-bucket panel from `getCommercialOverview` |
| **Attention deep links** | Query-param filters on Accounts tab |
| **Trial-ending alert** | Client filter `trialStatus.daysRemaining ≤ 7` |
| **Communications status** | Surface `users.length` + link to bulk send |
| **Platform scale panel** | Secondary operational counts |

### Domain alignment (REBUILD-5)

- Move `CommercialOverviewNeedsAttention` + `CommercialOverviewSubscriptionHealth` **hosting** from Commercial page toward CS domain — Command Center becomes primary **consumer** of attention contract  
- Reports domain continues to own executive KPI assembly  
- Commercial page becomes deep reporting; hub becomes daily operator entry  

### Phase 2 non-goals

- Security Center UI  
- Health probe dashboard  
- Launch Readiness scorecard  
- Email delivery operations  
- Recent activity feed  

---

## 12. Future Mature Version

**Goal:** Full **cross-domain command center** as platform domains reach extraction readiness (REBUILD-5 order: Reports → CS → Security → Health → Launch Readiness).

### Mature content spec

| Domain | Mature hub contribution |
|--------|-------------------------|
| **Reports** | Executive snapshot + certified metadata freshness indicator (`schemaVersion`, `asOf`) |
| **Customer Success** | Priority queue + trial conversion + tenant exceptions + in-app comms status |
| **Commercial Operations** | Revenue exceptions only when canonical trends exist; until then, link to Commercial |
| **Email Operations** | Delivery health, last campaign, failure count — **after email ops layer ships** |
| **Platform Health** | Probe summary card: email, entitlements, runtime — from `/admin/health` |
| **Security Center** | Alert strip: suspicious activity, failed admin access, pending governance — from `/admin/security` |
| **Launch Readiness** | Certification progress: deployment auth, visibility inventory completion, blocking deps — from `/admin/launch-readiness` |
| **Recent Activity** | Admin event feed — requires `NO_ADMIN_COMMERCIAL_EVENT_READ_API` resolution |

### Mature interaction model

- **Filter → scan → drill → act** at hub level for top exceptions  
- **Exception-first readiness panels** — collapsed green by default, expand on failure  
- **Single “All workspaces”** drawer or compact list — sidebar remains canonical nav  
- **Role-aware hub** (future): operators see CS-heavy hub; technical users see Health/Readiness weighted — persona tuning without duplicating consoles  

### Mature architecture alignment

| Roadmap item | Hub impact |
|--------------|------------|
| `/admin/reports` merges commercial + analytics | Hub links to Reports; executive contract unchanged |
| `/admin/customer-success` replaces `/admin/operations` | Quick actions retarget; attention ownership clarifies |
| `/admin/security` center | Security alert area goes live |
| `/admin/health` center | Health alert area goes live |
| `/admin/launch-readiness` scorecard | Readiness section goes live |
| Grace / suspended workflows | New attention queues **only when CRS provisions them** |

### Mature anti-patterns to guard against

- Turning the hub into a second Operations table  
- Showing every Analytics chart on load  
- Certifying launch readiness without Health probe inputs  
- Displaying grace/suspended before authority exists  

---

## Domain Coverage Matrix

How each roadmap domain maps to the Command Center:

| Domain | First-screen role | Attention contribution | Hub actions | Maturity |
|--------|-------------------|------------------------|-------------|----------|
| **Admin Accounts** | Attention queues | Expiring, expired, canceled, trials | Drill to Accounts | MVP |
| **Tenants** | Exception alerts (Phase 2) | Venue without entitled owner | Drill to Tenants | Phase 2 |
| **Subscriptions** | Executive + health | Lifecycle buckets | Manage in Accounts | MVP |
| **Trials** | KPI + alert | Trial ending soon | Outreach via Communications | Phase 2 |
| **Commercial Operations** | Executive MRR | Revenue health context | Open Commercial / export | MVP |
| **Email Operations** | — | Delivery failures (future) | — | Mature (not built) |
| **Platform Health** | Readiness panel | Probe failures | Open Health Center | Mature |
| **Security Center** | Alert strip | Auth / governance events | Open Security Center | Mature |
| **Launch Readiness** | Certification summary | Launch blockers | Open Launch Readiness | Mature |

---

## Data Contract Reference

Authoritative exclusions and provisionable fields are defined in:

- `docs/commercial-audit/EXEC-7C.1-COMMERCIAL-OVERVIEW-DATA-CONTRACT.md`  
- `server/commercial/metrics/CommercialOverviewSnapshot.ts`  
- `client/src/lib/admin/dashboardSummaryKpis.ts` (Overview KPI mapping — no client derivation)

**Key invariant:** Command Center metrics must not introduce a second commercial resolver. All commercial signals compose from `CommercialReadService` / `CanonicalMetricsService`.

---

## Related Documents

| Document | Relationship |
|----------|--------------|
| `OPERATIONS-EXPERIENCE-AUDIT.md` | Experiential baseline; hub should inherit console rhythm not console table |
| `ADMIN-DASHBOARD-REBUILD-5BD.md` | Domain extraction order and CS widget relocation |
| `ADMIN-DASHBOARD-REBUILD-5BB.md` | Domain boundary resolutions |
| `EXEC-7C.1-COMMERCIAL-OVERVIEW-DATA-CONTRACT.md` | Canonical vs operational vs excluded metrics |
| `OVERVIEW-REPORTS-LAYOUT-AUDIT.md` | Shell architecture (out of scope for this discovery) |

---

## Summary

| Question | Answer |
|----------|--------|
| What deserves first-screen visibility? | Canonical executive snapshot + provisionable attention counts + quick drill actions |
| What needs immediate attention? | Expiring (30d), expired, canceled accounts; trial-ending (Phase 2) |
| What metrics are meaningful? | MRR, active subs, trials, expiring, entitled owners, subscription health buckets |
| What metrics are vanity? | Renewal rate, revenue trends, grace/suspended, inventory counts, growth deltas (until canonical) |
| What actions from Overview? | Drill to workspaces, announcements entry, reporting entry — not CRUD or governance |
| Fastest path? | **MVP:** attention panel + executive KPIs + quick actions, remove nav duplication |
| Full vision? | **Mature:** cross-domain alerts from Security, Health, Launch Readiness + activity feed |

---

*Discovery only. No implementation. No mockups. No code.*
