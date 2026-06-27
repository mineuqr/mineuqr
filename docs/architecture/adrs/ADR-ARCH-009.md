# ADR-ARCH-009: Order Read Models Own Dashboard Analytics

> [← ADR-ARCH-008](../adrs/ADR-ARCH-008.md) · [Registry](../constitution/ADR-Registry.md) · [ADR-ARCH-010 →](../adrs/ADR-ARCH-010.md)

| Field | Value |
|---|---|
| **Status** | Accepted — Ratified |
| **Owner** | Architecture Authority |
| **Program** | ORDER-1, ORDERS-WORKSPACE-1 |
| **Implementation status** | Not implemented |
| **Supersedes** | — |

## Context

Dashboard computes sales KPIs client-side (ADR-ARCH-002/006 violation).

## Decision

Today/month summaries and status breakdowns are served exclusively by server read models or query APIs.

## Consequences

(+) SSOT for analytics; requires ORDER-1 read model endpoints.

## Related Blueprint Sections

§11, §14

## Related Programs

ORDER-1, ORDERS-WORKSPACE-1

## Related ADRs

[ADR-ARCH-002](./ADR-ARCH-002.md) · [ADR-ARCH-006](./ADR-ARCH-006.md)

## Notes

Replaces client buildOrderStatistics.

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)