# Future Automation Roadmap

| Field | Value |
|-------|-------|
| **Program** | REPORTING-CONSTITUTION-ENFORCEMENT-1 |
| **Constitution** | GOV-15 · GOV-04 |
| **Status** | Roadmap only — **not implemented** by this program |
| **Date** | 2026-07-27 |

## Principle

Automation verifies constitutions. Automation never redefines them.

## Phased roadmap

| Phase | Capability | Depends on | Notes |
|-------|------------|------------|-------|
| 0 (current) | Manual GOV-12 checklist + assistive architecture guards | — | Mandatory now |
| 1 | CI: Exec allowlist ↔ Executive KPI Registry equality | Stable registries or `governance/` package | Drift fail build |
| 2 | CI: Business Name synonym ban (Gross Sales, etc.) | `productSemantics` + guards | Already partially covered by tests |
| 3 | CI: Scope matrix vs Dashboard placement map | Structured scope encoding (GOV-04) | Requires governance layer |
| 4 | CI: Promotion stage gate for Scope E newcomers | `promotionPolicy.ts` | Block unapproved Exec |
| 5 | CI: Lifecycle / ownership field completeness | `governanceRegistry.ts` | Certification bot assist |
| 6 | Scheduled drift report (non-blocking → blocking) | Phases 1–3 | Ops visibility |

## Non-goals for automation

- Changing KPI formulas  
- Auto-promoting KPIs to Executive  
- Auto-editing governance to match runtime  

## Adoption gate

Each automation phase requires Architecture Authority approval and must cite which constitution rules it verifies.
