# Engineering Program Governance

| Field | Value |
|-------|-------|
| **Program** | ARCHITECTURE-GOVERNANCE-OPERATIONS-1 |
| **Type** | Architecture Ops |
| **Date** | 2026-07-27 |
| **Normative anchors** | Architecture Constitution §28 · [Program-Certification.md](../governance/Program-Certification.md) · [Program-Charter.md](../templates/Program-Charter.md) |

## Purpose

One lifecycle for engineering programs after constitutions exist.

## Lifecycle

```
Investigation
  ↓
Architecture
  ↓
Implementation
  ↓
Verification
  ↓
Production Validation
  ↓
Production Certified
  ↓
Operational Review
  ↓
Closed
```

| Stage | Exit criteria |
|-------|----------------|
| Investigation | Problem/scope written; domains touched identified (CD) |
| Architecture | Charter + ADRs cited / drafted; Traceability Matrix started; no ownership invention |
| Implementation | Code/docs per charter; no unauthorized law/schema changes |
| Verification | Tests / fitness / UAT evidence |
| Production Validation | Live or agreed validation environment evidence |
| Production Certified | All gates in [Production-Certification.md](./Production-Certification.md) Pass |
| Operational Review | Post-cert ops check (metrics, incidents, drift) |
| Closed | Program Owner + Architecture Authority (or delegate) close record |

## Reopening rules

A Closed program may reopen only if:

1. Architecture Authority approves reopen request  
2. Scope of reopen is written (defect, drift, incomplete gate, or ADR follow-up)  
3. Lifecycle resumes at the earliest failed/incomplete stage (not a silent jump to Certified)  
4. New evidence package is produced  

Forbidden: reopening solely to relabel an uncertified change as “already certified.”

## Program types (Ops)

| Type | Notes |
|------|-------|
| Implementation | Code + architecture |
| Governance-only | Docs/constitutions/ops — still follows lifecycle; Production Certified may mean “Adopted + indexed” with no runtime deploy |
| Enforcement / Ops | This program class — no runtime |

Governance-only programs still require Architecture / Governance / Documentation gates; Regression/Operational Validation may be N/A with explicit waiver recorded (not silent skip).
