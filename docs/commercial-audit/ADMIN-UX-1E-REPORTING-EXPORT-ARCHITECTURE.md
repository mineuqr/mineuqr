# ADMIN-UX-1E — Reporting & Export Architecture

**Program:** Reporting & Export Layer  
**Date:** 2026-06-07  
**Status:** Design complete — **implementation not started**  
**Mode:** Audit → Design → *(Implement → Validate)*  
**Foundation:** EXEC-7C.7 Commercial Overview certification

**Contracts:** [ADMIN-UX-1E-REPORT-CONTRACTS.md](./ADMIN-UX-1E-REPORT-CONTRACTS.md)

---

## 1. Executive Summary

ADMIN-UX-1E defines a unified reporting foundation:

```text
Commercial Overview (certified)
        ↓
  Report Builder Service
        ↓
  Report Contracts (format-agnostic)
        ↓
  Export Adapters (CSV | Excel | PDF)
        ↓
  Operator deliverables
```

**Architectural principle enforced:**

```text
Dashboard  ──┐
CSV Export ──┼──→  Same Report Payload  (never Query A / B / C)
Excel      ──┤
PDF        ──┘
```

No export implementation in this phase. Contracts and architecture only.

---

## 2. Phase A — Report Inventory Audit

### 2.1 Certified commercial datasets (reportable now)

| Dataset | Source procedure | Snapshot / contract | Currently on UI | Export today |
|---------|------------------|---------------------|-----------------|--------------|
| **Commercial Overview** | `admin.getCommercialOverview` | `CommercialOverviewSnapshot` | `/admin/commercial` | None |
| Executive: MRR, ARR | ↑ same | `executive.mrr`, `executive.arr` | Commercial Overview cards | None |
| Commercial Subscribers | ↑ same | `executive.commercialSubscribers` | Commercial Overview | None |
| Active Subscriptions | ↑ same | `executive.activeSubscriptions` | Contract only | None |
| Active Trials | ↑ same | `executive.activeTrials` | Contract only | None |
| Subscription Health | ↑ same | `subscriptionHealth.*` | Commercial Overview | None |
| Needs Attention | ↑ same | `needsAttention.*` | Commercial Overview | None |
| Plan Distribution | ↑ same | `planDistribution.entries` | Commercial Overview | None |
| Report Metadata | ↑ same | `metadata.*` | Commercial Overview (AR-UX-8) | None |
| Active Restaurants | ↑ same + entity counts | `executive.activeRestaurants` | Commercial Overview | None |
| Total Users | ↑ same | `executive.totalUsers` | Contract only | None |

### 2.2 Related canonical datasets (same authority, not yet unified)

| Dataset | Source procedure | Authority | UI consumer | Export today | Drift risk |
|---------|------------------|-----------|-------------|--------------|------------|
| Dashboard summary KPIs | `admin.getDashboardSummary` | CMS ← CRS | `/admin`, `/admin/operations` | None | **Medium** — separate query, parity-tested |
| Analytics MRR/ARR | `analytics.getMRR`, `analytics.getARR` | CMS ← CRS | `/admin/analytics` | None | **Medium** — 9 parallel queries on analytics page |
| Subscriber counts | `analytics.getSubscriberCounts` | CMS ← CRS | Analytics charts | None | Low — same CMS |
| Plan distribution | `analytics.getPlanDistribution` | CMS ← CRS | Analytics pie chart | None | Low |
| Subscriber detail rows | `admin.getSubscriptionOverview` | CRS per owner | Analytics table | **CSV** (client-side) | **High** — export uses different query than overview |
| Owner overview list | `admin.getOwnerOverviewList` | CRS | Operations users section | None | Low |
| Restaurant list + owner commercial | `admin.listRestaurants` | CRS display on venues | Operations restaurants | None | Operational |

### 2.3 Operational datasets (non-commercial authority)

| Dataset | Source | Report section | Restaurant sensitive |
|---------|--------|----------------|----------------------|
| Extended platform stats | `admin.getExtendedStats` | Operational summary | Partial |
| Revenue by month chart | `admin.getRevenueByMonth` | **Excluded** — no canonical time-series | No |
| Entity growth charts | `getExtendedStats.userGrowth` | **Excluded** — `NO_CANONICAL_GROWTH_METRIC` | No |
| Restaurant distribution | Derived from `listRestaurants` | Operational extension (planned) | Yes |

### 2.4 Legacy / forbidden for commercial reports

| Dataset | Source | Status | Must not feed commercial exports |
|---------|--------|--------|----------------------------------|
| S6 statistics | `admin.getStatistics` | Active on analytics page | **Yes** — row-level aggregates |
| `computeAdminMrr` | `adminKpiCalculations.ts` | Legacy helper | **Yes** |
| Restaurant-scoped subscriptions | Retired admin APIs | Blocked | **Yes** |

### 2.5 Existing export implementations (inventory)

| Export | Location | Data source | Problem |
|--------|----------|-------------|---------|
| Subscription CSV | `StatisticsPanel.exportToCSV` | `getSubscriptionOverview` only | No overview KPIs; client-side; separate from commercial page |
| Invoice PDF | `admin.generateInvoicePDF` | Single owner invoice | Correct domain — billing, not commercial overview |
| Sales Excel | `client/src/lib/excel/salesReport.ts` | Restaurant sales rows | Restaurant operational — separate report family |
| Commercial Overview | `/admin/commercial` | Single snapshot | **No export** — target for 1E |

### 2.6 Future datasets (planned, not available)

| Dataset | Blocker | Contract placeholder |
|---------|---------|---------------------|
| Internal staff metrics | ADMIN-AUTH-1 | `InternalStaffMetricsReport` |
| Grace / suspended counts | No CRS authority | `null` in snapshot |
| Recent activity feed | No event read API | `recentActivity.available: false` |
| Growth metrics | No canonical growth | `growth.available: false` |
| Restaurant distribution | Not in snapshot | `operational.restaurantDistribution` |
| Scheduled reports | No job infrastructure | Future ADMIN-UX-1F |

### 2.7 Phase A conclusion

**Reporting surface to implement:**

1. **Commercial Overview Report** (primary)
2. **Subscriber Detail Report** (tabular companion)
3. **Operational Summary Report** (entity extension)

**Retire from commercial export path:** client-side CSV on analytics page (replace with server-built package).

---

## 3. Phase B — Reporting Contract Design

Formal contracts: **[ADMIN-UX-1E-REPORT-CONTRACTS.md](./ADMIN-UX-1E-REPORT-CONTRACTS.md)**

Summary of report types:

| Report ID | Purpose | Primary consumer |
|-----------|---------|------------------|
| `commercial-overview` | Certified KPI snapshot | Dashboard, PDF summary, Excel sheet 1 |
| `subscriber-detail` | Owner-level rows | CSV, Excel detail sheet |
| `operational-summary` | Entity counts | Excel operational sheet |
| `internal-staff-exclusion` | Future ADMIN-AUTH-1 | Filtered commercial reports |

---

## 4. Phase C — Reporting Service Layer

### 4.1 Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                  CommercialReportService                     │
│  server/commercial/reporting/CommercialReportService.ts      │
├─────────────────────────────────────────────────────────────┤
│  buildCommercialOverviewReport(now?)                         │
│  buildSubscriberDetailReport(now?)                           │
│  buildOperationalSummaryReport(now?)                         │
│  buildCommercialExportPackage(now?, options?)  ← main entry  │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
   CanonicalMetricsService   commercialReadService   resolveAdminDashboardEntityCounts
   .getCommercialOverviewSnapshot   .getAllOwnerCommercialStates   + getExtendedAdminStats
           │               │               │
           └───────────────┴───────────────┘
                           │
                  CommercialExportPackage
                  (report contracts only)
```

### 4.2 Service responsibilities

| Responsibility | Owner | Forbidden |
|----------------|-------|-----------|
| Load CRS owner states once per package | `CommercialReportService` | Per-adapter queries |
| Map snapshot → `CommercialOverviewReport` | Report builder | Metric re-derivation |
| Attach `AdminReportEnvelope` | Report builder | Ad-hoc metadata per format |
| Compute `snapshotFingerprint` | Report builder | Client-side hash |
| Reconciliation checks | Report builder | Silent mismatch |

### 4.3 Proposed API surface

```typescript
// server/commercial/reporting/CommercialReportService.ts

class CommercialReportService {
  constructor(
    private readonly metrics = canonicalMetricsService,
    private readonly readService = commercialReadService,
  ) {}

  /** Primary entry — one asOf, one CRS load for overview + optional detail. */
  async buildCommercialExportPackage(
    options?: {
      now?: Date;
      includeSubscriberDetail?: boolean;
      includeOperational?: boolean;
      locale?: "en" | "ar";
      generatedByUserId?: number;
    }
  ): Promise<CommercialExportPackage>;

  async buildCommercialOverviewReport(now?: Date): Promise<CommercialOverviewReport>;
  async buildSubscriberDetailReport(now?: Date): Promise<SubscriberDetailReport>;
  async buildOperationalSummaryReport(now?: Date): Promise<OperationalSummaryReport>;
}
```

### 4.4 tRPC exposure (implementation phase)

```typescript
// Proposed — not implemented
admin.buildCommercialExportPackage: protectedProcedure
  .input(z.object({
    now: z.string().datetime().optional(),
    includeSubscriberDetail: z.boolean().optional(),
    includeOperational: z.boolean().optional(),
  }))
  .query(...)
```

**Dashboard migration:** `/admin/commercial` may continue calling `getCommercialOverview` until migration; export **must** use `buildCommercialExportPackage` from day one of export implementation.

**Parity rule:** `buildCommercialOverviewReport` executive section must byte-match `getCommercialOverview` snapshot fields at same `asOf` (existing exec7c2 tests extend).

### 4.5 File layout (proposed)

```text
server/commercial/reporting/
  CommercialReportService.ts      # Builder
  CommercialReportService.test.ts # Reconciliation tests
  reportContracts.ts              # Type re-exports from docs/codegen
  snapshotFingerprint.ts          # Deterministic hash helper
  reconcileReports.ts             # overview ↔ detail count checks
```

---

## 5. Phase D — Export Adapter Architecture

### 5.1 Adapter principle

```text
Report Contract  →  Adapter  →  Bytes / File
                 (presentation only)
```

Adapters **never**:
- Call tRPC or DB
- Compute MRR, ARR, counts, or distributions
- Apply commercial authority rules

Adapters **may**:
- Format numbers (locale, currency symbol)
- Layout tables, charts, headers, footers
- Translate labels via i18n
- Apply column ordering for CSV

### 5.2 Adapter registry

```text
server/commercial/reporting/adapters/
  ReportAdapter.ts           # interface
  CsvReportAdapter.ts
  ExcelReportAdapter.ts
  PdfReportAdapter.ts
```

```typescript
interface ReportAdapter<TOutput> {
  readonly format: "csv" | "xlsx" | "pdf";
  render(package: CommercialExportPackage, options: AdapterRenderOptions): Promise<TOutput>;
}

type AdapterRenderOptions = {
  locale: "en" | "ar";
  filename?: string;
};
```

### 5.3 Format mapping

| Format | Input package | Output structure | Existing code to reuse |
|--------|---------------|------------------|------------------------|
| **CSV** | `CommercialExportPackage` | Summary section + detail rows | Replace `StatisticsPanel.exportToCSV` logic |
| **Excel** | `CommercialExportPackage` | Sheet 1: Overview KPIs; Sheet 2: Detail; Sheet 3: Operational | `excel/reportLayout.ts`, `salesReport.ts` patterns |
| **PDF** | `CommercialOverviewReport` only (phase 1) | Executive + health + metadata footer | `invoice-pdf.ts` infrastructure (layout only) |

### 5.4 CSV adapter layout (design)

```text
# Commercial Overview Report
# Report Version: ADMIN-UX-1E.1
# Generated At: {envelope.generatedAt}
# Data As Of: {envelope.dataAsOf}
# Authority: S1_CANONICAL
# Definitions: EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md

Section,Metric,Value
Executive,MRR,{overview.executive.mrr}
Executive,ARR,{overview.executive.arr}
...

# Subscriber Detail (if included)
Owner Email,Owner Name,Plan,Status,...
```

### 5.5 Excel adapter layout (design)

| Sheet | Content |
|-------|---------|
| Overview | KPI table + health + attention + plan distribution |
| Subscribers | Detail rows (if `includeSubscriberDetail`) |
| Operational | Entity counts + restaurant distribution (when available) |
| Metadata | Envelope audit block |

Reuse: `reportTheme.ts`, `reportLayout.ts` — branding consistent with restaurant sales exports but **data from report package only**.

### 5.6 PDF adapter layout (design)

| Section | Content |
|---------|---------|
| Header | Report name, generated at, data as of |
| Executive KPIs | 4-card equivalent row |
| Health + Attention | Compact tables |
| Footer | Authority source, definitions ref, report version |

Phase 1 PDF: overview only. Detail rows optional phase 2 (pagination).

### 5.7 Client integration (implementation phase)

```text
/admin/commercial
  └── Export dropdown
        └── trpc.admin.exportCommercialReport({ format: "csv" | "xlsx" | "pdf" })
              └── CommercialReportService.buildCommercialExportPackage()
              └── Adapter.render()
              └── Return { filename, mimeType, base64 | url }
```

**No client-side metric assembly.**

---

## 6. Phase E — Metadata & Auditability Standards

Every exported artifact must include:

| Field | Source | Display location |
|-------|--------|------------------|
| Report Name | `envelope.reportName` | Header / filename prefix |
| Report Version | `envelope.reportVersion` | Header + footer |
| Generated At | `envelope.generatedAt` | Header (locale formatted) |
| Data As Of | `envelope.dataAsOf` | Header |
| Authority Source | `envelope.authority.source` | Footer |
| Metrics Source | `envelope.authority.metricsSource` | Footer |
| Assembler | `envelope.authority.assembler` | Footer (technical audits) |
| Definitions Reference | `envelope.definitionsRef` | Footer |
| Generated By | `envelope.generatedByUserId` | Audit log / optional footer |

### Operator-readable footer (example)

```text
Report: Commercial Overview
Version: ADMIN-UX-1E.1
Generated: Jun 7, 2026, 8:35 PM (Riyadh)
Data as of: Jun 7, 2026, 8:35 PM (Riyadh)
Authority: Unified commercial authority (S1_CANONICAL)
Metrics basis: Owner subscription records
Definitions: EXEC-7C-7 Commercial Metric Definitions
```

### Audit log (implementation recommendation)

Log `reportId`, `reportVersion`, `asOf`, `format`, `generatedByUserId`, `snapshotFingerprint` on each export — no PII in fingerprint.

---

## 7. Phase F — Regression Validation Matrix

### 7.1 Cross-surface parity (required)

For identical `asOf` instant and `CommercialExportPackage`:

| Field | Dashboard (`/admin/commercial`) | CSV | Excel Overview sheet | PDF |
|-------|--------------------------------|-----|----------------------|-----|
| MRR | `snapshot.executive.mrr` | `overview.executive.mrr` | Same | Same |
| ARR | `snapshot.executive.arr` | Same | Same | Same |
| Commercial Subscribers | `snapshot.executive.commercialSubscribers` | Same | Same | Same |
| Health: active | `snapshot.subscriptionHealth.active` | Same | Same | Same |
| Expiring ≤30d | `snapshot.needsAttention.expiringWithin30Days` | Same | Same | Same |
| Plan: PROFESSIONAL count | `planDistribution` entry | Same | Same | Same |
| Active Restaurants | `snapshot.executive.activeRestaurants` | Same | Same | Same |

**Tolerance:** `0` for integer counts; `0.00` for USD revenue (matching CMS rounding).

### 7.2 Detail reconciliation

| Check | Rule |
|-------|------|
| Detail entitled count | `subscriberDetail.summary.entitledCount === overview.executive.commercialSubscribers` |
| Detail row count | `subscriberDetail.summary.rowCount === getAllUsers().length` |
| MRR row sum | Not required — MRR is aggregate, not sum of rows |

### 7.3 Negative tests (must fail build)

| Scenario | Expected |
|----------|----------|
| Adapter computes MRR locally | Lint / code review rejection |
| CSV uses `getStatistics` | Test failure |
| Excel uses parallel `analytics.getMRR` | Test failure |
| PDF `asOf` differs from overview | Test failure |
| Export without envelope metadata | Test failure |

### 7.4 Automated test plan (implementation phase)

```text
CommercialReportService.test.ts
  ✓ overview report matches getCommercialOverview at fixed now
  ✓ export package fingerprint stable for fixture data
  ✓ detail entitledCount reconciles with overview

adapters/
  ✓ CsvReportAdapter renders fixture package without mutation
  ✓ ExcelReportAdapter KPI cells match input numbers exactly
  ✓ PdfReportAdapter includes required metadata footer

e2e (optional)
  ✓ exportCommercialReport csv → parse → MRR matches dashboard
```

### 7.5 Migration regression

| Legacy surface | Action |
|----------------|--------|
| `StatisticsPanel.exportToCSV` | Replace with server export; remove client CSV builder |
| Analytics 9-query page | Out of scope for 1E — document as separate ADMIN-UX-1F convergence |
| `getDashboardSummary` on home | Acceptable until dashboard consumes report package |

---

## 8. Implementation Sequence (Post-Design)

| Step | Task | Depends on |
|------|------|------------|
| 1 | `reportContracts.ts` types from this doc | Design ✅ |
| 2 | `CommercialReportService` + tests | Step 1 |
| 3 | `admin.exportCommercialReport` tRPC | Step 2 |
| 4 | CSV adapter + wire Commercial Overview export button | Step 3 |
| 5 | Excel adapter | Step 4 |
| 6 | PDF adapter | Step 4 |
| 7 | Retire `StatisticsPanel` client CSV | Step 4 |
| 8 | Scheduled reports (future) | Step 6 |

---

## 9. Exit Criteria Checklist

| # | Criterion | Design phase |
|---|-----------|--------------|
| 1 | Reporting contracts defined | ✅ [ADMIN-UX-1E-REPORT-CONTRACTS.md](./ADMIN-UX-1E-REPORT-CONTRACTS.md) |
| 2 | Report generation centralized (designed) | ✅ `CommercialReportService` |
| 3 | Export formats consume identical payloads (designed) | ✅ `CommercialExportPackage` |
| 4 | No duplicate KPI calculations in adapters (designed) | ✅ adapter rules |
| 5 | Metadata standards documented | ✅ §6 |
| 6 | Regression matrix documented | ✅ §7 |
| 7 | Implementation complete | ⏳ Next phase |

**ADMIN-UX-1E design phase complete.** Ready for implementation.

---

## 10. Related Documents

- [ADMIN-UX-1E-REPORT-CONTRACTS.md](./ADMIN-UX-1E-REPORT-CONTRACTS.md)
- [EXEC-7C-7-COMMERCIAL-OVERVIEW-CERTIFICATION.md](./EXEC-7C-7-COMMERCIAL-OVERVIEW-CERTIFICATION.md)
- [EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md](./EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md)
- [AR-UX-8-METADATA-PRESENTATION-POLISH.md](./AR-UX-8-METADATA-PRESENTATION-POLISH.md)
