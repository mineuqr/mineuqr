# Architecture Authority Model

| Field | Value |
|-------|-------|
| **Program** | ARCHITECTURE-GOVERNANCE-OPERATIONS-1 |
| **Type** | Architecture Ops |
| **Date** | 2026-07-27 |
| **Normative anchors** | Architecture Constitution §18, §26–28 · CD-05 · CV-01 |

## Purpose

Define who decides what in Architecture Ops — without changing constitutional authority already ratified.

## Roles

| Role | Responsibility | Does not |
|------|----------------|----------|
| **Architecture Authority** | Final adoption of constitutions, ADRs, Production Certified, exceptions > policy, annual review | Implement day-to-day code as the decision body |
| **Architecture Review Board (ARB)** | Structured review, recommendations, vote recording | Unilaterally rewrite Business Law |
| **Domain Architect** | Domain sovereignty (CD-01), domain constitutions, domain ADR drafts | Own another domain’s write authority |
| **Technical Design Authority (TDA)** | Design packages, program architecture compliance, registry hygiene | Override Architecture Authority |
| **Technical Reviewer** | ADR/program review comments, fitness evidence | Grant Production Certified alone |
| **Program Owner** | Charter, delivery, evidence package, reopening requests | Self-certify production |

## Decision authority

| Decision | Primary authority | Consult | Escalate to |
|----------|-------------------|---------|-------------|
| Adopt / deprecate constitution | Architecture Authority | ARB, Domain Architect | — |
| Accept / reject ADR | Architecture Authority | ARB, TDA | — |
| Domain boundary change | Architecture Authority + ADR | Domain Architects, CD-04 | Architecture Authority |
| Production Certified | Architecture Authority | TDA, Program Owner | — |
| Temporary exception ≤30d | Architecture Authority (or delegated emergency path) | On-call / Program Owner | Architecture Authority |
| Program reopen | Architecture Authority | Program Owner | — |
| Governance metric targets | Architecture Authority | ARB | — |

## Escalation hierarchy

```
Program Owner / Engineer
      ↓
Technical Reviewer / Domain Architect
      ↓
Technical Design Authority
      ↓
Architecture Review Board
      ↓
Architecture Authority
```

Conflict stack for substance remains CD-04 / Truth Layers (Business Law → Architecture → Domain Ownership → Implementation). Ops escalation is for **who decides**, not for inventing higher truth.

## Approval responsibilities (summary)

| Artifact | Propose | Review | Approve |
|----------|---------|--------|---------|
| ADR | Author / Domain Architect | ARB / Technical Reviewers | Architecture Authority |
| Constitution | TDA / Domain Architect | ARB | Architecture Authority |
| Program charter | Program Owner | TDA | Architecture Authority (if architecture-impacting) |
| Production certification | Program Owner | TDA + gates | Architecture Authority |
| Exception | Program Owner | TDA | Architecture Authority |

## Related Ops

[Architecture-Review-Board.md](./Architecture-Review-Board.md) · [ADR-Operations.md](./ADR-Operations.md) · [Production-Certification.md](./Production-Certification.md)
