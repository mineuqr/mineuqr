# ADR-ARCH-011: Optimistic Concurrency on Order Root

> [← ADR-ARCH-010](../adrs/ADR-ARCH-010.md) · [Registry](../constitution/ADR-Registry.md) · [ADR-ARCH-012 →](../adrs/ADR-ARCH-012.md)

| Field | Value |
|---|---|
| **Status** | Accepted — Ratified |
| **Owner** | Architecture Authority |
| **Program** | ORDER-1 |
| **Implementation status** | Not implemented |
| **Supersedes** | — |

## Context

Concurrent status updates may cause lost updates; no version check on update today.

## Decision

Order root carries version/updatedAt check on save; stale writes rejected with ConcurrencyConflict.

## Consequences

(+) Safer multi-staff operations; (−) UI retry on conflict.

## Related Blueprint Sections

§10, §23

## Related Programs

ORDER-1

## Related ADRs

[ADR-ARCH-007](./ADR-ARCH-007.md) · [ADR-ARCH-002](./ADR-ARCH-002.md)

## Notes

Prevent lost updates on status.

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)