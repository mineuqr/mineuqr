# REBUILD-5CC — Reports Composition Layer

**Program:** ADMIN-DASHBOARD-REBUILD-5C  
**Phase:** 5CC — Reports Composition Layer

---

## Created: `client/src/components/admin/domains/reports/`

| Component | Wraps / owns | Surface |
|-----------|--------------|---------|
| `useReportsCommercialOverviewData` | `getCommercialOverview` query + labels | Commercial |
| `ReportsHomeKpiSection` | Overview KPI strip (5 `AdminStatCard`) | `/admin` |
| `ReportsStatusIndicator` | Status badge legend | `/admin` shell |
| `ReportsExecutiveSection` | `CommercialOverviewExecutiveKpis` | `/admin/commercial` |
| `ReportsMetadataSection` | `CommercialOverviewMetadataPanel` | `/admin/commercial` |
| `ReportsPlanDistributionSection` | `CommercialOverviewPlanDistribution` | `/admin/commercial` |
| `ReportsCommercialPageContent` | Error boundary + ordered reports sections with CS slot | `/admin/commercial` |
| `ReportsCommercialBody` | Thin wrapper over `ReportsCommercialPageContent` | `/admin/commercial` |
| `ReportsExportActions` | `CommercialExportButtons` | `/admin/commercial` header |
| `ReportsAnalyticsSection` | `StatisticsPanel` | `/admin/analytics` |

---

## Composition Architecture

```text
Reports Domain Layer
├── Data
│   └── useReportsCommercialOverviewData
├── Overview surface
│   ├── ReportsHomeKpiSection
│   └── ReportsStatusIndicator
├── Commercial surface
│   ├── ReportsExportActions (header)
│   └── ReportsCommercialPageContent
│       ├── ReportsExecutiveSection
│       ├── ReportsMetadataSection
│       ├── [Customer Success slot]
│       └── ReportsPlanDistributionSection
└── Analytics surface
    └── ReportsAnalyticsSection → StatisticsPanel
```

---

## Section Order Preservation

Commercial page legacy section order preserved:

1. Executive KPIs (Reports)
2. Metadata panel (Reports)
3. Subscription health (Customer Success — slot)
4. Needs attention (Customer Success — slot)
5. Plan distribution (Reports)

`ReportsCommercialPageContent` accepts `betweenMetadataAndPlan` slot to maintain order without Reports owning CS widgets.

---

## No UI Redesign

All composition components wrap existing widgets with identical:

- CSS classes
- i18n keys
- Query hooks and `enabled` gating
- Loading boundaries
- Error states

`StatisticsPanel` remains in `pages/admin/` — wrapped, not moved.
