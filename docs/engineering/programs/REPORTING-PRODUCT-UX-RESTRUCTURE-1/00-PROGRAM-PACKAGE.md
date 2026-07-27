# REPORTING-PRODUCT-UX-RESTRUCTURE-1 — Program Package

| Field | Value |
|-------|-------|
| **Program** | REPORTING-PRODUCT-UX-RESTRUCTURE-1 |
| **Type** | Product UX / Presentation only |
| **Date** | 2026-07-27 |
| **Git** | Uncommitted — awaiting Architecture Authority approval |

## Mission

Transform MineuQR Reporting into a restaurant executive dashboard with **three product tabs** only:

1. **اليوم / Today** — operational awareness in five seconds  
2. **هذا الشهر / This Month** — identical layout, monthly scope  
3. **التحليلات المالية / Financial Analytics** — analysis, not monitoring  

## Scope

| In scope | Out of scope |
|----------|--------------|
| Navigation / IA | Business laws, KPI formulas |
| Card layout, color, motion | Reporting Platform / services |
| Tab composition | API, schema, DB, ownership |
| Presentation VMs from existing DTOs | ADR / Constitution amendments (document only) |

## Deliverables

| # | Document |
|---|----------|
| 1 | [PRODUCT-UX-SPECIFICATION.md](./PRODUCT-UX-SPECIFICATION.md) |
| 2 | [INFORMATION-ARCHITECTURE.md](./INFORMATION-ARCHITECTURE.md) |
| 3 | [NAVIGATION-SPECIFICATION.md](./NAVIGATION-SPECIFICATION.md) |
| 4 | [DASHBOARD-SPECIFICATION.md](./DASHBOARD-SPECIFICATION.md) |
| 5 | [CARD-SPECIFICATION.md](./CARD-SPECIFICATION.md) |
| 6 | [INTERACTION-SPECIFICATION.md](./INTERACTION-SPECIFICATION.md) |
| 7 | [ANIMATION-GUIDELINES.md](./ANIMATION-GUIDELINES.md) |
| 8 | [COLOR-GUIDELINES.md](./COLOR-GUIDELINES.md) |
| 9 | [FINANCIAL-ANALYTICS-LAYOUT.md](./FINANCIAL-ANALYTICS-LAYOUT.md) |
| 10 | [TODAY-DASHBOARD.md](./TODAY-DASHBOARD.md) |
| 11 | [MONTHLY-DASHBOARD.md](./MONTHLY-DASHBOARD.md) |
| 12 | [EXECUTIVE-UX-REVIEW.md](./EXECUTIVE-UX-REVIEW.md) |
| 13 | [BEFORE-AFTER-COMPARISON.md](./BEFORE-AFTER-COMPARISON.md) |
| 14 | [ARCHITECTURE-COMPLIANCE-REPORT.md](./ARCHITECTURE-COMPLIANCE-REPORT.md) |

## Implementation map

| Surface | Path |
|---------|------|
| Product shell | `client/src/components/dashboard/ReportsTab.tsx` |
| Period cards UI | `client/src/components/dashboard/ExecutivePeriodDashboard.tsx` |
| Period VM | `client/src/lib/reporting-exports/executivePeriodDashboard.ts` |
| Sales source shell | `client/src/components/dashboard/SalesSourceAnalysisSection.tsx` |

## Final Verdict

**B. Adopted with observations**

Do not commit / push / deploy until Architecture Authority approval.
