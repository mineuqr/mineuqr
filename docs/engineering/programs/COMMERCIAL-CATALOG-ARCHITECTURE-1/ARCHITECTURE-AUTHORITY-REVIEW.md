# ARCHITECTURE-AUTHORITY-REVIEW.md

## A. Executive Decision

**APPROVED WITH CONDITIONS**

The commercial authority model is coherent and may be adopted as Proposed ADRs. It does **not** authorize Checkout migration, MRR implementation, Limits repair, capability-enforcement batches, or `isSubscriptionActive` mass replacement.

Conditions:

1. ADR-ARCH-034 / 035 / 036 remain **Proposed** until entered in the ADR Registry as Accepted. **Satisfied 2026-08-15** by [COMMERCIAL-ADR-REGISTRATION-1](../COMMERCIAL-ADR-REGISTRATION-1/00-PROGRAM-PACKAGE.md) — now **Accepted** (governance) in the constitutional registry. **Pricing period/renewal policy registered 2026-08-15** by [COMMERCIAL-PRICING-POLICY-UPDATE-1](../COMMERCIAL-PRICING-POLICY-UPDATE-1/00-PROGRAM-PACKAGE.md) (ADR-035/036 rev 1.1). Checkout cutover, MRR FX, and refund-to-binding remain open.
2. Commercial Entitlement Constitution v1.0 remains in force (still Pending Review in the Constitution Registry — do not weaken).
3. No production data or commercial policy change without a follow-on program after acceptance.

## B. Current-state architecture

See [CURRENT-STATE-ARCHITECTURE.md](./CURRENT-STATE-ARCHITECTURE.md).

## C. Target architecture

See [TARGET-ARCHITECTURE.md](./TARGET-ARCHITECTURE.md).

## D. Source-of-truth matrix

See [SOURCE-OF-TRUTH-MATRIX.md](./SOURCE-OF-TRUTH-MATRIX.md).

## E. State model

See [STATE-MODEL.md](./STATE-MODEL.md).

## F. Entitlement model

See [ENTITLEMENT-MODEL.md](./ENTITLEMENT-MODEL.md).

## G. Pricing model

See [PRICING-MODEL.md](./PRICING-MODEL.md).

## H. MRR constitution

See [MRR-CONSTITUTION.md](./MRR-CONSTITUTION.md) and [ADR-ARCH-036-mrr-constitution.md](./ADR-ARCH-036-mrr-constitution.md).

## I. Legacy boundary

See [LEGACY-BOUNDARY.md](./LEGACY-BOUNDARY.md) and [IS-SUBSCRIPTION-ACTIVE-FORENSICS.md](./IS-SUBSCRIPTION-ACTIVE-FORENSICS.md).

## J. ADRs

| ADR | Title | Action |
|-----|-------|--------|
| ADR-ARCH-006 | UI as Presentation Only | **Amend usage** — reaffirm for commercial UI (no text change required) |
| CE Constitution v1.0 | Entitlement enforcement | **Keep** — do not amend in this program |
| **ADR-ARCH-034** | Commercial Catalog Authority | **Registered** — [canonical](../../../architecture/adrs/ADR-ARCH-034-commercial-catalog-authority.md) |
| **ADR-ARCH-035** | Commercial Price Semantics | **Registered** — [canonical](../../../architecture/adrs/ADR-ARCH-035-commercial-price-semantics.md) |
| **ADR-ARCH-036** | MRR Constitution | **Registered** — [canonical](../../../architecture/adrs/ADR-ARCH-036-mrr-constitution.md) |
| ADR-020 / 022 / 026 | Check / Settlement / Revenue | **Unchanged** — MRR must not invade |

Registered 2026-08-15 by COMMERCIAL-ADR-REGISTRATION-1. Remaining architecture conditions are unchanged.

## K. Implementation programs (do not start automatically)

See [IMPLEMENTATION-SEQUENCE.md](./IMPLEMENTATION-SEQUENCE.md).
