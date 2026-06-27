# ADR-ARCH-007: Order Aggregate Authority

> [← ADR-ARCH-006](../adrs/ADR-ARCH-006.md) · [Registry](../constitution/ADR-Registry.md) · [ADR-ARCH-008 →](../adrs/ADR-ARCH-008.md)

| Field | Value |
|---|---|
| **Status** | Accepted — Ratified |
| **Owner** | Architecture Authority |
| **Program** | ORDER-1 |
| **Implementation status** | Not implemented |
| **Supersedes** | — |

## Context

Current code mutates orders via db.ts helpers and router procedures without an aggregate consistency boundary.

## Decision

The Order Aggregate is the **sole mutation authority** for order state. Lifecycle transitions, line immutability, and invariants are enforced in the domain layer via policies.

## Consequences

(+) Consistency boundary, testable invariants. (−) Full domain module extraction in ORDER-1.

## Related Blueprint Sections

§3–§7, §10

## Related Programs

ORDER-1

## Related ADRs

[ADR-ARCH-001](./ADR-ARCH-001.md) · [ADR-ARCH-002](./ADR-ARCH-002.md) · [ADR-ARCH-011](./ADR-ARCH-011.md)

## Notes

No aggregate module; db direct mutation.

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)