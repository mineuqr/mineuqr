# ADR-ARCH-005: Production Path Authority

> [← ADR-ARCH-004](../adrs/ADR-ARCH-004.md) · [Registry](../constitution/ADR-Registry.md) · [ADR-ARCH-006 →](../adrs/ADR-ARCH-006.md)

| Field | Value |
|---|---|
| **Status** | Accepted — Ratified |
| **Owner** | Architecture Authority |
| **Program** | ORDER-1 |
| **Implementation status** | Partial |
| **Supersedes** | — |

## Context

Feature flags and alternate write paths (e.g. TABLE_SESSION_DUAL_WRITE) create divergent production behavior that cannot be certified.

## Decision

One **certified production path** for order create/update: Command → Application → Aggregate → Policies → Repository → Commit → Events → Subscribers → Read Models → Presentation. No feature-flag split write behavior in certified production.

## Consequences

(+) Predictable behavior, certifiable compliance. (−) Must retire dual-write before ORDER-1 sign-off.

## Related Blueprint Sections

§13, §14

## Related Programs

ORDER-1

## Related ADRs

[ADR-ARCH-001](./ADR-ARCH-001.md) · [ADR-ARCH-004](./ADR-ARCH-004.md) · [ADR-ARCH-010](./ADR-ARCH-010.md)

## Notes

TABLE_SESSION_DUAL_WRITE divergent path.

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)