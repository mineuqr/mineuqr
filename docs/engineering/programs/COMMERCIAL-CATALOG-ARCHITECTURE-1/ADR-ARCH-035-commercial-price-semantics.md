# ADR-ARCH-035: Commercial Price Semantics

| Field | Value |
|-------|-------|
| **Status** | **Registered** — canonical: [ADR-ARCH-035 rev 1.1](../../../architecture/adrs/ADR-ARCH-035-commercial-price-semantics.md) (period/renewal policy) |
| **Owner** | Architecture Authority / TDA |
| **Program** | COMMERCIAL-CATALOG-ARCHITECTURE-1 |
| **Date** | 2026-08-15 |
| **Supersedes** | — |

## Context

Public Pricing can show 26.40 USD while Checkout charges 39.00 USD. Catalog edits must not rewrite charged terms.

## Decision

1. Distinguish **public list**, **checkout**, **charged terms**, **renewal**, **historical** prices.
2. Catalog edit updates **list price only**.
3. New catalog price applies at **new checkout (target)**, **renewal/re-bind**, **upgrade**, **downgrade** — not equivalently, and not on silent edit.
4. **Target checkout price** = Live Plan public list price of the selected Offer (plan + cycle + currency).
5. Until a dedicated cutover program after this ADR is **Accepted**, Checkout remains on `subscription_plans`.
6. Charged terms stay historically stable.

## Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| One mutable price field for all semantics | Rewrites history |
| Charge catalog immediately without cutover design | Currency / dual-write / customer messaging undecided |
| Keep dual book permanently | Commercial inconsistency |
