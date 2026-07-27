# Governance Metadata Specification

| Field | Value |
|-------|-------|
| **Program** | REPORTING-GOVERNANCE-METADATA-CONSTITUTION-1 |
| **Constitution** | GOV-01…GOV-05 |
| **Date** | 2026-07-27 |

## Definition

**Governance Metadata** is architectural policy data used for compliance, certification, and (optionally later) validation. It does **not** execute reporting calculations or define financial meaning beyond what Operational Metadata already publishes as metric definitions.

## Governance metadata catalog

| Metadata kind | Governing rule | Current SSOT (docs) | Future code home (GOV-04) |
|---------------|----------------|---------------------|---------------------------|
| Constitution rules (UX/OBJ/KPI/GOV) | Product Constitution | `docs/architecture/constitution/*` | `governance/reportingConstitution.ts` |
| Classification (Class 1–5) | KPI-08 | EXTENSION-2 Classification Registry | `governance/kpiClassification.ts` |
| Presentation Scope (E·O·F·D·X·I) | KPI-10 | EXTENSION-3 Scope Registry / matrices | `governance/presentationScope.ts` |
| Promotion stage / eligibility | KPI-09 · GOV-01 | EXTENSION-2 Promotion Policy + Executive KPI Registry | `governance/promotionPolicy.ts` |
| Lifecycle policy | KPI-07 | EXTENSION-1 Lifecycle Registry | `governance/lifecyclePolicy.ts` |
| Approval / certification status | Program certification | Program Production / Governance reports | `governance/governanceRegistry.ts` |

## Properties

| Property | Requirement |
|----------|-------------|
| Runtime participation | Forbidden for calculation / formula / money math |
| Dependency on UI/services | Forbidden (GOV-05) |
| May validate runtime | Allowed only via one-way Governance → Validation → Runtime |
| Physical home today | Documentation registries (approved) |
| Physical home future | Dedicated `shared/reporting-platform/governance/` only |

## Non-governance (must stay operational)

Metric formulas, `calculationVersion`, DTO bindings, money formatting, translation of Business Names, technical `ownerDomain` for source routing — see Boundary Report.
