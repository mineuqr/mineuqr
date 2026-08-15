# ADR-ARCH-034: Commercial Catalog Authority

| Field | Value |
|-------|-------|
| **Status** | **Registered** — canonical: [ADR-ARCH-034](../../../architecture/adrs/ADR-ARCH-034-commercial-catalog-authority.md) |
| **Owner** | Architecture Authority / TDA |
| **Program** | COMMERCIAL-CATALOG-ARCHITECTURE-1 |
| **Date** | 2026-08-15 |
| **Supersedes** | — |
| **Does not modify** | ADR-020 Check money · Owner Access · Frozen · Entitlement Constitution CE-01…30 |

## Context

Live Plans already own catalog identity, capabilities, limits, and public list prices. Checkout and MRR still read `subscription_plans`. Capabilities in the editor are not all enforced.

## Decision

1. A **Live Plan** is the catalog definition, sellable product, and entitlement **template**. It is not the customer contract.
2. Customer contract = subscription instance + **Charged Terms**.
3. Runtime capabilities/limits for bound ACTIVE customers = **current** Live Plan (dynamic).
4. Account state ACTIVE / FROZEN / NONE is the operational commercial gate.
5. UI is presentation (ADR-006). Server `CanUse` / `checkLimit` / Frozen are authoritative.
6. A Plan capability is not “implemented” until server enforcement + negative tests exist (CE-04).
7. `subscription_plans` is a legacy compatibility boundary, not catalog authority.

## Consequences

+ One commercial authority model without rewriting Checkout now.  
− Dual price book remains until ADR-035 cutover.  
− flags_only capabilities remain advertised until per-capability programs.

## Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| Restore versioned snapshots | Retired in 0086; dynamic Live Plan is approved |
| Delete `subscription_plans` now | Checkout and MRR still depend on it |
| Treat editor flags as enforced | Violates CE-04 |
