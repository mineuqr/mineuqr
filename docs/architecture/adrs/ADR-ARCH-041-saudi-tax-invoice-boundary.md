# ADR-ARCH-041: Saudi Tax Invoice Boundary & Classification

> [← ADR-ARCH-040](./ADR-ARCH-040-multi-country-compliance-modules.md) · [← ADR-ARCH-039](./ADR-ARCH-039-payment-collection-financial-authority.md) · [← ADR-ARCH-027](./ADR-ARCH-027-operational-document-identity.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | **Accepted** (architecture evaluation) |
| **Owner** | Architecture Authority |
| **Program** | SAUDI-TAX-INVOICE-ARCHITECTURE-EVALUATION-1 |
| **Date** | 2026-08-31 |
| **Revision** | **1.0** |
| **Supersedes** | — |
| **Refines** | [ADR-ARCH-040](./ADR-ARCH-040-multi-country-compliance-modules.md) (Tax Invoice as Saudi compliance artifact downstream of Collection Fact) · [ADR-ARCH-039](./ADR-ARCH-039-payment-collection-financial-authority.md) (financial truth unchanged) · [ADR-ARCH-027](./ADR-ARCH-027-operational-document-identity.md) (tax invoice identity plane distinct from operational POS invoice) |
| **Does not modify** | Invoice Intent · Cashier Confirm · Collection Fact commit · PAID · Payment methods · Settlement · Customer schema · Saudi Tax Profile schema · Realtime |
| **Implementation status** | **Governance / evaluation only** — no Tax Invoice runtime, migration, ZATCA, IRN, QR, or VAT engine |
| **Numbering note** | Next free ADR after ADR-ARCH-040 is **041**. Next free after this ADR is **042**. |
| **Evaluation** | [SAUDI-TAX-INVOICE-ARCHITECTURE-EVALUATION-1.md](../evaluations/SAUDI-TAX-INVOICE-ARCHITECTURE-EVALUATION-1.md) |

---

## 1. Problem

MineuQR must support Saudi Tax Invoicing (Simplified and Standard forms; B2C and B2B) without redesigning Global Core around Saudi Arabia, without using Customer as an invoice-type oracle, and without coupling PAID to ZATCA success.

## 2. Context

Established baseline:

```
Invoice Intent → Cashier → Confirm → Collection Fact (= PAID on adopted Cashier path)
        → dispatchComplianceAfterProductionCollectionFact
        → ComplianceOrchestrator → resolveComplianceModule(countryCode)
        → SA: saudiZatcaComplianceModule (boundary today)
```

Customer Foundation provides optional buyer identity (`taxNumber` optional). Saudi Tax Profile provides seller configuration. Cashier may show `العميل: نقدًا` when no Customer is selected (display-only).

Official ZATCA Detailed Guidelines distinguish Tax Invoice (generally B2B) vs Simplified Tax Invoice (generally B2C; optional B2B under SAR 1,000), and Phase 2 clearance vs 24-hour reporting.

## 3. Decision

### 3.1 Global Core vs Compliance

Tax Invoice is a **Compliance-layer document**, not financial authority and not a Customer subtype.

Saudi Tax Invoice logic **MUST** remain behind `countryCode → Compliance Module` routing. It **MUST NOT** appear in Customer Core, Collection Fact commit, PaymentConfirm, or Cashier financial mutation paths.

### 3.2 Lifecycle position

Tax Invoice issuance is **downstream of successful Collection Fact commit**.

```
Collection Fact COMMIT (PAID)
    → Compliance Orchestrator
    → Saudi Compliance Module
    → InvoiceClassification + Tax Invoice pipeline (future)
```

Failed payments do not create Tax Invoices. Compliance failure does **not** reverse PAID.

Phase 2 clearance/reporting is a **compliance state** after local generation; it does not move Tax Invoice creation before Collection Fact.

### 3.3 Customer boundary

Customer answers **who** the buyer is. Customer **does not** determine invoice type, taxability, B2B/B2C, Simplified/Standard, or VAT rate.

Absence of `taxNumber` **MUST NOT** mean “non-tax invoice.”

`العميل: نقدًا` **MUST NOT** become a persisted Customer.

### 3.4 Tax Profile boundary

Seller tax identity is sourced from **Saudi Tax Profile** (restaurant-scoped). Tax Invoice **MUST** snapshot seller fields at issuance. Profile edits do not rewrite history. Tax Invoice **MUST NOT** duplicate seller identity into Customer.

### 3.5 Invoice Classification

Introduce a dedicated **InvoiceClassification** decision (owned by Saudi Compliance) with explicit inputs/outputs.

**Forbidden:** `customer.taxNumber ? B2B : B2C` as sole rule.

Classification result is immutable on the Tax Invoice snapshot.

### 3.6 Snapshots & immutability

At issuance, freeze seller, buyer (or anonymous), line/money facts, classification, tender refs, and cross-ids (`orderId`, `collectionFactId`, operational cashier invoice number).

Issued Tax Invoice body is immutable; corrections use Credit/Debit Notes (deferred programs).

### 3.7 Identity & idempotency

| ID | Role |
|----|------|
| `collectionFactId` | Primary compliance idempotency key (one tax invoice per collection event + document kind) |
| Cashier invoice number | Operational POS identity only |
| Tax Invoice Number | Separate Compliance-owned series (register under ADR-027 when implemented) |

### 3.8 VAT boundary

VAT calculation for Tax Invoice belongs to a Compliance-owned tax calculation capability. It must not enter Customer, Collection Fact schema, Cashier tender logic, or Global Core as a ZATCA dependency.

### 3.9 Multi-country

UAE and others add modules via the registry. Global Core stays country-agnostic.

## 4. Consequences

**Positive**

- Preserves ADR-039/040 financial authority
- Enables B2C Simplified and B2B Standard without Customer pollution
- Clear extension for Phase 1/2 and future countries

**Negative / deferred**

- Requires durable compliance delivery (beyond today’s best-effort dispatch)
- Requires persisting Customer on sale for buyer snapshots
- Phase 2 clearance UX for B2B is a separate product design
- Several legal/product defaults need official confirmation (see evaluation §14)

## 5. Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Tax Invoice before payment | Unpaid invoices; POS blocked on clearance |
| Tax Invoice fields on Collection Fact | Financial/compliance conflation |
| Customer drives invoice type | Violates platform invariants |
| Non-tax invoice when no buyer VAT | Incorrect for VAT-registered sellers |
| Saudi logic in Cashier / PaymentConfirm | Multi-country leakage |

## 6. Related

- Evaluation: `docs/architecture/evaluations/SAUDI-TAX-INVOICE-ARCHITECTURE-EVALUATION-1.md`
- Future contracts: `docs/architecture/contracts/saudi-tax-invoice-future-contracts.md`
- Guards: `server/compliance/__tests__/saudiTaxInvoiceArchitecture.evaluation.guards.test.ts`
