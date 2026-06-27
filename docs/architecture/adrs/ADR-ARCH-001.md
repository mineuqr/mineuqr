# ADR-ARCH-001: Order as the Core Domain

> [Registry](../constitution/ADR-Registry.md) · [ADR-ARCH-002 →](../adrs/ADR-ARCH-002.md)

| Field | Value |
|---|---|
| **Status** | Accepted — Ratified |
| **Owner** | Architecture Authority |
| **Program** | ORDER-1 |
| **Implementation status** | Not implemented |
| **Supersedes** | — |

## Context

MineuQR's primary operational value is guest ordering. Without a sovereign Order bounded context, surrounding capabilities (notifications, session, analytics, future kitchen/print) compete for state in routers and UI. ARCH-1A.1 audit confirmed router-centric Order logic.

## Decision

Order is the **sole Core Domain**. All order lifecycle, lines, and totals are owned exclusively by the Order bounded context. Supporting domains (Commercial, Restaurant, Identity) gate or contextualize orders but never own order state. Integration contexts consume Order domain events.

## Consequences

(+) Clear ownership, stable integration contracts, ORDER-1 scope clarity. (−) Requires domain extraction from current router-centric implementation.

## Related Blueprint Sections

§1, §2, §3, §9, §25

## Related Programs

ORDER-1

## Related ADRs

[ADR-ARCH-007](./ADR-ARCH-007.md) · [ADR-ARCH-005](./ADR-ARCH-005.md)

## Notes

Baseline code non-compliant (router-centric).

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)