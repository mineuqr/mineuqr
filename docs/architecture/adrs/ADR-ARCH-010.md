# ADR-ARCH-010: Session Integration via Order Events Only

> [← ADR-ARCH-009](../adrs/ADR-ARCH-009.md) · [Registry](../constitution/ADR-Registry.md) · [ADR-ARCH-011 →](../adrs/ADR-ARCH-011.md)

| Field | Value |
|---|---|
| **Status** | Accepted — Ratified |
| **Owner** | Architecture Authority |
| **Program** | ORDER-1, ORDER-EVENTS-1 |
| **Implementation status** | Not implemented |
| **Supersedes** | — |

## Context

Session aggregates updated inline on create/cancel; TABLE_SESSION_DUAL_WRITE creates divergent paths.

## Decision

Session context subscribes to OrderCreated/OrderCancelled; no session writes in PlaceOrderService.

## Consequences

(+) Cleaner boundaries; (−) eventual consistency for session totals.

## Related Blueprint Sections

§8, §12, §15

## Related Programs

ORDER-1, ORDER-EVENTS-1

## Related ADRs

[ADR-ARCH-004](./ADR-ARCH-004.md) · [ADR-ARCH-005](./ADR-ARCH-005.md) · [ADR-ARCH-008](./ADR-ARCH-008.md)

## Notes

Retire inline session aggregate writes.

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)