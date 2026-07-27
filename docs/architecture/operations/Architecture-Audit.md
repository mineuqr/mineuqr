# Architecture Audit

| Field | Value |
|-------|-------|
| **Program** | ARCHITECTURE-GOVERNANCE-OPERATIONS-1 |
| **Type** | Architecture Ops |
| **Date** | 2026-07-27 |

## Audit types

| Type | Trigger | Output |
|------|---------|--------|
| **Scheduled audit** | Quarterly / per Compliance-Operations | Audit report + findings |
| **Production audit** | Post major production change or certification sample | Runtime vs constitution / ADR alignment |
| **Architecture audit** | Domain or cross-domain deep dive | Boundary/ownership findings |
| **Incident audit** | Sev incidents with architecture factor | Root cause + ADR/program actions |
| **Postmortem integration** | After incident postmortem | Architecture actions tracked as debt/ADR/program |

## Method (minimum)

1. Scope domains / constitutions / ADRs  
2. Compare intended authority (CD / ADRs) vs implementation  
3. Check mirrors vs governance (if Reporting)  
4. Check exceptions not expired  
5. Record findings → debt / reopen / ADR  

## Independence

Where possible, auditor ≠ sole Program Owner under review. Architecture Authority may assign TDA or external reviewer.

## Retention

Audit reports retained with certification and exception records (no deletion of constitutional history).
