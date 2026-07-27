# Constitutional Validation Specification

| Field | Value |
|-------|-------|
| **Program** | REPORTING-CONSTITUTION-ENFORCEMENT-1 |
| **Constitution** | GOV-12 |
| **Date** | 2026-07-27 |

## When required

Every Reporting Platform release / reporting feature certification package.

## Mandatory validation checklist

| # | Domain | Pass criteria | Primary evidence |
|---|--------|---------------|------------------|
| 1 | Business Laws | No formula/law change unless authorized program | Diff + Architecture Compliance |
| 2 | Architecture Constitution | No §18 hierarchy / ownership violation | ADR refs / compliance report |
| 3 | KPI Ownership (KPI-01…03) | One owner, one SoT, one definition | kpiDictionary + Ownership Registry |
| 4 | KPI Classification (KPI-08) | Exactly one Class 1–5 | Classification Registry |
| 5 | KPI Lifecycle (KPI-07) | Lifecycle documented | Lifecycle Registry |
| 6 | Presentation Scope (KPI-10) | No out-of-scope placement | Scope matrices |
| 7 | Promotion (KPI-09) / Eligibility (GOV-01) | Exec only if Stage 6 | Executive KPI Registry |
| 8 | Mirror Integrity (GOV-11) | Mirrors match governance | Mirror Integrity Spec |
| 9 | Truth Layers (GOV-07…08) | No upward redefinition | Authority Chain review |
| 10 | Dependency Direction (GOV-05/09) | No reverse authority | Dependency matrix check |
| 11 | Runtime Mirrors | Allowlists/config audited | Code review of `productSemantics` / Exec VM / exports |
| 12 | Object Model (OBJ-01…04) | KPI vs Widget vs Analytics vs Card correct | Object registries |
| 13 | UX (UX-01…07) | Business questions, no Exec inflation | UX / Simplification baseline |

**Any fail → certification MUST fail (GOV-12 / GOV-14).**

## Validation record

Each release MUST attach a short Constitutional Validation Record listing checklist results (Pass/Fail) and links to registries/diffs. Template may live in the program certification package.
