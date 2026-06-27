# Architecture Review Process

> **Constitution §28** · [Compliance](../constitution/Compliance.md)

## Purpose

Architecture reviews ensure implementation programs comply with the [Architecture Constitution](../constitution/Architecture-Constitution-v1.0.md) before, during, and after delivery.

## Review types

| Type | When | Owner | Outcome |
|---|---|---|---|
| **Entry review** | Before coding starts | Architecture Authority | Charter approved or rejected |
| **Mid review** | Programs over 4 weeks (optional) | Principal Engineer | Risk register update |
| **Exit review** | Program completion | Architecture Authority | Certification decision |

## Entry review checklist

- [ ] Program charter cites Blueprint § and ADR IDs
- [ ] Architecture Traceability Matrix drafted
- [ ] Fitness functions declared (FF-01 through FF-18 as applicable)
- [ ] No scope that expands Order beyond Constitution §25
- [ ] RESET-1 guards respected (no printing reintroduction)

## Exit review checklist

- [ ] ATM rows implemented and verified
- [ ] Fitness functions green in CI
- [ ] ADRs marked Implemented where applicable
- [ ] No open Severity: High constitutional violations
- [ ] Blueprint amendment merged if structural change occurred

## Participants

| Role | Responsibility |
|---|---|
| Architecture Authority | Accept/reject certification |
| Principal Engineer | Technical compliance assessment |
| Program Lead | Delivers evidence package |
| Engineering Lead | Code review sign-off |

---

**Template:** [Architecture-Review.md](../templates/Architecture-Review.md) · **Certification:** [Program-Certification.md](./Program-Certification.md)