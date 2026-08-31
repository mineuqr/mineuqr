# Future contracts — Saudi Tax Invoice (PROPOSED — NOT IMPLEMENTED)

Program: SAUDI-TAX-INVOICE-ARCHITECTURE-EVALUATION-1  
ADR: ADR-ARCH-041  

These are **documentation-only** contracts for a future implementation program.  
Do **not** create TypeScript runtime modules from this file in the evaluation program.

---

## 1. TaxInvoiceIssuanceTrigger (event input)

Mirrors and extends today’s `ProductionCollectionFactCommittedEvent`:

| Field | Required | Notes |
|-------|----------|-------|
| `collectionFactId` | yes | Idempotency key |
| `restaurantId` | yes | Tenancy |
| `countryCode` | yes | Server-authoritative |
| `orderId` | yes | Sale reference |
| `committedAt` | yes | Financial time |
| `commitOutcome` | yes | `created` \| `replayed` |
| `cashierInvoiceNumber` | optional | Operational only — not tax number |

Future enrichment (separate programs may add before issuance):

| Field | Notes |
|-------|-------|
| `customerId` | Nullable; null = anonymous / نقدًا display path |
| Frozen payable / line refs | From CF / order |

---

## 2. InvoiceClassification (decision)

**Owner:** Saudi Compliance  

**Inputs (conceptual):**

- Seller profile readiness + VAT registration status
- Buyer presence (`customerId` null?)
- Buyer snapshot candidates: `customerType`, `displayName`, `taxNumber`, address
- Taxable supply amount (for SAR 1,000 B2B simplified option)
- Optional explicit override flag (product — deferred)

**Outputs (conceptual):**

```
buyerCategory: "B2C" | "B2B" | "B2G"
saudiInvoiceForm: "SIMPLIFIED_TAX_INVOICE" | "STANDARD_TAX_INVOICE"
rationaleCode: string
blockingIssues: string[]
```

**Forbidden sole rule:** presence of `taxNumber`.

---

## 3. TaxInvoiceSnapshot (immutable payload)

| Section | Contents |
|---------|----------|
| Seller | legalName, vatNumber, vatRegistrationStatus, registeredAddress (copied) |
| Buyer | null \| { customerId, displayName, customerType, taxNumber, phone, email, address } |
| Lines | product identity/name, qty, unit price, discounts, taxable base, VAT rate/amount, line total (future) |
| Money | currency, totals aligned to issuance policy |
| Classification | frozen classifier output |
| Payment | tender summary from CF (cash/card/split) — informational |
| Refs | orderId, collectionFactId, cashierInvoiceNumber |

---

## 4. SaudiTaxInvoice (aggregate — proposed)

| Concern | Rule |
|---------|------|
| Identity | Internal taxInvoiceId + human Tax Invoice Number |
| Idempotency | Unique on `(restaurantId, collectionFactId, documentKind)` |
| States | Separate from PAID — see evaluation state machine |
| Mutation | No UPDATE of issued body; notes for corrections |

Document kinds (future): `TAX_INVOICE`, `CREDIT_NOTE`, `DEBIT_NOTE`.

---

## 5. ComplianceResult (pipeline outcome)

| Field | Notes |
|-------|-------|
| `collectionFactId` | Correlation |
| `status` | NOT_APPLICABLE / BLOCKED_PROFILE / PENDING / GENERATED / ISSUED / FAILED / RETRYABLE / … |
| `taxInvoiceId` | Nullable until created |
| `errorCode` | Ops |
| `attempt` | Retry counter |

**Must not** write Collection Fact or PAID.

---

## 6. Integration sketch (future)

```
ComplianceOrchestrator
  → saudiZatcaComplianceModule.onProductionCollectionFactCommitted
    → (future) SaudiTaxInvoiceService.issueForCollectionFact
      → load profile + buyer + sale freeze
      → InvoiceClassification.decide
      → persist TaxInvoiceSnapshot
      → (later) Phase1 QR / Phase2 Fatoora
      → emit ComplianceResult
```

VAT engine and ZATCA clients are **callees of** this service, not of Cashier or Collection Fact.

---

## 7. Explicit non-contracts

Not part of Tax Invoice contracts:

- Customer CRUD
- Collection Fact schema
- Cashier tender math
- Fake Customer for نقدًا
- Commercial plan entitlement as jurisdiction
