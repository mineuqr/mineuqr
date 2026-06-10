# REBUILD-4B — Section Extraction

**Program:** ADMIN-DASHBOARD-REBUILD-4  
**Phase:** 4B — Composition Layer Extraction

---

## Created: `client/src/components/admin/sections/`

### Foundation

| File | Role |
|------|------|
| `adminSectionContracts.ts` | Section header + loading contracts |
| `AdminPageSection.tsx` | Overview page section wrapper |
| `index.ts` | Barrel exports |

### Overview (`sections/overview/`)

| File | Extracted from |
|------|----------------|
| `NavShortcutCard.tsx` | `AdminDashboardHome` inline component |
| `OverviewStatusIndicator.tsx` | Shell `statusIndicator` |
| `OverviewWelcomeSection.tsx` | Welcome `<section>` |
| `OverviewKpiSection.tsx` | KPI grid + `getDashboardSummary` |
| `OverviewFeaturedShortcutsSection.tsx` | Featured shortcuts grid |
| `OverviewAllSectionsSection.tsx` | All-sections nav grid |
| `OverviewDashboardSections.tsx` | Composes all overview sections |

### Commercial (`sections/commercial/`)

| File | Extracted from |
|------|----------------|
| `useCommercialOverviewData.ts` | Query + label objects |
| `CommercialOverviewExportActions.tsx` | Shell `headerActions` |
| `CommercialOverviewSections.tsx` | All `AdminSection` blocks + error state |

### Analytics (`sections/analytics/`)

| File | Extracted from |
|------|----------------|
| `AnalyticsSummarySection.tsx` | `StatisticsPanel` wrapper |

### Placeholder (`sections/placeholder/`)

| File | Extracted from |
|------|----------------|
| `PlaceholderComingSoonIndicator.tsx` | Shell status indicator |
| `AdminRoutePlaceholderSection.tsx` | Placeholder card body |

---

## Extraction Rules Applied

- Markup and class names preserved verbatim
- Same tRPC queries and `adminQueriesEnabled` gating
- Same i18n keys
- `StatisticsPanel` left in `pages/admin/` (domain widget); section owns composition reference only

---

## Not Extracted (by design)

- `AdminManagement` tab bodies — operational workspace, not dashboard sections
- `AdminSection` layout primitive — reused as-is by commercial sections
- Route registry — unchanged from REBUILD-3B
