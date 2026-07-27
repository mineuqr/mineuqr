# Exception Governance

| Field | Value |
|-------|-------|
| **Program** | ARCHITECTURE-GOVERNANCE-OPERATIONS-1 |
| **Type** | Architecture Ops |
| **Date** | 2026-07-27 |
| **Normative anchors** | [Architecture-Exception-Process.md](../governance/Architecture-Exception-Process.md) §28.4 |

## Purpose

Operate temporary deviations without turning exceptions into de-facto architecture.

Constitutional exception process remains binding (max **30 days**, emergency ADR within **5 business days**, no permanent exceptions without ADR).

## Exception types

| Type | Use | Max duration |
|------|-----|--------------|
| Temporary waiver | Known gap with dated remediation | ≤ 30 days (extend only by Architecture Authority) |
| Emergency approval | Production incident | ≤ 30 days; emergency ADR ≤ 5 business days |
| Risk acceptance | Residual risk while remediating | Must name owner, expiry, revalidation date |

## Required documentation

| Field | Description |
|-------|-------------|
| Exception ID | `EXC-YYYY-NNN` |
| Program | Affected program |
| Rule violated | Constitution § / ADR / GOV / CD / CV |
| Justification | Why necessary (not convenience alone) |
| Risk | Impact if exploited / wrong |
| Expiry | ≤ 30 days unless Authority extends |
| Remediation | ADR, revert, or program reopen |
| Approver | Architecture Authority |

## Expiration & revalidation

- Calendar expiry → auto **invalid**  
- Before expiry: remediate, extend (Authority), or revert  
- Rolling silent renewals forbidden  
- On expiry without remediation → compliance finding (Compliance-Operations)

## Forbidden

- Permanent exceptions without ADR amendment  
- Using exceptions to invent Executive KPIs / ownership / financial meaning  
- Skipping certification gates via open-ended waiver  
