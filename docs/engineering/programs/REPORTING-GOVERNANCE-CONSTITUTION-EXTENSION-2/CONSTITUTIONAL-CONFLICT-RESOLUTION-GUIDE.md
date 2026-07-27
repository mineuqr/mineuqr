# Constitutional Conflict Resolution Guide

| Field | Value |
|-------|-------|
| **Program** | REPORTING-GOVERNANCE-CONSTITUTION-EXTENSION-2 |
| **Constitution** | GOV-10 |
| **Date** | 2026-07-27 |

## Resolution order (no exceptions without ADR)

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

## Procedure

1. **Identify** the conflicting artifacts and their Truth Layers.  
2. **Select** the higher-layer decision as binding.  
3. **Correct** lower-layer mirrors/implementations to align.  
4. If a lower layer must intentionally diverge: **stop** → draft **ADR** → Architecture Authority approval → then update lower layers.  
5. Record outcome in program compliance / ADR registry.

## Worked examples

| Conflict | Higher wins | Action |
|----------|-------------|--------|
| UI shows “Gross Sales” but Governance Business Name is Total Sales | L3 naming + L1 meaning | Fix Presentation / labels (L4/Presentation) |
| `EXECUTIVE_SUMMARY_KPI_IDS` includes Average Check but Class 4 bars Exec | L3 Classification / Promotion | Remove from mirror; keep in Advanced Financial |
| Chart uses Order totals labeled as Total Sales | L1/L2 Settlement SoT | Fix query/binding; never “redefine” Total Sales in UI |
| Governance Scope E but no Stage 6 promotion | L3 GOV-01 / KPI-09 | Do not show on Executive |
| Proposed “simpler” Net Sales formula in Excel only | L1/L2 + KPI-03/05 | Reject; Excel must match dictionary |

## ADR gate

Only an approved ADR may authorize a controlled exception to higher-layer prevalence — and must state impact, expiry/review, and which layers are amended.
