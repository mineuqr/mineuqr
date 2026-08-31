# ADR-ARCH-043: Saudi Tax Invoice Domain Foundation

> [← ADR-ARCH-041](./ADR-ARCH-041-saudi-tax-invoice-boundary.md) · [← ADR-ARCH-042](./ADR-ARCH-042-sale-customer-link.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | **Accepted** |
| **Owner** | Architecture Authority |
| **Program** | SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1 |
| **Date** | 2026-08-31 |
| **Revision** | **1.0** |
| **Supersedes** | — |
| **Implements** | [ADR-ARCH-041](./ADR-ARCH-041-saudi-tax-invoice-boundary.md) (domain persistence + Saudi boundary wiring) |
| **Does not modify** | Collection Fact semantics · PAID · PaymentConfirm · Settlement · Customer Core · Cashier financial paths · Saudi Tax Profile schema |
| **Implementation status** | **Implemented** — `saudi_tax_invoices` + Saudi module ensure path |
| **Numbering note** | Next free ADR after ADR-ARCH-042 is **043**. Next free after this ADR is **044**. |

---

## 1. Decision

### 1.1 Ownership

Tax Invoice is a **Saudi Compliance artifact**, persisted as `saudi_tax_invoices` and ensured from `saudiZatcaComplianceModule` after Collection Fact commit.

Tax Invoice is **not** financial authority. Collection Fact / PAID remain financial truth.

### 1.2 Identity & idempotency

| ID | Role |
|----|------|
| `taxInvoiceId` (`sti_…`) | Internal immutable Tax Invoice identity |
| `(restaurantId, collectionFactId, documentKind)` | Idempotency uniqueness |
| Cashier invoice number | Operational only — not Tax Invoice Number |
| Human Tax Invoice Number | **Deferred** (no numbering invented here) |

### 1.3 Snapshots

At ensure time, freeze seller (Saudi Tax Profile), buyer (Customer or anonymous_cash), lines (order items + CF composition), monetary (CF totals copy), payment tenders (CF), and classification result.

After `status = generated`, snapshot body is immutable. Corrections require future Credit/Debit Note programs.

### 1.4 Classification

Classification is an explicit persisted Compliance concept.

- Absent Customer → B2C Simplified **context** (platform invariant; still a tax invoice)
- Present Customer → `unclassified` / `undetermined` until official policy
- Forbidden: `customer.taxNumber ? B2B : B2C`

### 1.5 Profile readiness

If Saudi Tax Profile is not `READY`, persist `blocked_profile` (deterministic readiness failure). Do not fake a valid issued document. PAID remains unchanged.

### 1.6 Multi-country

Saudi-specific tables/services live under Saudi Compliance. Global Customer / Financial Core gain no `countryCode === "SA"` branching.

## 2. Consequences

- Domain foundation ready for Phase 1 generation without redesigning Financial Core
- Legal classification engine, VAT engine, ZATCA/Fatoora/IRN/QR remain separate programs
- Durable compliance outbox (G1) remains a delivery enhancement, not a lifecycle redesign

## 3. Related

- Program: `docs/engineering/programs/SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1/`
- Evaluation: ADR-041 / SAUDI-TAX-INVOICE-ARCHITECTURE-EVALUATION-1
