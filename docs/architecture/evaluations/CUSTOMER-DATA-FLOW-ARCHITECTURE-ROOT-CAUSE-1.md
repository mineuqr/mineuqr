# CUSTOMER-DATA-FLOW-ARCHITECTURE-ROOT-CAUSE-1

| Field | Value |
|-------|-------|
| **Program** | CUSTOMER-DATA-FLOW-ARCHITECTURE-ROOT-CAUSE-1 |
| **Type** | Read-only architecture / runtime-path investigation |
| **Date** | 2026-09-06 |
| **Implementation** | **NONE** — no code, migration, or refactor |
| **Related** | CUSTOMER-FOUNDATION-1 · SALE-CUSTOMER-LINK-1 · SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1 · SAUDI-TAX-INVOICE-PHASE-1 · SAUDI-TAX-INVOICE-CASHIER-* · POST-PAYMENT-PERFORMANCE-1 |

---

## Verdict summary

**PASS — current flow matches the intended Global Customer → Sale → PAID → Country Compliance → Buyer Snapshot architecture.**

Customer identity is persisted on `orders.customerId` at Confirm. Saudi Tax Invoice builds an immutable Buyer Snapshot **after PAID** by resolving `orders.customerId → customers` (tenant-scoped). Cashier Tax Invoice View/Print consumes the **persisted Phase 1 document**, not live Customer.

Customer-related work is **not** the proven cause of the historical ~4–5s post-payment delay (see §9 and prior PERFORMANCE-FINDINGS).

---

## 1. Current architecture diagram

```
Cashier UI
  selectedCustomer { id, displayName } | null   ← local / draft snapshot
        │
        │ Confirm: settlement.initiate({ customerId: id | null })
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Sale persistence (GLOBAL)                                   │
│  • New prepared invoice: finalizeCashierPreparedInvoice     │
│      resolveOptionalSaleCustomerId → placeOrder.customerId  │
│  • Existing order: setOrderSaleCustomerId before settlePaid │
│  → orders.customerId (nullable, tenant-scoped)              │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Financial Core                                              │
│  Collection Fact commit = PAID                              │
│  CF has NO customerId / buyer fields                        │
│  Customer is NOT financial authority                        │
└─────────────────────────────────────────────────────────────┘
        │
        │ dispatchComplianceAfterProductionCollectionFact
        │ (best-effort / fire-and-forget — not awaited by Cashier)
        ▼
┌─────────────────────────────────────────────────────────────┐
│ ComplianceOrchestrator → resolveComplianceModule(country)   │
│  SA → Saudi module → ensureSaudiTaxInvoiceForCollectionFact │
│  other → NoOp (today)                                       │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Saudi Tax Invoice issuance (COUNTRY-SPECIFIC)               │
│  loadIssuanceContext:                                       │
│    order = getOrderById                                     │
│    if order.customerId → findCustomerById(restaurant, id) │
│    else customer = null                                     │
│    buildBuyerSnapshot(customer) → buyerSnapshotJson         │
│    classifySaudiTaxInvoiceFoundation(...)                   │
│    Phase 1 document + QR from snapshots                     │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
Cashier getPhase1ByOrder → phase1Document.buyer
  (mapSaudiPhase1DocumentToCashierView — no Customer API)
```

**Intended vs observed:** Matches intended path. Does **not** recreate Customer after PAID, does **not** invent a Customer for نقدًا, does **not** re-read Cashier state for invoice buyer fields.

---

## 2. Cashier customer-selection path

| Step | Evidence | Classification |
|------|----------|----------------|
| Selection / create / clear | `CashierCustomerBar` → `trpc.customer.searchForPos` / `createForPos`; `onSelect` / `onClear` | A. Correct |
| Pre-Confirm state | `selectedCustomer: { id, displayName } \| null` in `CashierWorkspacePanel`; persisted in `cashierDirectSaleStorage.selectedCustomer` | A. Correct |
| Confirm payload | `settleMutation.mutateAsync({ …, customerId: selectedCustomer?.id ?? null })` | A. Correct |
| Post-Confirm Customer create | None observed | A. Correct |
| Tax Invoice UI Customer fetch | None — `getPhase1ByOrder` + document mapper only | A. Correct |
| Display fallback | `cashierCustomerDisplayLabel(null)` → `العميل: نقدًا` (presentation only) | A. Correct |

**Finding:** Cashier holds a thin UI selection (`id` + `displayName`). Full Customer fields (type, taxNumber, etc.) are **not** required in Cashier state for Confirm; they are loaded server-side at Tax Invoice issuance from the Sale link.

---

## 3. Sale persistence path

| Path | Mechanism | Evidence |
|------|-----------|----------|
| New Cashier prepared invoice | `resolveOptionalSaleCustomerId` then `placeOrder.execute({ customerId })` | `finalizeCashierPreparedInvoice.ts` |
| Existing / inbound order | `setOrderSaleCustomerId` **before** `settlePaid` | `PosSettlementInitiateService.ts` ~1019–1041 |
| Schema | `orders.customerId` nullable; index `orders_restaurant_customer_id`; comment: identity only, not invoice type | `drizzle/schema.ts` |
| Tenant isolation | `findCustomerById(restaurantId, customerId)`; missing/cross-tenant → NOT_FOUND / BAD_REQUEST | `saleCustomerLink.ts` |
| Order aggregate | `Order.customerId` persisted via Drizzle repository / mapper | `server/order/**` |

**Answers:**

- `customerId` is nullable — **yes**.
- NULL remains valid anonymous Sale — **yes**.
- نقدًا is display-only — **yes** (`shared/customer/customerContract.ts`).
- No fake Customer row for نقدًا — **yes** (anonymous_cash snapshot has `customerId: null`).

**Classification:** A. Correct / expected.

---

## 4. Payment / Collection Fact / PAID boundary

| Check | Result | Classification |
|-------|--------|----------------|
| CF stores customerId / buyer | **No** — Collection Fact module has no customer fields | A. Correct |
| CF / PAID creates Customer | **No** | A. Correct |
| CF / PAID mutates Customer | **No** | A. Correct |
| Customer attachment timing | Before financial commit (finalize path / setOrderSaleCustomerId) | A. Correct |
| Compliance dispatch | After CF commit; best-effort; does not alter paid HTTP result | A. Correct |

**Principle verified:** Customer is a Sale reference/input, not financial authority.

---

## 5. Saudi Tax Invoice customer-data path

### 5.1 How buyer fields are obtained

| Field | Source at issuance | Classification |
|-------|-------------------|----------------|
| buyer name / type / taxNumber / phone / email / address | `orders.customerId` → `findCustomerById` → `buildBuyerSnapshot` | A. Correct (legitimate snapshot read) |
| anonymous buyer | `order.customerId == null` → `kind: "anonymous_cash"` | A. Correct |
| Cashier UI state | **Not** used for Tax Invoice buyer | A. Correct |
| Alternate Customer create/find after PAID | **Not** present | A. Correct |

**Exact source (answers program §6):** **Option A** — `orders.customerId` → `customers`, then persisted as Buyer Snapshot. Not B/C/E as primary identity; B applies only **after** issuance for View/Print.

Code: `saudiTaxInvoiceService.ts` `loadIssuanceContext` (lines ~83–96); `saudiTaxInvoiceSnapshotBuilder.ts` `buildBuyerSnapshot`.

### 5.2 When Buyer Snapshot is created

| Timing | Result |
|--------|--------|
| Before PAID | **No** |
| During PaymentConfirm / CF write | **No** |
| After PAID | **Yes** — in `ensureSaudiTaxInvoiceForCollectionFact` on compliance dispatch |
| During Phase 1 generation | Snapshots already on Tax Invoice row; Phase 1 document copies `buyerSnapshot` |

**Classification:** A. Correct — immutable historical snapshot at Compliance issuance after financial completion.

### 5.3 Cashier View / Print after generation

`mapSaudiPhase1DocumentToCashierView` reads `document.buyer` / `buyerVatNumberDisplayed` from Phase 1 document. Anonymous → display **نقدًا**. No `trpc.customer.*` on Tax Invoice dialog.

**Classification:** A. Correct.

### 5.4 Immutability after issuance

- Status `generated` → `isSaudiTaxInvoiceSnapshotImmutable` → ensure **replays** existing row without rewriting snapshots.
- Later Customer edits do not update `buyerSnapshotJson` / Phase 1 document for that invoice.

**Classification:** A. Correct.

**Nuance (duplicate work, not identity recreation):** `ensureSaudiTaxInvoiceForCollectionFact` always calls `loadIssuanceContext` (including Customer read) **before** checking immutable replay, then discards `ctx` when replaying. See §8.

---

## 6. Anonymous cash path

```
Cashier: selectedCustomer = null → UI "العميل: نقدًا"
  → settlement customerId: null
  → orders.customerId = NULL
  → Tax Invoice buyerSnapshot.kind = "anonymous_cash"
  → Classification: Simplified / B2C (platform invariant)
  → Still a Saudi tax invoice (not "non-tax")
```

No Customer row named نقدًا. No SA-invented tax-number requirement solely because country = SA (seller VAT readiness is separate Phase 1 seller rule).

**Classification:** A. Correct.

---

## 7. Invoice type vs Customer

Forbidden sole rule `taxNumber ? B2B : B2C` is **explicitly rejected** in `saudiTaxInvoiceClassification.ts`.

| Input | Form | Notes |
|-------|------|-------|
| absent buyer | Simplified / B2C | Invariant |
| business + taxNumber | Standard / B2B | Platform invariant |
| other named buyers | Simplified / B2C | Still tax invoice; OQ-CLASS-1 open |

Customer supplies buyer **data**; Compliance owns **classification**.

**Classification:** A. Correct (with open OQ-CLASS-1 as known deferred confirmation — F. Out of scope for this investigation).

---

## 8. Duplicate reads / work discovered

| Pattern | Where | Used for identity? | Classification |
|---------|-------|--------------------|----------------|
| Cashier holds `displayName` + server later loads full Customer | Cashier vs `loadIssuanceContext` | No conflict — UI label vs issuance snapshot | A. Correct |
| `resolveOptionalSaleCustomerId` then later `findCustomerById` at Tax Invoice | Confirm validation vs issuance | Two reads of same id across stages | D. Duplicate/unnecessary work (acceptable; not wrong) |
| `loadIssuanceContext` on immutable ensure replay | `ensureSaudiTaxInvoiceForCollectionFact` | Snapshot discarded; Customer read wasted | D. Duplicate/unnecessary work |
| Cashier polls `getPhase1ByOrder` | Post-pay readiness | Does **not** re-query Customer | A. Correct |
| Cashier re-fetch Customer for Tax Invoice | — | **Not observed** | A. Correct |

**None of these recreate Customer identity after PAID.**

---

## 9. Performance timings

### 9.1 Prior measured baseline (operator / PERFORMANCE-FINDINGS)

| Segment | Approx | Customer-related? |
|---------|--------|-------------------|
| Confirm → PAID | ~2–3 s | Customer resolve is one validation read — not primary |
| PAID → Tax Invoice usable | +~4–5 s | Dominated by async Compliance + poll + (historical) HTML/QR PNG on read |
| Total | ~8–9 s | |

Primary delay cause (proven in SAUDI-TAX-INVOICE-CASHIER-POST-PAYMENT-PERFORMANCE-1): **not** Customer — fire-and-forget compliance + Cashier readiness poll; HTML QR PNG on every Phase 1 read (since mitigated with `includeHtml: false`).

### 9.2 Customer-related cost estimate (code-level; no new live instrumentation in this program)

At Tax Invoice issuance, Customer path is approximately:

1. `getOrderById`
2. optional `findCustomerById` (single PK + restaurant scope)
3. in-memory `buildBuyerSnapshot` + classification

**Classification:**

| Finding | Class |
|---------|-------|
| Customer lookup is a normal issuance DB read | A. Correct |
| Customer lookup is **unlikely** to explain multi-second post-pay delay | B. Performance issue — **not attributed to Customer** (observability: E for lack of dedicated Customer timing marks) |
| Material contribution of Customer to 4–5s delay | **No evidence** — prior diagnosis contradicts |

---

## 10. Cross-country reuse assessment

| Layer | Country-agnostic? | Evidence |
|-------|-------------------|----------|
| Customer Core / schema / POS search-create | Yes | No `countryCode === "SA"` in Customer Core |
| `orders.customerId` Sale link | Yes | SALE-CUSTOMER-LINK-1 |
| Collection Fact / PAID | Yes | No buyer fields |
| Compliance module registry | Yes | `resolveComplianceModule(countryCode)` |
| Buyer snapshot + Saudi classification + Phase 1 | SA-only | `loadIssuanceContext` throws if `countryCode !== "SA"` |

**Future AE/QA:** Can consume the same `Sale.customerId → Customer` relationship inside their modules without recreating Cashier Customer selection or Sale persistence.

**Architectural coupling that would force country-specific Customer handling:** **Not found** in Global Customer/Sale Core.

**Classification:** A. Correct for Global path; country rules correctly scoped to Compliance modules.

---

## 11. Architectural violations

| Potential violation | Present? |
|---------------------|----------|
| Customer Core owns Saudi invoice rules | **No** |
| Collection Fact owns Customer | **No** |
| Tax Invoice invents Customer after PAID | **No** |
| taxNumber-alone B2B/B2C | **No** (forbidden) |
| Cashier reconstructs invoice buyer from live Customer | **No** |
| Saudi branching in Global Customer Core | **No** |

**No architectural violation of the intended Global Customer → Sale → Compliance snapshot model.**

Minor inefficiency (immutable ensure still loads context): **D**, not C.

---

## 12. Recommended minimum correction (proposal only — DO NOT IMPLEMENT HERE)

| Item | Recommendation | Boundary |
|------|----------------|----------|
| Skip `loadIssuanceContext` when existing Tax Invoice is snapshot-immutable | Optional micro-optimization on ensure replay | Saudi Tax Invoice service only |
| Dedicated timing marks for Customer read vs Phase 1 QR vs persist | Observability improvement | Compliance / ops telemetry |
| Customer flow itself | **No correction required** for correctness | — |

Any change requires a **separate** approved implementation program.

---

## 13. Required architectural verdict (Q1–Q8)

| # | Question | Answer |
|---|----------|--------|
| **Q1** | Does Cashier already persist the selected Customer on Sale? | **Yes.** Confirm sends `customerId`; new sales via `finalizeCashierPreparedInvoice` / placeOrder; existing orders via `setOrderSaleCustomerId` → `orders.customerId`. |
| **Q2** | Does Tax Invoice consume that persisted relationship? | **Yes.** `loadIssuanceContext` uses `order.customerId` → `findCustomerById` → Buyer Snapshot. View/Print use persisted Phase 1 document. |
| **Q3** | Is Customer being unnecessarily recreated after PAID? | **No.** No post-PAID Customer create/find-or-create. Only a read for snapshot (or discarded on immutable replay). |
| **Q4** | Is Customer data fetched more than once? | **Sometimes:** validate at Confirm + load at Tax Invoice issuance; optional wasted load on immutable ensure replay. Not a Cashier↔Tax Invoice double UI fetch. |
| **Q5** | Reusable for SA, AE, QA, future? | **Yes** for Global Customer → Sale → PAID → Compliance input. Country modules own invoice rules. |
| **Q6** | Saudi-specific logic in Global Customer/Sale Core? | **No.** Saudi buyer snapshot/classification lives under `server/compliance/saudi-tax-invoice` / shared Saudi contracts. |
| **Q7** | Does Customer processing materially cause the ~4–5s delay? | **No proven material contribution.** Prior performance program attributes delay to Compliance readiness / poll / (historical) HTML QR render. |
| **Q8** | Minimum architectural correction? | **None for correctness.** Optional: skip issuance context load on immutable ensure replay; optional Customer timing marks. |

---

## 14. Findings classified (summary)

| ID | Finding | Class |
|----|---------|-------|
| F1 | Cashier → `orders.customerId` on Confirm | A |
| F2 | CF/PAID do not own Customer | A |
| F3 | Buyer Snapshot after PAID from Sale→Customer | A |
| F4 | Cashier TI View uses document snapshot only | A |
| F5 | Anonymous NULL → anonymous_cash / نقدًا display | A |
| F6 | Classification not taxNumber-alone | A |
| F7 | Confirm + issuance Customer reads | D |
| F8 | Immutable ensure still calls `loadIssuanceContext` | D |
| F9 | Post-pay delay not Customer-driven | B (elsewhere) / E (no Customer-specific marks) |
| F10 | OQ-CLASS-1 open | F |
| F11 | Cross-country Global path reusable | A |

---

## 15. Safety / stop condition

- **No code changed** in this program.
- **No migration.**
- Defects requiring redesign of Customer identity: **none found**.
- Implementation of optional D/E optimizations: deferred to a future program if approved.

**FINAL SUCCESS CONDITION MET:** Proven end-to-end answer to where customer data comes from at every stage from Cashier selection through Sale, PAID, Compliance, and Tax Invoice.
