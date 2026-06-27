# ADR-ARCH-004: Event-Driven Domain Integration

> [← ADR-ARCH-003](../adrs/ADR-ARCH-003.md) · [Registry](../constitution/ADR-Registry.md) · [ADR-ARCH-005 →](../adrs/ADR-ARCH-005.md)

| Field | Value |
|---|---|
| **Status** | Accepted — Ratified |
| **Owner** | Architecture Authority |
| **Program** | ORDER-1, ORDER-EVENTS-1 |
| **Implementation status** | Not implemented |
| **Supersedes** | — |

## Context

ARCH-1A.1 found synchronous notification and session calls inside order.create. Side effects in command handlers create ordering hazards and tight coupling.

## Decision

Side effects (notifications, session linkage, analytics, future kitchen/print) react to **domain events** published after commit, not inline calls from routers or application handlers.

## Consequences

(+) Reliable integration, testable subscribers. (−) Requires outbox (ADR-ARCH-008) and idempotent consumers.

## Related Blueprint Sections

§8, §12, §13, §15

## Related Programs

ORDER-1, ORDER-EVENTS-1

## Related ADRs

[ADR-ARCH-008](./ADR-ARCH-008.md) · [ADR-ARCH-010](./ADR-ARCH-010.md) · [ADR-ARCH-012](./ADR-ARCH-012.md)

## Notes

Sync side effects in current router.

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)