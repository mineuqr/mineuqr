# ADR-ARCH-002: Single Source of Truth

> [← ADR-ARCH-001](../adrs/ADR-ARCH-001.md) · [Registry](../constitution/ADR-Registry.md) · [ADR-ARCH-003 →](../adrs/ADR-ARCH-003.md)

| Field | Value |
|---|---|
| **Status** | Accepted — Ratified |
| **Owner** | Architecture Authority |
| **Program** | ORDER-1 |
| **Implementation status** | Partial |
| **Supersedes** | — |

## Context

Client and server may diverge when UI computes KPIs or accepts client-supplied prices. Financial and operational integrity requires one authoritative source for order data and derived metrics.

## Decision

Persisted order data and server read models are the **only** sources of truth for business metrics and lifecycle. Client-supplied prices and names are never authoritative. Dashboard analytics must be served from server read models (see ADR-ARCH-009).

## Consequences

(+) Tamper resistance, consistent reporting. (−) Requires read model endpoints; removal of client KPI computation.

## Related Blueprint Sections

§6, §10, §11, §13

## Related Programs

ORDER-1

## Related ADRs

[ADR-ARCH-006](./ADR-ARCH-006.md) · [ADR-ARCH-007](./ADR-ARCH-007.md) · [ADR-ARCH-009](./ADR-ARCH-009.md)

## Notes

Server pricing authoritative; client KPIs violate until ORDER-1.

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)