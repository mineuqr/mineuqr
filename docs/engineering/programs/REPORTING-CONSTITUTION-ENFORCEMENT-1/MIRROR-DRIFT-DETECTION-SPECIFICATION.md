# Mirror Drift Detection Specification

| Field | Value |
|-------|-------|
| **Program** | REPORTING-CONSTITUTION-ENFORCEMENT-1 |
| **Constitution** | GOV-13 |
| **Date** | 2026-07-27 |

## Definition

**Mirror Drift** = any divergence between Governance Metadata (registries / constitutions) and Operational Mirrors (runtime registries / allowlists / UI / export config).

## Detection methods (current — manual)

| Method | Frequency |
|--------|-----------|
| Compare `EXECUTIVE_SUMMARY_KPI_IDS` to Executive KPI Registry | Every reporting release |
| Compare Dashboard Exec cards to Scope E + Stage 6 | Every reporting release |
| Compare Excel/PDF Business Names to Product Semantics | Every reporting release |
| Spot-check Class 4 not on Executive | Every reporting release |
| Architecture guard tests (assistive) | CI — not full GOV-12 substitute |

## Required artifacts on drift

| Artifact | Content |
|----------|---------|
| Violation Report | What drifted; mirror path; governance SSOT path |
| Impact Assessment | Customer-facing / financial-semantics risk |
| Corrective Action | Mirror fix PR (governance unchanged unless ADR) |
| Regression Validation | Tests / UAT proving realignment |

## Prohibited outcomes

- Accepting drift as “new truth”  
- Editing governance registries solely to match buggy runtime  
- Shipping with known unresolved drift  

## Severity

| Severity | Example | Gate |
|----------|---------|------|
| Critical | Unauthorized Executive KPI; Total Sales meaning drift | Block certification |
| High | Export label synonym; Scope violation | Block certification |
| Medium | Caption wording only (not Business Name) | Fix before or with waiver + track |
| Low | Non-semantic chrome | Fix in follow-up; document |
