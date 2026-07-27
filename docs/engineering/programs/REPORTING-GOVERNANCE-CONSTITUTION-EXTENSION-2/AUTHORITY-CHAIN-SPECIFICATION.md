# Authority Chain Specification

| Field | Value |
|-------|-------|
| **Program** | REPORTING-GOVERNANCE-CONSTITUTION-EXTENSION-2 |
| **Constitution** | GOV-07 · GOV-08 |
| **Date** | 2026-07-27 |

## Normative chain

```
Business Truth
      ↓
Architectural Truth
      ↓
Governance Truth
      ↓
Operational Truth
      ↓
Presentation
```

## Per-hop responsibilities

| From → To | Allowed actions | Forbidden |
|-----------|-----------------|-----------|
| Business → Architecture | Encode laws in domains/events/ADRs | Softening financial meaning in code comments as “policy” |
| Architecture → Governance | Constrain what governance may regulate | Governance inventing new domain owners |
| Governance → Operational | Approve Class/Scope/Promotion; require mirrors | Operational inventing Executive set |
| Operational → Presentation | Supply values/labels/layout inputs | Presentation inventing KPI definitions |
| Any upward hop | — | **Always forbidden** without ADR exception (GOV-10) |

## Reporting illustration

| Decision | Layer | Downstream mirrors |
|----------|-------|--------------------|
| Total Sales = paid SR gen=1 | L1/L2 | `revenue` in `kpiDictionary` (L4) → Exec card (Presentation) |
| Executive max 6 health indicators | L3 (UX-04 / KPI-09) | `EXECUTIVE_SUMMARY_KPI_IDS` (L4) |
| Net Sales off Executive | L3 (Class 3 / Scope) | Advanced Financial UI only |

## Protection (GOV-08)

Lower layers: implement · mirror · validate · present.  
Never: redefine · override · reclassify · promote · reinterpret.
