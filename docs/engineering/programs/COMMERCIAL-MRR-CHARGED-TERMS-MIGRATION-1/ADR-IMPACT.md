# ADR-IMPACT

**Program:** COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1

No ADR was amended. No ADR file was edited.

## ADR-ARCH-034 — Commercial Catalog Authority

| Item | Result |
|------|--------|
| Amendment required? | **NO** |
| Impact | Live Plan remains catalog authority. MRR does not read current catalog price. |

## ADR-ARCH-035 — Commercial Price Semantics

| Item | Result |
|------|--------|
| Amendment required? | **NO** |
| Impact | Charged Terms remain the customer contract amount. Checkout / bind write policy unchanged. MRR now **reads** that contract amount. |

## ADR-ARCH-036 — Commercial MRR Constitution

| Item | Result |
|------|--------|
| Amendment required? | **NO** for constitution text |
| Implementation alignment | **YES** — canonical MRR now uses Charged Terms of qualifying subscriptions |
| Stale governance fields | ADR still says “Governance only” and “this ADR authorizes no MRR code change” — those sentences described the **registration** program, not a permanent ban. This program **is** the gated implementation. |
| FX / refund wait language | ADR lists FX and refund-to-binding as open policy. This program does **not** invent FX or refund rules. USD-native Charged Terms + fail-closed non-USD is sufficient. |

Architecture Authority directed this gated program. Constitution invariants I-PRICE-08 / I-PRICE-09 are now implemented in code. Updating ADR-036 **status** from “Governance only” to “Implemented” is an optional documentation follow-up — **not applied here**.
