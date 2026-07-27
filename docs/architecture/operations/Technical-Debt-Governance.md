# Technical Debt Governance

| Field | Value |
|-------|-------|
| **Program** | ARCHITECTURE-GOVERNANCE-OPERATIONS-1 |
| **Type** | Architecture Ops |
| **Date** | 2026-07-27 |
| **Normative anchors** | Architecture Constitution quality attributes · CD / GOV debt concepts |

## Debt classes

| Class | Meaning | Examples |
|-------|---------|----------|
| **Architecture Debt** | Structure violates intended boundaries/ownership | Router co-owns domain writes; missing outbox |
| **Technical Debt** | Implementation quality / maintainability | Untested paths, duplication |
| **Governance Debt** | Missing/pending constitutions, registry drift, unsigned certifications | Pending Review constitutions; undocumented exceptions |
| **Operational Debt** | Ops mirrors, runbooks, monitoring gaps | Mirror drift; missing certification records |

## Prioritization

| Priority | Criteria |
|----------|----------|
| P0 | Active Truth Layer / Business Law risk; open Critical drift |
| P1 | Ownership/boundary risk; expired exceptions |
| P2 | Governance completeness (Pending constitutions backlog) |
| P3 | Maintainability / hygiene |

## Ownership

| Debt class | Default owner |
|------------|---------------|
| Architecture Debt | Domain Architect + TDA |
| Technical Debt | Program Owner / engineering lead |
| Governance Debt | TDA + Architecture Authority |
| Operational Debt | Platform Governance Lead / Program Owner |

## Retirement

1. Register debt item (ID, class, owner, priority, target date)  
2. Remediate via program or ADR  
3. Verify (tests / audit / certification)  
4. Close with evidence link  

Debt MUST NOT be “accepted forever” without Architecture Authority risk acceptance + expiry (Exception Governance).
