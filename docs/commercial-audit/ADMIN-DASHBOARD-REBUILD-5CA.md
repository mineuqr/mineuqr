# REBUILD-5CA — Reports Domain Registry

**Program:** ADMIN-DASHBOARD-REBUILD-5C  
**Phase:** 5CA — Reports Domain Registry  
**Mode:** Structural extraction (ownership only)

---

## Created: `client/src/lib/admin/domains/reports/`

| File | Responsibility |
|------|----------------|
| `reportsTypes.ts` | `ReportsAssetId`, `ReportsAssetCategory`, `ReportsSurfaceId`, `ReportsAssetDefinition` |
| `reportsDomain.ts` | `REPORTS_DOMAIN_ID`, `REPORTS_ASSET_DEFINITIONS` (22 assets), `REPORTS_COMPOSITION_SECTIONS` |
| `reportsRegistry.ts` | `getReportsAsset`, `getReportsAssetsBySurface`, `getReportsKpiAssets`, `getReportsExportAssets` |
| `index.ts` | Barrel exports |

---

## Domain Identity

```ts
REPORTS_DOMAIN_ID = "reports"
```

---

## Asset Categories

| Category | Count | Examples |
|----------|-------|----------|
| `kpi` | 1 | Home KPI strip |
| `executive` | 1 | Commercial executive KPIs |
| `analytics` | 1 | Analytics summary panel |
| `revenue` | 2 | Invoice PDF, user invoices API |
| `growth` | 1 | Extended stats API |
| `usage` | 1 | Plan distribution |
| `export` | 4 | Export actions, APIs, download helper |
| `metadata` | 2 | Status indicator, metadata panel |
| `widget` | 2 | Stat card, KPI section primitives |
| `api` | 6 | Dashboard/commercial/analytics/export procedures |
| `helper` | 4 | KPI mapping, currency formatters |

---

## Surface Mapping

| Surface | Route | Registered assets |
|---------|-------|-------------------|
| `overview` | `/admin` | Home KPI strip, status indicator, dashboard summary API |
| `commercial` | `/admin/commercial` | Executive, metadata, plan distribution, export |
| `analytics` | `/admin/analytics` | Analytics panel, export |

---

## Composition Sections Registry

```ts
REPORTS_COMPOSITION_SECTIONS = [
  "ReportsHomeKpiSection",
  "ReportsStatusIndicator",
  "ReportsExecutiveSection",
  "ReportsMetadataSection",
  "ReportsPlanDistributionSection",
  "ReportsCommercialBody",
  "ReportsCommercialPageContent",
  "ReportsExportActions",
  "ReportsAnalyticsSection",
]
```

No UI changes in this phase — registry is metadata ownership only.
