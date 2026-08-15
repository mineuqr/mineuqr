# Architecture Compliance Checklist

> **Constitution §28** · [Compliance](../constitution/Compliance.md)

Use per implementation program before exit certification.

## Documentation

- [ ] Architecture Traceability Matrix complete
- [ ] Affected ADRs listed
- [ ] Affected Blueprint § listed
- [ ] Program charter on file

## Design

- [ ] Entry architecture review completed
- [ ] Production path matches §13
- [ ] No forbidden dependencies (§19)
- [ ] ACLs used for external contexts (§21)

## Implementation

- [ ] Domain logic in domain layer only
- [ ] Events after commit (ADR-ARCH-004)
- [ ] No client KPI computation (ADR-ARCH-006)
- [ ] Order mutations via application services (ADR-ARCH-007)

## Verification

- [ ] Declared fitness functions pass
- [ ] Integration tests for critical paths
- [ ] No cross-context router writes

## Commercial entitlement (when the program touches commercial capabilities)

Complete [Commercial Entitlement Enforcement Checklist](../../engineering/governance/COMMERCIAL-ENTITLEMENT-ENFORCEMENT-CHECKLIST.md). Architecture Authority MUST reject missing server enforcement, UI-only gates, plan-name authorization, or missing negative tests (CE-29).

## Governance

- [ ] Exit review scheduled
- [ ] ADR implementation status updated in registry
- [ ] Exceptions documented and within 30-day window if any

---

**Template:** [Architecture-Traceability-Matrix.md](../templates/Architecture-Traceability-Matrix.md)