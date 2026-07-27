# Governance Layer Proposal

| Field | Value |
|-------|-------|
| **Program** | REPORTING-GOVERNANCE-METADATA-CONSTITUTION-1 |
| **Constitution** | GOV-04 · GOV-05 |
| **Status** | Proposal only — **not implemented** by this program |
| **Date** | 2026-07-27 |

## Purpose

Provide a future physical home for Governance Metadata if/when it becomes programmatically consumable for validation guards or certification tooling.

## Proposed package

```
shared/reporting-platform/governance/
├── reportingConstitution.ts   # rule ids, version pins (UX/OBJ/KPI/GOV)
├── kpiClassification.ts       # KPI-08 Class 1–5 assignments
├── presentationScope.ts       # KPI-10 scope sets per object
├── promotionPolicy.ts         # KPI-09 stages + Stage 6 eligible set
├── lifecyclePolicy.ts         # KPI-07 lifecycle declarations
└── governanceRegistry.ts      # aggregate index + approval status
```

## Constraints

| Constraint | Requirement |
|------------|-------------|
| No business calculations | Absolute |
| No formula ownership | Absolute — formulas stay in `kpiDictionary` |
| No reverse imports from server UI/services into governance | GOV-05 |
| Optional consumers | Architecture guard tests, CI certification checks |
| Adoption | Requires separate implementation program + Architecture Authority approval |

## Migration principle

1. Keep docs registries authoritative until code layer ships.  
2. Code layer MUST be generated from or dual-maintained with registries under ADR.  
3. Never merge governance fields into `kpiDictionary` entries as the primary home.

## Out of scope for this program

Do **not** create the `governance/` TypeScript package now. Documentation proposal only.
