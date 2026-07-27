# Compliance Operations

| Field | Value |
|-------|-------|
| **Program** | ARCHITECTURE-GOVERNANCE-OPERATIONS-1 |
| **Type** | Architecture Ops |
| **Date** | 2026-07-27 |
| **Normative anchors** | §28 · [Compliance-Checklist.md](../governance/Compliance-Checklist.md) · GOV-12 · CD |

## Purpose

Recurring compliance — scheduled, not only at program end.

## Review types & cadence

| Review | Cadence | Focus |
|--------|---------|-------|
| Architecture Compliance | Per program + quarterly sample | ADRs, ownership, fitness |
| ADR Compliance | Monthly | Proposed aging, Accepted not Implemented, Registry hygiene |
| Constitution Compliance | Monthly | Pending Review aging, CV-01 headers, Registry sync |
| Cross-Domain Compliance | Quarterly | CD-01/02 matrices vs reality |
| Operational Compliance | Monthly (Reporting-heavy) | Mirror Integrity GOV-11, drift GOV-13 |
| Exception Compliance | Continuous / weekly | Expiry, remediation ADR |

## Operating procedure

1. Pull Registry, ADR Registry, open exceptions, open programs  
2. Run applicable checklist  
3. Log findings (severity, owner, due date)  
4. Escalate P0/P1 to ARB / Architecture Authority  
5. Track to closure  

## Evidence

Compliance log entry: date · reviewer · scope · findings · links · next review date.

Reporting releases additionally require Constitutional Validation Record (GOV-12).
