# ADR-ARCH-036: Commercial MRR Constitution

| Field | Value |
|-------|-------|
| **Status** | **Registered** — canonical: [ADR-ARCH-036 rev 1.1](../../../architecture/adrs/ADR-ARCH-036-mrr-constitution.md) (Charged Terms / period / renewal MRR) |
| **Owner** | Architecture Authority / TDA |
| **Program** | COMMERCIAL-CATALOG-ARCHITECTURE-1 |
| **Date** | 2026-08-15 |
| **Supersedes** | — |
| **Does not modify** | ADR-020 · 022 · 026 Check / Settlement / Revenue |

## Context

MRR today sums `subscription_plans` prices for `countsInMrr` owners. Charged terms exist and are the contractual amount. Check Revenue is a different plane.

## Decision

1. MRR is a **commercial recurring metric**, not operational financial revenue.
2. Price source: **Charged Terms**, monthly-equivalent (yearly ÷ 12).
3. Include only ACTIVE paid catalog plans with positive charged amount.
4. Exclude trial, FROZEN, NONE, owner modes, complimentary zero, internal population.
5. Current-state (point-in-time), not period P&L.
6. No implementation until this ADR is Accepted **and** FX + refund-to-binding decisions are recorded.

Normative text: [MRR-CONSTITUTION.md](./MRR-CONSTITUTION.md).

## Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| Catalog price | Moves when editor saves; violates history |
| Keep `subscription_plans` as MRR law | Dual book; not contracted amount |
| Merge MRR into Check Revenue | Violates ADR-020 |
