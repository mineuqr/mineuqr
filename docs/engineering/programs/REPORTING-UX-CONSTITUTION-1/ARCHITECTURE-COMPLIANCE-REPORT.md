# Architecture Compliance Report

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-1 |
| **Date** | 2026-07-27 |
| **Type** | Governance — constitution elevation package |

## Intent

Bind Reporting UX and KPI ownership rules into the permanent Architecture / Product Constitution layer without altering implementation planes.

## Hierarchy placement

```
Architecture Vision & North Star
        ↓
Architecture Principles
        ↓
Architecture Governance + Product Constitutions
   ├── Architecture Constitution v1.0
   ├── Reporting UX Constitution v1.0   ← this program
   └── KPI Ownership Constitution v1.0 ← this program
        ↓
ADRs
        ↓
Implementation Programs (Reporting UX / Terminology / Simplification)
        ↓
Code (kpiDictionary, productSemantics, Reports UI)
```

## Fitness alignment

| Constraint | Result |
|------------|--------|
| No UI inventing financial truth | Affirmed (KPI-02) |
| Settlement Record = financial publication SoT | Affirmed |
| Order Read = operational Sales Orders SoT | Affirmed |
| Reporting Platform derives only | Affirmed (Net Sales, Refund Rate) |
| Business Language in UI | Affirmed (UX-07) |
| No schema / formula / API change in this program | Affirmed |

## Related programs (presentation baseline — not amended here)

- REPORTING-UX-RATIONALIZATION-1  
- REPORTING-BUSINESS-TERMINOLOGY-FINANCIAL-GOVERNANCE-ADOPTION-1  
- REPORTING-UX-SIMPLIFICATION-1  

## Exceptions

None requested. Observations documented in Constitutional Compliance Report.

## Exit criteria

| Criterion | Status |
|-----------|--------|
| UX Constitution v1.0 authored | Done |
| KPI Ownership Constitution v1.0 authored | Done |
| Registries authored | Done |
| Governance index updated | Done |
| Architecture Authority approval | **Pending** |
| Git commit / deploy | **Blocked until approval** |
