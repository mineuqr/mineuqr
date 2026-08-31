# SAUDI-TAX-INVOICE-ARCHITECTURE-EVALUATION-1

| Field | Value |
|-------|-------|
| **Program** | SAUDI-TAX-INVOICE-ARCHITECTURE-EVALUATION-1 |
| **Type** | Architecture evaluation only |
| **Date** | 2026-08-31 |
| **Starting SHA** | `ca351d20bc8b44d73c555cc762b9223eb5ce8ef3` |
| **ADR** | [ADR-ARCH-041](../adrs/ADR-ARCH-041-saudi-tax-invoice-boundary.md) |
| **Contracts** | [saudi-tax-invoice-future-contracts.md](../contracts/saudi-tax-invoice-future-contracts.md) |
| **Implementation** | **NONE** — no Tax Invoice code, migration, ZATCA, IRN, QR, or VAT engine |

---

## 1. Verdict summary

**PASS WITH OPEN QUESTIONS**

The current MineuQR Financial Core + Compliance Layer is **compatible** with Saudi Tax Invoicing when Tax Invoice is treated as a **downstream compliance artifact**, not as financial authority.

No Financial Core conflict requiring immediate redesign was found. Several **open questions** require official confirmation or future product decisions before implementation (listed in §14).

---

## 2. Repository evidence (verified)

| Artifact | Path | Observed role |
|----------|------|---------------|
| Collection Fact authority | ADR-ARCH-039; `commitCashierProductionCollectionFact` | Insert-only financial truth; PAID = CF commit |
| Post-CF compliance dispatch | `server/compliance/dispatchComplianceAfterProductionCollectionFact.ts` | Best-effort downstream; does not affect paid result |
| Orchestrator | `server/compliance/ComplianceOrchestrator.ts` | Resolves `countryCode` → module; invokes observer |
| Registry | `shared/compliance/resolveComplianceModule.ts` | `SA` → `saudiZatcaComplianceModule`; else NoOp |
| Saudi module | `shared/compliance/modules/saudiZatcaComplianceModule.ts` | Boundary only; empty `onProductionCollectionFactCommitted` |
| Event identity | `shared/compliance/complianceEvents.ts` | `collectionFactId` is compliance event identity; `cashierInvoiceNumber` explicitly **not** a tax invoice |
| Saudi Tax Profile | `saudi_tax_profiles` / SAUDI-TAX-PROFILE-1 | Seller config; readiness NOT_CONFIGURED / INCOMPLETE / READY |
| Customer | CUSTOMER-FOUNDATION-1 | Global buyer identity; optional `taxNumber`; no SA branching |
| Cashier customer UI | `CashierCustomerBar` | Select/create; `selectedCustomer` is **local UI state only** today |
| Cashier invoice | `allocateCashierInvoiceForOrder` | Operational POS invoice number — separate from tax invoice |
| Wiring sites | `CheckService.ts`, `finalizeCashierPreparedInvoice.ts` | Call dispatch after production CF commit |

**Invariant already encoded in ADR-ARCH-040:** Compliance observes financial truth; it must not mutate Collection Fact / PAID / tenders.

---

## 3. First principle — multi-country

```
GLOBAL CORE (country-agnostic)
  Cashier · Customer · Order · Invoice Intent · Collection Fact · PAID
                │
                ▼
        Compliance Layer
                │
        resolveComplianceModule(countryCode)
                │
     ┌──────────┼──────────┐
     SA         AE         other / unknown
     │          │          │
  Saudi        future     NoOp
  module
```

Saudi Tax Invoice **must** live inside the Saudi Compliance boundary (and services it owns), never in Customer Core, Collection Fact commit, PaymentConfirm, or Cashier financial paths.

---

## 4. Critical business invariants (platform decisions)

| ID | Invariant | Status |
|----|-----------|--------|
| INV-1 | Customer presence ≠ invoice type | **Adopted** |
| INV-2 | `taxNumber` absence ≠ non-tax invoice | **Adopted** |
| INV-3 | `taxNumber` presence ≠ automatic B2B | **Adopted** (must not hardcode) |
| INV-4 | `العميل: نقدًا` is display-only; never a Customer row | **Adopted** (CUSTOMER-FOUNDATION-1) |
| INV-5 | Seller tax identity lives on Saudi Tax Profile, not Customer | **Adopted** |
| INV-6 | Financial PAID must not require compliance success | **Adopted** (ADR-040) |

---

## 5. Q1–Q14 — required decisions

### Q1 — Where does Tax Invoice belong?

**Decision:** Tax Invoice is a **Compliance-layer artifact** owned by the Saudi Compliance module / future `SaudiTaxInvoiceService`, triggered from Compliance Orchestration after an authoritative financial event.

It is **not** Invoice Intent, Cashier operational invoice, Collection Fact, Settlement Record, or Customer.

### Q2 — When is Tax Invoice created relative to Invoice Intent / Collection Fact / PAID?

**Recommended lifecycle (ARCHITECTURAL RECOMMENDATION — aligns with ADR-040):**

```
Invoice Intent (commercial/ops)
    → Cashier Confirm / Payment process
    → Collection Fact COMMIT (= PAID on adopted Cashier path)
    → dispatchComplianceAfterProductionCollectionFact
    → ComplianceOrchestrator
    → Saudi module
    → Tax Invoice issuance pipeline (future)
```

**Why post–Collection Fact is correct for MineuQR:**

1. Tax Invoice must describe a **completed taxable supply / collection**. Failed payments must not create tax invoices.
2. Collection Fact already freezes payable, tenders, and sale identity (ADR-039).
3. Idempotency key already designated: `collectionFactId` (ADR-040 / complianceEvents).
4. Compliance failure must remain retryable without rewriting PAID (I-SET-01 / ADR-040).

**Rejected:** Tax Invoice before payment / before CF — creates invoices for cancelled or unpaid sales; couples Cashier UX to clearance latency; risks dual authority.

**Phase nuance (OFFICIAL / VERIFIED from ZATCA Detailed Guidelines):**

- **Simplified Tax Invoice (typical B2C):** Generation (and Phase 2 local stamp/QR) then share with buyer; report to Fatoora within 24h. Fits post-payment POS flow.
- **Standard Tax Invoice (typical B2B/B2G, Phase 2):** Clearance before sharing with buyer. Financial PAID can still precede clearance; **buyer-facing tax document delivery** waits on clearance state. This is a **compliance presentation/state** concern, not a reason to move Tax Invoice before CF.

**No Financial Core conflict found.** The existing `dispatchComplianceAfterProductionCollectionFact` boundary is the correct **hook**. The future Tax Invoice **pipeline** must harden durability beyond today’s best-effort `dispatchBestEffortDownstreamDelivery` (see §11 / gap G1).

### Q3 — Who determines B2B / B2C / Simplified / Standard?

**Owner:** `InvoiceClassification` decision service **inside Saudi Compliance** (country module scope).

**Not owned by:** Customer, Cashier payment logic, Collection Fact, VAT engine, ZATCA client.

### Q4 — Does Customer determine invoice type?

**NO.** Customer supplies buyer identity inputs. Classification is a separate decision.

### Q5 — Does absence of customer tax number mean non-tax invoice?

**NO.** For SA VAT-registered sellers, absence of buyer VAT typically implies **Simplified / B2C-style** treatment (OFFICIAL direction from ZATCA definitions), **not** “non-tax invoice.”

Unregistered sellers (`vatRegistrationStatus = not_registered`) remain a **profile / applicability** question — see NEEDS OFFICIAL CONFIRMATION.

### Q6 — How does `العميل: نقدًا` map?

| Cashier state | Domain meaning | Classification input |
|---------------|----------------|----------------------|
| `customerId = null` | Anonymous walk-in; label is display-only | Buyer absent → default **B2C / Simplified** path (recommendation) |
| Customer selected | Buyer identity present | Inputs to classification; type still decided by classifier |

Never materialize a Customer named نقدًا.

### Q7 — How does Saudi Tax Profile participate?

Seller snapshot source at Tax Invoice issuance:

- `legalName`, `vatRegistrationStatus`, `vatNumber`, `registeredAddress`
- readiness gate: cannot issue when NOT_CONFIGURED / INCOMPLETE (product policy for SA module)

Profile edits after issuance **must not** rewrite historical invoices (snapshot).

### Q8 — Where does VAT calculation belong?

**Recommended:** Saudi **Tax Calculation** capability inside Compliance (or a Compliance-owned calculator used by Tax Invoice), consuming frozen sale lines + jurisdiction rules.

**Forbidden homes:** Customer, Collection Fact schema, Cashier tender logic, Product catalog as live authority after sale, Global Financial Core as VAT/ZATCA dependency.

Note: Collection Fact already freezes payable amounts for **financial** truth. Tax Invoice line VAT breakdown may recompute or copy from frozen financial snapshots — future program must choose one SSOT without dual money authority (see open question OQ-VAT-1).

### Q9 — Where does invoice numbering belong?

| Identity | Owner | Notes |
|----------|-------|-------|
| Order ID | Order | Commercial sale |
| Collection Fact ID | Financial Core | Financial event / compliance idempotency key |
| Cashier invoice number | POS operational (`cashier_invoices`) | **Not** tax invoice |
| Tax Invoice ID (persistence) | Compliance Tax Invoice aggregate | Internal |
| Tax Invoice Number (human/legal) | Compliance / Saudi Tax Invoice series | Register under ADR-027 when implemented |

Tax Invoice Number ≠ Cashier invoice number (already stated in complianceEvents).

### Q10 — Where does immutability begin?

Immutability of Tax Invoice **content** begins at **successful issuance commit** of the Tax Invoice artifact (and for Phase 2 Standard invoices, after clearance stamp is attached — product must define “issued”).

Corrections → Credit/Debit Notes (deferred), never UPDATE of issued tax invoice body.

### Q11 — Retries / idempotency

| Concern | Rule |
|---------|------|
| Primary idempotency key | `collectionFactId` (+ document kind, e.g. tax_invoice) |
| Replay of CF commit (`commitOutcome: replayed`) | Must not create a second tax invoice |
| Browser refresh / network retry | Financial Confirm already idempotent; compliance pipeline must be idempotent on CF id |
| Duplicate dispatch | Upsert/get-or-create by CF id |
| Compliance failure | Retryable compliance state; **no** PAID reversal |

### Q12 — Compliance failure vs financial truth

Compliance failure → compliance state `FAILED` / `RETRYABLE` (names TBD).  
PAID / Collection Fact unchanged.  
Ops logging already exists on dispatch failure.  
Future: durable outbox/queue for compliance jobs (gap G1).

### Q13 — UAE / other countries

Add modules via `resolveComplianceModule`; implement country Tax Invoice behind that module. No Global Core branches. AE remains NoOp until a UAE program.

### Q14 — What next after this evaluation?

Recommended sequence (no implementation in this program):

1. **SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1** — Tax Invoice persistence + classification + snapshots + state machine (still no ZATCA API).
2. **ORDER-CUSTOMER-LINK-1** (or equivalent) — persist `customerId` on sale/confirm so buyer snapshot has a durable source (gap G2).
3. **SAUDI-TAX-INVOICE-PHASE1-GENERATION-1** — generation fields, numbering, QR (Phase 1 simplified), no Fatoora.
4. Phase 2 clearance/reporting — separate program.
5. Credit/Debit Notes — separate program.

---

## 6. Invoice Classification architecture

### Concept: `InvoiceClassification` (proposed)

| Aspect | Decision |
|--------|----------|
| Ownership | Saudi Compliance module |
| Timing | At Tax Invoice issuance (post-CF), using frozen inputs |
| Immutability | Classification result stored on Tax Invoice snapshot |
| Extensibility | Country modules own their classifiers; Global Core has none |

### Inputs (recommended)

- Seller profile snapshot (Saudi Tax Profile)
- Buyer presence (`customerId` null vs present)
- Buyer snapshot fields (`customerType`, `taxNumber`, name, address) — **inputs**, not decisions
- Optional explicit sale flag / channel policy (future product)
- Taxable supply amount (for SAR 1,000 B2B simplified option — OFFICIAL)

### Outputs (recommended)

- `buyerCategory`: `B2C` \| `B2B` \| `B2G` (B2G deferred until needed)
- `saudiInvoiceForm`: `SIMPLIFIED_TAX_INVOICE` \| `STANDARD_TAX_INVOICE`
- `rationaleCode` (audit)
- Validation issues (blocking vs warning)

### Forbidden classifier

```
customer.taxNumber ? B2B : B2C
```

### Official direction (certainty labeled)

From ZATCA *Detailed Guidelines* (OFFICIAL / VERIFIED):

- **Tax Invoice (Standard):** generally B2B; includes buyer details.
- **Simplified Tax Invoice:** generally B2C; buyer details generally not required; optional for B2B when taxable supplies **&lt; SAR 1,000**.
- Phase 2: Standard → clearance; Simplified → reporting within 24 hours.

Exact MineuQR product defaults when buyer is a named Individual without VAT remain **product+legal confirmation** (OQ-CLASS-1).

---

## 7. Snapshot strategy

At Tax Invoice issuance, freeze:

| Snapshot | Source | Why |
|----------|--------|-----|
| Seller | Saudi Tax Profile | Profile mutates over time |
| Buyer | Customer (or anonymous) | Customer mutates; null stays null |
| Lines / money | Order lines + CF frozen payable | Product/price edits must not rewrite history |
| Classification | Classifier output | Audit |
| Payment tenders | CF tender components | Payment method ≠ classification |
| Operational refs | `orderId`, `collectionFactId`, cashier invoice # | Traceability |

**Snapshot timing:** immediately before Tax Invoice persistence commit, after CF exists.

---

## 8. State machine (compliance — proposed)

Financial state remains on Collection Fact / PAID. Compliance state is separate:

| State | Meaning |
|-------|---------|
| `NOT_APPLICABLE` | Non-SA / NoOp module |
| `BLOCKED_PROFILE` | SA but Tax Profile not READY |
| `PENDING` | Queued after CF |
| `CLASSIFIED` | Classification stored |
| `GENERATED` | Local tax invoice artifact exists |
| `REPORTING` / `CLEARING` | Phase 2 integration (future) |
| `ISSUED` | Buyer-shareable tax document ready per phase rules |
| `FAILED` | Terminal failure needing ops |
| `RETRYABLE` | Transient failure |

Names are **architectural recommendations**, not implemented enums.

---

## 9. Scenario matrix (summary)

| Scenario | Financial | Compliance | Notes |
|----------|-----------|------------|-------|
| Payment succeeds, compliance fails | PAID kept | RETRYABLE | G1 durable queue |
| Browser disconnect after pay | PAID kept | Continue async | |
| CF replayed | No second CF | No second Tax Invoice | Idempotent on CF id |
| Customer changes after sale | Unchanged | Snapshot already frozen | |
| Profile changes after sale | Unchanged | Snapshot frozen | |
| Product changes after sale | Unchanged | Line snapshot frozen | |
| Unknown country | PAID | NOT_APPLICABLE / NoOp | |
| Profile incomplete | PAID | BLOCKED_PROFILE | Do not fake invoice |
| Customer null (نقدًا) | PAID | Default Simplified path | No fake Customer |
| Individual, no tax number | PAID | Still tax invoice (typically Simplified) | INV-2 |
| Business + tax number | PAID | Classifier may choose Standard | Not automatic solely from taxNumber |
| Duplicate event | — | Idempotent | |

---

## 10. Gaps / architectural dependencies (not Financial Core conflicts)

| ID | Gap | Severity | Required future work |
|----|-----|----------|----------------------|
| G1 | Dispatch is best-effort in-process; not a durable compliance outbox | High for production tax | Durable compliance job / outbox keyed by `collectionFactId` |
| G2 | `selectedCustomer` not persisted on Confirm / Order | High for buyer snapshot | Order/Confirm customer link program |
| G3 | No Tax Invoice tables / numbering series | Expected | Domain foundation program |
| G4 | VAT line SSOT vs CF payable freeze | Medium | Decide copy-vs-recompute in VAT program |
| G5 | Refund → credit note wiring | Deferred | Uses `onRefundCommitted` contract |

**CONFLICT FOUND?** None that invalidate CF → Compliance lifecycle. G1 is an **enhancement of the compliance delivery mechanism**, not a requirement to move Tax Invoice before PAID.

---

## 11. Rejected alternatives

| Alternative | Why rejected |
|-------------|--------------|
| Tax Invoice inside Collection Fact | Couples financial authority to ZATCA; violates ADR-039/040 |
| Tax Invoice before payment | Unpaid/cancelled invoices; clearance latency on POS |
| `taxNumber ? B2B : B2C` | Violates INV-1/3; incorrect for named Individuals |
| Non-tax invoice when no buyer VAT | Violates INV-2 / Saudi e-invoicing model for VAT sellers |
| Saudi branches in Customer / PaymentConfirm / Cashier CF commit | Multi-country leakage |
| Reuse Cashier invoice number as Tax Invoice Number | Different legal/operational documents (ADR-027 planes) |
| Fake Customer نقدًا | Violates Customer Foundation |

---

## 12. Official sources used

| Source | Certainty use |
|--------|----------------|
| ZATCA Detailed Guidelines PDF (zatca.gov.sa) | OFFICIAL / VERIFIED for Standard vs Simplified definitions, SAR 1,000 B2B simplified option, Phase 2 clearance vs 24h reporting |
| ADR-ARCH-039 / 040 / 027; repo code | ARCHITECTURAL (MineuQR) |
| Secondary blogs | **Not** used as requirements |

---

## 13. Proposed future migrations (NOT IMPLEMENTED)

- `tax_invoices` (or Saudi-scoped table) — PROPOSED
- `tax_invoice_lines` snapshots — PROPOSED
- `tax_invoice_numbers` / sequence — PROPOSED
- Buyer/seller snapshot columns — PROPOSED
- Compliance job / outbox — PROPOSED

**Do not create 0106 in this program.**

---

## 14. Needs official confirmation / open questions

| ID | Question |
|----|----------|
| OQ-CLASS-1 | Default classification when Customer is Individual with name but null taxNumber — confirm Simplified always, or cashier override? |
| OQ-SELLER-1 | Behavior when SA restaurant has `not_registered` VAT status — still issue tax invoices? (profile READY rules today allow not_registered + legal name) |
| OQ-VAT-1 | Tax Invoice VAT lines: copy CF tax snapshot vs recompute under Saudi rules? |
| OQ-PHASE-1 | Product target: Phase 1 generation only first, or Phase 2-ready schema from day one? |
| OQ-B2G | Whether B2G is in first Tax Invoice MVP |
| OQ-EDU-HEALTH | Special Simplified cases requiring buyer details (private education/health to citizens) — out of MVP? |

---

## 15. Implementation sequencing

1. This evaluation + ADR-041 (**done in this program**)
2. Persist customer on sale (G2)
3. Tax Invoice domain foundation (tables, classification, snapshots, states) — no ZATCA API
4. Harden compliance dispatch durability (G1)
5. Phase 1 generation (Simplified-first recommended)
6. Phase 2 Fatoora clearance/reporting
7. Credit/Debit Notes
8. UAE module (separate)

---

## 16. Scope certification

- NO TAX INVOICE IMPLEMENTATION WAS PERFORMED.
- NO MIGRATION WAS CREATED.
- NO CUSTOMER SCHEMA WAS CHANGED.
- NO ZATCA / IRN / QR / VAT ENGINE WAS IMPLEMENTED.
