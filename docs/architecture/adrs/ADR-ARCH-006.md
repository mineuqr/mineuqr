# ADR-ARCH-006: UI as Presentation Only

> [← ADR-ARCH-005](../adrs/ADR-ARCH-005.md) · [Registry](../constitution/ADR-Registry.md) · [ADR-ARCH-007 →](../adrs/ADR-ARCH-007.md)

| Field | Value |
|---|---|
| **Status** | Accepted — Ratified |
| **Owner** | Architecture Authority |
| **Program** | ORDER-1, ORDERS-WORKSPACE-1 |
| **Implementation status** | Not implemented |
| **Supersedes** | — |

## Context

Dashboard.tsx computes order statistics client-side (buildOrderStatistics), violating SSOT and duplicating business rules in presentation.

## Decision

UI renders server projections only. No KPI computation, no lifecycle FSM authority, no business rule duplication in the client.

## Consequences

(+) Single source for metrics; thinner client. (−) Server read model APIs required.

## Related Blueprint Sections

§11, §14

## Related Programs

ORDER-1, ORDERS-WORKSPACE-1

## Related ADRs

[ADR-ARCH-002](./ADR-ARCH-002.md) · [ADR-ARCH-009](./ADR-ARCH-009.md)

## Notes

Dashboard computes statistics client-side.

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)