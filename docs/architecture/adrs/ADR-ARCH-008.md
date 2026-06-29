# ADR-ARCH-008: Order Outbox and Event Relay

> [← ADR-ARCH-007](../adrs/ADR-ARCH-007.md) · [Registry](../constitution/ADR-Registry.md) · [ADR-ARCH-009 →](../adrs/ADR-ARCH-009.md)

| Field | Value |
|---|---|
| **Status** | Accepted — Ratified |
| **Owner** | Architecture Authority |
| **Program** | ORDER-EVENTS-1 |
| **Implementation status** | Implemented |
| **Supersedes** | — |

## Context

Inline side effects violate ADR-ARCH-004; commit/notification ordering is unsafe without durable event persistence.

## Decision

All Order domain events persist to an **outbox** in the same transaction as the aggregate; a relay process dispatches asynchronously to subscribers.

## Consequences

(+) Reliability, testability; (−) operational component, slight subscriber latency.

## Related Blueprint Sections

§8, §10, §15

## Related Programs

ORDER-EVENTS-1

## Related ADRs

[ADR-ARCH-004](./ADR-ARCH-004.md) · [ADR-ARCH-010](./ADR-ARCH-010.md)

## Notes

Ratified with Constitution v1.0.

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)