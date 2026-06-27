# ADR-ARCH-012: Printing and Kitchen as Event Consumers

> [← ADR-ARCH-011](../adrs/ADR-ARCH-011.md) · [Registry](../constitution/ADR-Registry.md) · [ADR-ARCH-013 →](../adrs/ADR-ARCH-013.md)

| Field | Value |
|---|---|
| **Status** | Accepted — Ratified |
| **Owner** | Architecture Authority |
| **Program** | KITCHEN-DISPLAY-1, PRINTING-1 |
| **Implementation status** | N/A (future) |
| **Supersedes** | — |

## Context

RESET-1 removed printing; kitchen implied by status only. Need fulfillment channels without polluting core domain.

## Decision

PRINTING-1 and KITCHEN-DISPLAY-1 may only integrate via Order domain events and read models—never inline in Order commit path.

## Consequences

(+) Clear re-entry path; no RESET-1 regression.

## Related Blueprint Sections

§2, §12, §15

## Related Programs

KITCHEN-DISPLAY-1, PRINTING-1

## Related ADRs

[ADR-ARCH-004](./ADR-ARCH-004.md) · [ADR-ARCH-005](./ADR-ARCH-005.md)

## Notes

RESET-1 retired print; re-entry via events only.

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)