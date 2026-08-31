# ADR-ARCH-042: Sale ↔ Customer Relationship

> [← ADR-ARCH-041](./ADR-ARCH-041-saudi-tax-invoice-boundary.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | **Accepted** |
| **Owner** | Architecture Authority |
| **Program** | SALE-CUSTOMER-LINK-1 |
| **Date** | 2026-08-31 |
| **Revision** | **1.0** |
| **Supersedes** | — |
| **Refines** | Customer Foundation (global buyer identity) · ADR-ARCH-041 (future Tax Invoice consumes Sale.customerId as input only) |
| **Does not modify** | Collection Fact · PAID · PaymentConfirm semantics · Compliance Orchestrator · Saudi Tax Profile · Tax Invoice |
| **Implementation status** | **Implemented** — nullable `orders.customerId` + Cashier Confirm persistence |
| **Numbering note** | Next free ADR after ADR-ARCH-041 is **042**. Next free after this ADR is **043**. |

---

## Decision

`Sale.customerId` (persisted as `orders.customerId`) identifies the Customer associated with the Sale.

It does **not** determine invoice classification, taxability, payment, or compliance behavior.

`customerId = NULL` is valid and represents a Sale without a selected Customer (Cashier may display `العميل: نقدًا` as display-only — never a fake Customer row).

The relationship is **global** and country-agnostic. Saudi/other compliance remains behind the Compliance Layer.

Foreign key: `orders.customerId → customers.id` with **ON DELETE SET NULL** so historical Sales survive Customer deletion.

## Consequences

- Cashier Confirm may pass optional `customerId`; server validates tenant membership.
- Future Tax Invoice may snapshot buyer from this reference; snapshots are a separate program.
- Collection Fact / PAID remain unchanged financial authority.
