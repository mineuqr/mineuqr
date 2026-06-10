# REBUILD-5BD — Domain Extraction Readiness

**Program:** ADMIN-DASHBOARD-REBUILD-5B  
**Phase:** 5BD — Domain Extraction Readiness  
**Mode:** Audit + Architecture Mapping

Readiness assessment for each approved platform domain. Scores reflect **extraction readiness today** given 5BA ownership and 5BB boundary resolutions.

**Scoring:** 1 (not ready) → 5 (extract immediately)

**Complexity:** Low · Medium · High · Very High

---

## 1. Summary Matrix

| Domain | Readiness (1–5) | Extraction complexity | Live assets | Placeholder route | Recommended order |
|--------|-----------------|----------------------|-------------|-------------------|-------------------|
| **Reports** | **4** | Medium | 48 | `/admin/reports` (empty) | **1st** |
| **Customer Success** | **4** | High | 52 | `/admin/customer-success` (empty) | **2nd** |
| **Security** | **3** | Medium | 28 | `/admin/security` (empty) | **3rd** |
| **Health** | **2** | Low | 6 | `/admin/health` (empty) | **4th** |
| **Launch Readiness** | **2** | Medium | 24 | `/admin/launch-readiness` (empty) | **5th** |

---

## 2. Customer Success

### Readiness score: **4 / 5**

| Factor | Assessment |
|--------|------------|
| Live functionality | **Strong** — Operations monolith (accounts, tenants, communications) is fully operational |
| API coverage | **Strong** — 11 wired procedures; 2 unwired (`getOwnerOverview`, `getSubscriptionOverview`) ready to wire |
| UI components | **Strong** — Tabs, forms, operations primitives exist |
| Route readiness | **Partial** — `/admin/customer-success` placeholder; live work at `/admin/operations` |
| Boundary clarity | **Resolved** — Security controls decomposed out (5BB) |

### Extraction complexity: **High**

| Blocker | Impact |
|---------|--------|
| `AdminManagement.tsx` monolith (~1,596 lines) | Must split AccountsTab, TenantsTab, CommunicationsTab |
| Security controls embedded in AccountsTab | Must extract to Security domain or invoke via Security-owned modals |
| Commercial widgets on wrong page | `NeedsAttention` + `SubscriptionHealth` must move from `/admin/commercial` |
| `/admin/tenants` nav points to operations tab | Nav update deferred to extraction program (out of 5B scope) |

### Recommended extraction steps

1. Extract `CommercialOverviewNeedsAttention` + `CommercialOverviewSubscriptionHealth` from Commercial page → CS domain page
2. Promote `CommunicationsTab` to CS workspace (lowest coupling)
3. Extract `TenantsTab` → CS tenants workspace
4. Extract `AccountsTab` lifecycle portions; leave Security control invocation points
5. Wire `getOwnerOverview` + `getSubscriptionOverview` for owner 360 view
6. Retire `/admin/operations` route after CS workspace complete

### Dependencies to satisfy first

- Reports extraction can proceed in parallel (low coupling)
- Security control extraction should follow or run concurrent with AccountsTab split

---

## 3. Reports

### Readiness score: **4 / 5**

| Factor | Assessment |
|--------|------------|
| Live functionality | **Strong** — Commercial page + Analytics page + Overview KPIs fully operational |
| API coverage | **Strong** — All reporting APIs wired except `getUserInvoices`, `getCommercialExportPackage` |
| UI components | **Strong** — Full widget library, export pipeline, `StatisticsPanel` |
| Route readiness | **Partial** — `/admin/reports` empty; live at `/admin/commercial` + `/admin/analytics` |
| Boundary clarity | **Resolved** — CS widgets identified for removal (5BB) |

### Extraction complexity: **Medium**

| Blocker | Impact |
|---------|--------|
| Two live routes to merge | `/admin/commercial` + `/admin/analytics` → `/admin/reports` |
| CS widgets on commercial page | Must extract before or during Reports page build |
| Placeholder charts (revenue trend, renewal rate) | Reports owns widgets; data sources not yet canonical |
| `AdminKPISection` orphan | Consolidate with `OverviewKpiSection` during extraction |

### Recommended extraction steps

1. Build `/admin/reports` hub with executive + analytics sub-views
2. Migrate `CommercialOverviewSections` (minus CS widgets) → Reports executive view
3. Migrate `StatisticsPanel` → Reports analytics view
4. Migrate `OverviewKpiSection` → Reports (or Reports section on `/admin` entry)
5. Consolidate export to single Reports header
6. Retire `/admin/commercial` and `/admin/analytics` routes (redirect → reports)

### Dependencies to satisfy first

- None blocking — **recommended first extraction** (most live assets, clearest ownership)

---

## 4. Security

### Readiness score: **3 / 5**

| Factor | Assessment |
|--------|------------|
| Live functionality | **Backend strong, UI weak** — All gates, audits, guards operational; no Security Center UI |
| API coverage | **Strong** — Role, classification, internal user, delete APIs wired; `resetSubscriberPassword` unwired |
| UI components | **Embedded only** — Controls live inside AccountsTab, not standalone |
| Route readiness | **Empty** — `/admin/security` placeholder only |
| Boundary clarity | **Resolved** — Controls decomposed from AccountsTab (5BB) |

### Extraction complexity: **Medium**

| Blocker | Impact |
|---------|--------|
| No security viewer UI | Must build audit timeline, access reports, suspicious activity dashboard |
| Controls embedded in CS workspace | Extract modals/forms to Security-owned components |
| `listAllUsers` unwired | Retire during extraction |
| Auth gate is cross-cutting | Stays as Security infrastructure — not extracted per domain |

### Recommended extraction steps

1. Build `/admin/security` shell page
2. Extract role edit, classification edit, internal user, delete user modals → Security components
3. Build audit log viewer consuming `accountClassificationAudit` + `authAudit` signals
4. Wire `resetSubscriberPassword` to Security credential management
5. Replace embedded AccountsTab controls with Security component imports (CS hosts, Security owns)
6. Retire `listAllUsers` API

### Dependencies to satisfy first

- Customer Success AccountsTab decomposition (Security controls need new home)
- Can begin Security **API/UI component** work in parallel with Reports extraction

---

## 5. Health

### Readiness score: **2 / 5**

| Factor | Assessment |
|--------|------------|
| Live functionality | **Minimal** — `CommercialDiagnostics` exists outside admin shell |
| API coverage | **Weak** — `getExtendedStats` unwired; no health probe APIs |
| UI components | **Partial** — `CommercialEntitlementsDiagnostics` only |
| Route readiness | **Empty** — `/admin/health` placeholder |
| Boundary clarity | **Resolved** — Distinct from Launch Readiness (5BB) |

### Extraction complexity: **Low** (greenfield UI, small asset count)

| Blocker | Impact |
|---------|--------|
| No platform health APIs | Must define DB/email/queue probe endpoints |
| Diagnostics on non-admin route | Relocate `/commercial/diagnostics` → `/admin/health` |
| Ops logging not surfaced | Must build signal aggregation UI |

### Recommended extraction steps

1. Build `/admin/health` shell inside admin console
2. Relocate `CommercialDiagnostics` → `/admin/health/diagnostics` (or sub-section)
3. Define health probe APIs (email, DB, webhook — as needed)
4. Surface ops signal stream in Health dashboard
5. Wire `getExtendedStats` if growth monitoring belongs in Health (currently Reports-owned — Health consumes as probe display only if needed)

### Dependencies to satisfy first

- Launch Readiness shell (admin console frame) — shared with all domains
- Security gate (already live)

---

## 6. Launch Readiness

### Readiness score: **2 / 5**

| Factor | Assessment |
|--------|------------|
| Live functionality | **Minimal** — Shell infra, legacy redirects, deprecated API retirement queue |
| API coverage | **Partial** — `deploymentReadiness` exists; no readiness scorecard API |
| UI components | **Placeholder only** — `PlaceholderComingSoonIndicator`, welcome/shortcut sections |
| Route readiness | **Empty** — `/admin/launch-readiness` placeholder |
| Boundary clarity | **Resolved** — Certification vs runtime health (5BB) |

### Extraction complexity: **Medium** (mostly new UI + scoring logic)

| Blocker | Impact |
|---------|--------|
| No readiness scorecard | Must design checklist, scoring, blocker registry |
| Depends on Health + Reports inputs | Cannot ship until probe and schema inputs available |
| Owns admin shell infra | Shell extraction is platform-wide — affects all domains |
| Deprecated API cleanup | 6 deprecated procedures to retire |

### Recommended extraction steps

1. Build `/admin/launch-readiness` scorecard UI
2. Integrate Health probe pass/fail as certification inputs
3. Integrate Reports schema version as commercial readiness input
4. Integrate `deploymentReadiness` + `featureVisibility` inventory
5. Retire deprecated admin APIs (restaurant-scoped subscriptions, legacy statistics)
6. Consolidate admin shell ownership (route registry, sidebar, legacy redirects)
7. Migrate `OverviewWelcomeSection` + shortcut sections to Launch Readiness entry or retire

### Dependencies to satisfy first

- **Health** probe surfaces (readiness inputs)
- **Reports** schema metadata (commercial readiness input)
- Recommended **last** extraction — consumes outputs from other domains

---

## 7. Recommended Extraction Order

```text
Phase 1 ── Reports          (readiness 4, complexity medium, most live assets)
Phase 2 ── Customer Success (readiness 4, complexity high, largest monolith)
Phase 3 ── Security          (readiness 3, complexity medium, backend-ready)
Phase 4 ── Health            (readiness 2, complexity low, greenfield UI)
Phase 5 ── Launch Readiness  (readiness 2, complexity medium, depends on 3+4)
```

### Rationale

| Order | Why |
|-------|-----|
| **Reports first** | Clearest ownership; frees `/admin/commercial` + `/admin/analytics` for retirement; removes CS widget conflict on commercial page |
| **Customer Success second** | Largest live surface; benefits from Reports already extracted (CS widgets no longer on commercial page) |
| **Security third** | Needs AccountsTab decomposition from CS extraction; backend already complete |
| **Health fourth** | Small asset count; greenfield; unblocks Launch Readiness inputs |
| **Launch Readiness last** | Consumes Health probes + Reports metadata; owns shell retirement + deprecated API cleanup |

---

## 8. Per-Domain Readiness Checklist

| Criterion | CS | Reports | Security | Health | Launch |
|-----------|:--:|:-------:|:--------:|:------:|:------:|
| Single owner assigned (5BA) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Overlaps resolved (5BB) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dependencies documented (5BC) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Live route exists | ⚠️ ops | ⚠️ commercial/analytics | ❌ | ❌ | ❌ |
| APIs wired | ✅ | ✅ | ⚠️ | ❌ | ⚠️ |
| UI components exist | ✅ | ✅ | ⚠️ embedded | ⚠️ partial | ❌ |
| Placeholder route registered | ✅ | ✅ | ✅ | ✅ | ✅ |
| Extraction can begin | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |

---

## 9. Out of Scope Confirmation

REBUILD-5B performed ownership mapping and readiness assessment only. No components moved, no routes created, no pages built, no navigation or permissions modified.

**Next program (REBUILD-5C+):** Domain extraction implementation following the order in §7.
