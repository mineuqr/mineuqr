# Operational Mirror Specification

| Field | Value |
|-------|-------|
| **Program** | REPORTING-GOVERNANCE-CONSTITUTION-EXTENSION-2 |
| **Constitution** | GOV-06 |
| **Date** | 2026-07-27 |

## Definition

An **Operational Mirror** is a Layer 4 runtime artifact that reflects an already approved Layer 3 (or higher) decision. It enables execution. It does not author policy.

## Properties

| Property | Requirement |
|----------|-------------|
| Authority | None — reflective only |
| May create policy | **No** |
| May redefine policy | **No** |
| May diverge from governance SSOT | **No** (divergence = Governance Violation) |
| Purpose | Runtime enablement only |

## Canonical mirrors (Reporting)

| Mirror (Operational Truth) | Reflects (Governance / higher) | Authority SSOT |
|----------------------------|--------------------------------|----------------|
| `EXECUTIVE_SUMMARY_KPI_IDS` | Stage 6 Executive Eligibility (KPI-09 / GOV-01) | Executive KPI Registry + Promotion Policy |
| `EXECUTIVE_PAYMENT_OVERVIEW_CARD_ID` usage on Overview | Governed Executive widget placement | Widget Scope + Executive protection |
| `preferredKpiLabel` / `PREFERRED_KPI_LABELS` | Approved Business Names (KPI-04) | `productSemantics` + dictionary names (Operational labels implementing Governance naming policy) |
| `kpiDictionary` formulas / sources | Business + Architectural Truth (laws, ownership) | Financial laws + ADRs + dictionary as Layer 4 encoding of higher truth — **not** free to invent meaning |
| Future `shared/reporting-platform/governance/*` | Layer 3 programmatic encoding | Still Governance Truth; runtime may validate against it (GOV-04/05) |

## Correct flow

```
Constitution / Registry (L3)
        ↓ approval
Eligibility / Scope / Class decision
        ↓
Operational Mirror updated (L4)
        ↓
Presentation renders mirror
```

## Incorrect flow (prohibited)

```
Developer edits EXECUTIVE_SUMMARY_KPI_IDS
        ↓
“New Executive KPI”
        ↓
Docs updated later (or never)
```

## Change rule

Update governance registries + obtain required approvals **before** changing mirrors. Mirror PRs without governance evidence are Constitutional Architecture Violations.
