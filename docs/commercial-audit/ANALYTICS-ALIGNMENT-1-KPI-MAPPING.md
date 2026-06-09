# ANALYTICS-ALIGNMENT-1 — KPI Mapping Matrix

**Date:** 2026-06-09  
**Status:** Complete  

---

## Class A — Exact equivalent (shared certified source)

| Analytics KPI | Commercial Overview KPI | Same Definition | Notes |
|---------------|-------------------------|-----------------|-------|
| Entitled Owners | `executive.commercialSubscribers` | Yes | CRS `isEntitled` count |
| Active (subtitle) | `executive.activeSubscriptions` | Yes | CRS `subscriptionStatus === "active"` |
| Estimated MRR (USD) | `executive.mrr` | Yes | CRS `countsInMrr` + plan prices |
| ARR (USD) | `executive.arr` | Yes | MRR × 12 |
| Active (status grid) | `subscriptionHealth.active` | Yes | CRS health buckets |
| Trial | `subscriptionHealth.trial` | Yes | CRS health buckets |
| Expired | `subscriptionHealth.expired` | Yes | **Aligned** — was S6 legacy, now CRS |
| Canceled | `subscriptionHealth.canceled` | Yes | **Aligned** — was S6 legacy, now CRS |
| Owners by Plan (pie) | `planDistribution.entries` | Yes | Same `planCode` / `ownerCount` |
| Subscription table rows | Export `subscriberReport.rows` | Yes | One row per owner from CRS |
| Total Users (platform) | `executive.totalUsers` / `operational.counts.totalUsers` | Yes | Entity count at same `asOf` |
| Active Restaurants | `executive.activeRestaurants` | Yes | Entity count (commercial page only) |

**Source path (post-alignment):**

```text
getCommercialOverviewSnapshot()
        ↓
CommercialReportService.buildCommercialExportPackage()
        ↓
projectCommercialAnalytics()
        ↓
admin.getCommercialAnalytics
```

---

## Class B — Different presentation, same underlying data

| Analytics surface | Commercial source | Notes |
|-------------------|-------------------|-------|
| Pie chart (Owners by Plan) | `planDistribution.entries` | Visualization only; no recalculation |
| Subscription status grid | `subscriptionHealth` | Grid layout vs Commercial Overview cards |
| Subscription overview table | `subscriberReport.rows` | Table columns mapped from report contract |
| Platform overview cards | `operationalReport.counts` | Five entity counts from operational extension |

---

## Class C — Analytics-only / intentionally unavailable

| Analytics KPI | Commercial equivalent | Status | Reason |
|---------------|----------------------|--------|--------|
| Renewal Rate | None | **Unavailable** | `NO_CANONICAL_RENEWAL_METRIC` — S6 legacy retired from analytics |
| Revenue by Month chart | None | **Unavailable** | `NO_CANONICAL_REVENUE_TREND` — no certified time-series |
| User & Restaurant Growth chart | `growth.available: false` on snapshot | **Operational extension** | DB entity signup buckets via `getExtendedAdminStats.userGrowth`; not commercial authority |

---

## Intentional differences (documented)

| Item | Analytics | Commercial Overview | Why |
|------|-----------|---------------------|-----|
| Renewal Rate card | Shows "—" (unavailable) | Not shown | No certified renewal definition |
| Revenue by Month | Placeholder | Not shown | Export marks growth unavailable |
| User growth chart | Shown when DB data exists | Not shown | Platform operational metric, not commercial KPI |
| Needs attention panel | Not on analytics page | `needsAttention` section | Analytics focuses on historical charts; attention metrics available on `/admin/commercial` and exports |
| Metadata panel | Not on analytics page | `metadata` section | Commercial page is certification surface |

---

## Retired analytics sources (no longer used on `/admin/analytics`)

| Retired query | Was used for | Replacement |
|---------------|--------------|-------------|
| `analytics.getMRR` | MRR card | `getCommercialAnalytics` → `commercial.executive.mrr` |
| `analytics.getARR` | ARR card | `getCommercialAnalytics` → `commercial.executive.arr` |
| `analytics.getSubscriberCounts` | Entitled / status | `commercial.executive` + `subscriptionHealth` |
| `analytics.getPlanDistribution` | Pie chart | `commercial.planDistribution` |
| `admin.getSubscriptionOverview` | Table rows | `analytics.subscribers` |
| `admin.getDashboardSummary` | MRR fallback / users | `commercial.executive` + `platform` |
| `admin.getStatistics` | Renewal, expired, canceled | CRS health (expired/canceled); renewal unavailable |
| `admin.getRevenueByMonth` | Revenue chart | Unavailable placeholder |
| `admin.getExtendedStats` | Platform counts + growth | `platform` + `extensions.userGrowth` via single endpoint |
