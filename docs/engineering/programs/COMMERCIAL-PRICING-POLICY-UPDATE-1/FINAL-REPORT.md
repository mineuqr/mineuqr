# FINAL-REPORT.md — COMMERCIAL-PRICING-POLICY-UPDATE-1

**Date:** 2026-08-15  
**Program result:** **APPROVED — PRICING POLICY REGISTERED**

Overall commercial architecture remains:

> **ARCHITECTURE NOT READY — ADDITIONAL DECISION REQUIRED**

---

## A. Policy status

**APPROVED — PRICING POLICY REGISTERED**

Registered in ADR-ARCH-035 / ADR-ARCH-036 revision **1.1**. ADR-ARCH-034 received a minimal cross-reference only.

## B. Documents changed

- `docs/architecture/adrs/ADR-ARCH-034-commercial-catalog-authority.md` (rev 1.1 cross-ref)
- `docs/architecture/adrs/ADR-ARCH-035-commercial-price-semantics.md` (rev 1.1 policy)
- `docs/architecture/adrs/ADR-ARCH-036-mrr-constitution.md` (rev 1.1 MRR alignment)
- `docs/architecture/constitution/ADR-Registry.md` (notes / program citations)
- `docs/engineering/programs/COMMERCIAL-CATALOG-ARCHITECTURE-1/PRICING-POLICY-ADDENDUM.md` (**new**)
- `docs/engineering/programs/COMMERCIAL-CATALOG-ARCHITECTURE-1/FINAL-REPORT.md`
- `docs/engineering/programs/COMMERCIAL-CATALOG-ARCHITECTURE-1/ARCHITECTURE-AUTHORITY-REVIEW.md`
- `docs/engineering/programs/COMMERCIAL-CATALOG-ARCHITECTURE-1/00-PROGRAM-PACKAGE.md`
- `docs/engineering/programs/COMMERCIAL-CATALOG-ARCHITECTURE-1/PRICING-MODEL.md` (pointer addendum)
- `docs/engineering/programs/COMMERCIAL-CATALOG-ARCHITECTURE-1/MRR-CONSTITUTION.md` (pointer addendum)
- `docs/engineering/programs/COMMERCIAL-PRICING-POLICY-UPDATE-1/*` (this package)

## C. Policy captured

- New Checkout uses the current Live Plan Offer List Price presented at that event.
- Current subscription period retains its Charged Terms.
- Price increases do not retroactively charge.
- Price decreases do not retroactively refund.
- Renewal uses the current Live Plan Offer List Price.
- Renewal may increase, decrease, or keep the price. **No lifetime price lock.**
- New capabilities may reach existing subscribers without additional charge during the current period (server enforcement remains authoritative).
- MRR follows current Charged Terms, not current catalog price and not cash paid today.

Invariants documented: **I-PRICE-01** through **I-PRICE-10**.

## D. Open decisions (preserved)

1. **Checkout Cutover Design**
2. **MRR FX Policy**
3. **Refund-to-Binding Classification**

Refund ≠ Charged Terms change. Refund ≠ MRR change. No FX source, date, or conversion was introduced.

## E. Implementation safety

- No application code changed.
- No Checkout changed.
- No MRR implementation changed.
- No production data changed.
- No database migration performed.
- No Limits / Entitlement implementation changed.
- No `isSubscriptionActive` replacement performed.

## F. Git

- **HEAD:** `fc4644b1` (`chore(commercial): checkpoint live plans catalog audit`)
- **Modified:** `docs/architecture/constitution/ADR-Registry.md`
- **Untracked:** `docs/architecture/adrs/ADR-ARCH-034-*.md`, `ADR-ARCH-035-*.md`, `ADR-ARCH-036-*.md`; `docs/engineering/programs/COMMERCIAL-ADR-REGISTRATION-1/`; `COMMERCIAL-CATALOG-ARCHITECTURE-1/`; `COMMERCIAL-PRICING-POLICY-UPDATE-1/`
- **Application paths (`server` / `client` / `shared` / `api`):** none
- **No commit. No push. No deploy.**

---

**STOP.** Do not start Checkout Cutover, MRR implementation, Entitlement, Limits, or Pricing UI programs.
