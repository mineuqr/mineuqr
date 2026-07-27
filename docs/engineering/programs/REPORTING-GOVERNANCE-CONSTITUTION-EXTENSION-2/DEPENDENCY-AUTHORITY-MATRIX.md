# Dependency Authority Matrix

| Field | Value |
|-------|-------|
| **Program** | REPORTING-GOVERNANCE-CONSTITUTION-EXTENSION-2 |
| **Constitution** | GOV-09 |
| **Date** | 2026-07-27 |

## Matrix (row depends on column)

Legend: **A** = allowed · **F** = forbidden · **—** = N/A (same layer / self)

| ↓ depends on → | Business L1 | Architecture L2 | Governance L3 | Operational L4 | Presentation |
|----------------|-------------|-----------------|---------------|----------------|--------------|
| Business L1 | — | F | F | F | F |
| Architecture L2 | A | — | F | F | F |
| Governance L3 | A | A | — | F | F |
| Operational L4 | A* | A | A | — | F |
| Presentation | A* | A* | A* | A | — |

\*Presentation/Operational typically depend on higher truth **through** encoded contracts and mirrors, not by importing raw law documents at runtime.

## Allowed dependency direction

```
Business → Architecture → Governance → Operational → Presentation
```

## Prohibited examples

| Dependency | Why forbidden |
|------------|---------------|
| Governance registry imports `ReportsTab.tsx` | Reverse authority |
| Constitution text conditioned on UI layout convenience | L3 redefined by Presentation |
| `kpiDictionary` formula changed to match a chart “looking better” | L4 overriding L1/L2 |
| Promotion status inferred only from `EXECUTIVE_SUMMARY_KPI_IDS` | Mirror treated as authority (GOV-06) |

## Validation dependency (GOV-05 compatible)

Governance → Validation guards → Runtime is **allowed** (downward).  
Runtime → mutating Governance source is **forbidden**.
