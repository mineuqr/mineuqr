# ADR-ARCH-003: Service Ownership Boundaries

> [← ADR-ARCH-002](../adrs/ADR-ARCH-002.md) · [Registry](../constitution/ADR-Registry.md) · [ADR-ARCH-004 →](../adrs/ADR-ARCH-004.md)

| Field | Value |
|---|---|
| **Status** | Accepted — Ratified |
| **Owner** | Architecture Authority |
| **Program** | ORDER-1 |
| **Implementation status** | Partial |
| **Supersedes** | — |

## Context

Cross-context inline orchestration in the order router couples Order to Notifications, Session, and other domains, violating bounded context boundaries.

## Decision

Each bounded context owns its data and publishes/consumes explicit contracts. No cross-context inline orchestration in the Order write path. Tenant isolation enforced via Identity and restaurant-scoped aggregates.

## Consequences

(+) Reduced coupling, clearer testing boundaries. (−) Event-driven migration required for session and notifications.

## Related Blueprint Sections

§2, §6, §12, §21

## Related Programs

ORDER-1

## Related ADRs

[ADR-ARCH-004](./ADR-ARCH-004.md) · [ADR-ARCH-010](./ADR-ARCH-010.md)

## Notes

Inline notification/session coupling violates.

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)