# ADMIN-UX-1E — Report Contracts

**Program:** Reporting & Export Layer  
**Date:** 2026-06-07  
**Status:** Design complete — implementation not started  
**Foundation:** [EXEC-7C-7-COMMERCIAL-OVERVIEW-CERTIFICATION.md](./EXEC-7C-7-COMMERCIAL-OVERVIEW-CERTIFICATION.md)

Stable reporting contracts. **No export-specific logic.** **No metric derivation in adapters.**

---

## 1. Contract Principles

| Rule | Requirement |
|------|-------------|
| Single source | All commercial report payloads derive from `CommercialOverviewSnapshot` or explicit extensions documented here |
| Versioned | Every report carries `reportVersion` + `definitionsRef` |
| Format-agnostic | Contracts are JSON-shaped payloads; CSV/Excel/PDF are views |
| Immutable snapshot | Report payload is a point-in-time copy; exports must not re-query alternate APIs |
| No adapter math | Export adapters format and layout only |

---

## 2. Common Envelope — `AdminReportEnvelope`

All admin reports share this metadata block.

```typescript
/** ADMIN-UX-1E — shared report header (audit-friendly). */
type AdminReportEnvelope = {
  /** Stable report identifier, e.g. "commercial-overview". */
  reportId: AdminReportId;
  /** Operator-facing title (locale resolved at presentation layer). */
  reportName: string;
  /** Contract version — bump when report shape changes. */
  reportVersion: "ADMIN-UX-1E.1";
  /** ISO instant when report payload was assembled. */
  generatedAt: string;
  /** ISO instant for data evaluation (snapshot asOf). */
  dataAsOf: string;
  /** Commercial authority provenance. */
  authority: {
    source: "S1_CANONICAL";
    metricsSource: "CANONICAL_OWNER";
    assembler: string; // e.g. CanonicalMetricsService.getCommercialOverviewSnapshot
  };
  /** Link to metric definitions document (stable path). */
  definitionsRef: "docs/commercial-audit/EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md";
  /** Locale hint for presentation adapters (optional). */
  locale?: "en" | "ar";
  /** Actor who triggered generation (admin user id), when available. */
  generatedByUserId?: number;
};
```

### Report identifiers

```typescript
type AdminReportId =
  | "commercial-overview"           // Primary — EXEC-7C certified
  | "subscriber-detail"             // Owner-level detail rows
  | "operational-summary"           // Entity counts extension
  | "internal-staff-exclusion";     // Future — ADMIN-AUTH-1
```

---

## 3. Primary Report — `CommercialOverviewReport`

**Maps 1:1 from** `CommercialOverviewSnapshot` **with envelope wrapper.**

This is the **default report** for dashboard display, CSV summary export, Excel workbook sheet 1, and PDF executive summary.

```typescript
type CommercialOverviewReport = {
  envelope: AdminReportEnvelope;
  executive: {
    commercialSubscribers: number;
    activeSubscriptions: number;
    activeTrials: number;
    mrr: number;
    arr: number;
    currency: "USD";
    activeRestaurants: number;
    totalUsers: number;
  };
  subscriptionHealth: {
    trial: number;
    active: number;
    canceled: number;
    expired: number;
    inactive: number;
  };
  needsAttention: {
    expiringWithin30Days: number;
    windowDays: 30;
    canceledAccounts: number;
    expiredAccounts: number;
    graceAccounts: null;
    suspendedAccounts: null;
  };
  planDistribution: {
    entries: Array<{
      planCode: CommercialPlan;
      ownerCount: number;
    }>;
  };
  operational: {
    activeRestaurants: number;
    totalUsers: number;
    /** Future — not in EXEC-7C snapshot. */
    restaurantDistribution: null | Array<{
      ownerId: number;
      restaurantCount: number;
    }>;
  };
  extensions: {
    recentActivity: {
      available: false;
      reason: "NO_ADMIN_COMMERCIAL_EVENT_READ_API";
    };
    growth: {
      available: false;
      reason: "NO_CANONICAL_GROWTH_METRIC";
    };
    internalStaff: {
      available: false;
      reason: "ADMIN_AUTH_1_NOT_IMPLEMENTED";
    };
  };
};
```

### Field stability matrix

| Section | EXEC-7C.1 field | Report contract | Breaking change policy |
|---------|-----------------|-----------------|------------------------|
| Executive KPIs | `executive.*` | Same names | Additive only in 1E.x |
| Health | `subscriptionHealth.*` | Same names | Additive only |
| Attention | `needsAttention.*` | Same names; null grace/suspended preserved | Authority must define before non-null |
| Plan distribution | `planDistribution.entries` | Same shape | Additive plan codes only |
| Operational | `executive.activeRestaurants`, `totalUsers` | Promoted to `operational` + mirrored in `executive` for UI parity | Deprecate duplicate in 2.x |

### Metric definitions binding

Each numeric field in `CommercialOverviewReport` **must** map to a definition in [EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md](./EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md). Export footers reference `definitionsRef`.

---

## 4. Detail Report — `SubscriberDetailReport`

Owner-level rows for tabular exports (CSV detail sheet, Excel detail tab).

**Source (single query):** `admin.getSubscriptionOverview` — CRS owner states joined with user identity.

**Not a separate authority path** — same CRS semantics as overview; detail is dimensional expansion only.

```typescript
type SubscriberDetailReport = {
  envelope: AdminReportEnvelope;
  rows: Array<{
    ownerId: number;
    ownerEmail: string | null;
    ownerName: string | null;
    ownerRole: "user" | "admin";
    planCode: CommercialPlan;
    planName: string | null;
    subscriptionStatus: SubscriptionStatus | null;
    billingCycle: "monthly" | "yearly" | null;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    isEntitled: boolean;
    countsInMrr: boolean;
  }>;
  summary: {
    rowCount: number;
    /** Must equal CommercialOverviewReport.executive.commercialSubscribers when filtered to entitled. */
    entitledCount: number;
  };
};
```

### Regression binding

Detail report `summary.entitledCount` must reconcile with `CommercialOverviewReport.executive.commercialSubscribers` when both are built from the same `asOf` instant.

---

## 5. Operational Report — `OperationalSummaryReport`

Entity-level metrics that are **not** subscription authority (certified EXEC-7C-7).

```typescript
type OperationalSummaryReport = {
  envelope: AdminReportEnvelope;
  counts: {
    totalUsers: number;
    totalRestaurants: number;
    activeRestaurants: number;
    totalMenuItems: number;
    totalCategories: number;
    totalOffers: number;
  };
  restaurantDistribution: null | Array<{
    ownerId: number;
    ownerEmail: string | null;
    restaurantCount: number;
    activeRestaurantCount: number;
  }>;
};
```

**Phase 1 implementation note:** `restaurantDistribution` requires `admin.listRestaurants` aggregation — operational only, no subscription fields.

---

## 6. Future Report — `InternalStaffMetricsReport`

Placeholder for ADMIN-AUTH-1. **Not generatable today.**

```typescript
type InternalStaffMetricsReport = {
  envelope: AdminReportEnvelope;
  available: false;
  reason: "ADMIN_AUTH_1_NOT_IMPLEMENTED";
  plannedSections: [
    "excludedInternalAccounts",
    "commercialSubscribersExcludingStaff",
    "mrrExcludingStaff",
  ];
};
```

---

## 7. Composite Export Package — `CommercialExportPackage`

When an operator exports "Commercial Overview", adapters receive one package:

```typescript
type CommercialExportPackage = {
  /** Required — certified snapshot report. */
  overview: CommercialOverviewReport;
  /** Optional — detail rows for tabular formats. */
  subscriberDetail?: SubscriberDetailReport;
  /** Optional — operational extension. */
  operational?: OperationalSummaryReport;
  /** Package-level checksum for regression tests. */
  snapshotFingerprint: string; // hash of overview + detail summary counts at asOf
};
```

**Rule:** CSV/Excel/PDF for commercial exports must be built from `CommercialExportPackage` assembled in **one server call**, not from client-side multi-query assembly.

---

## 8. Explicit Non-Reports (Out of Contract)

| Dataset | Reason excluded |
|---------|-----------------|
| `admin.getStatistics` (S6) | Legacy row aggregates — conflicts with CRS |
| `admin.getRevenueByMonth` | Time-series — separate Revenue History report (future) |
| `getExtendedStats.userGrowth` | Growth — `NO_CANONICAL_GROWTH_METRIC` |
| `generateInvoicePDF` | Billing document — Invoice report family (separate) |
| Restaurant sales Excel (`salesReport.ts`) | Restaurant-scoped operational export — not commercial |

---

## 9. Versioning Policy

| Version | Meaning |
|---------|---------|
| `ADMIN-UX-1E.1` | Initial reporting contracts |
| `EXEC-7C.1` | Underlying snapshot schema (unchanged) |

Bump `reportVersion` when:
- Adding required fields
- Renaming sections
- Changing reconciliation rules

Bump `EXEC-7C.1` only via commercial authority program — not via export layer.

---

## 10. Related Documents

- [ADMIN-UX-1E-REPORTING-EXPORT-ARCHITECTURE.md](./ADMIN-UX-1E-REPORTING-EXPORT-ARCHITECTURE.md) — service layer, adapters, regression
- [EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md](./EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md) — metric semantics
