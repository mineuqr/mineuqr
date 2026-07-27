# Governance Metrics

| Field | Value |
|-------|-------|
| **Program** | ARCHITECTURE-GOVERNANCE-OPERATIONS-1 |
| **Type** | Architecture Ops |
| **Date** | 2026-07-27 |

## Purpose

Measure Architecture Ops health. Metrics inform Authority/ARB; they do **not** redefine constitutions.

## KPI catalog

| KPI | Definition | Suggested cadence |
|-----|------------|-------------------|
| Open ADRs | Count Proposed + in Review | Weekly |
| Pending Constitutions | Registry Status = Pending Review / Draft | Weekly |
| Architecture Debt | Open P0–P2 Architecture Debt items | Monthly |
| Governance Debt | Open Governance Debt items | Monthly |
| Architecture Exceptions | Open non-expired + expired-unremediated | Weekly |
| Certification Lead Time | Days from Verification start → Production Certified | Per program / quarterly avg |
| Compliance Rate | % scheduled compliance reviews completed on time | Monthly |
| Review Lead Time | Days Proposed ADR → Approved/Rejected | Monthly |
| Constitution Adoption Rate | Adopted / (Adopted + Pending + Draft) for registered constitutions | Monthly |
| Mirror Drift incidents | Count GOV-13 drifts detected (Reporting) | Monthly |
| Programs Closed vs Reopened | Reopen rate | Quarterly |

## Targets

Architecture Authority sets numeric targets after first baseline quarter. Until then, track and trend only.

## Reporting

Metrics summarized for ARB and Annual Architecture Review. No vanity metrics that incentivize skipping gates.
