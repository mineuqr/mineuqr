# ADR-ARCH-039: Payment Collection Financial Authority

> [← ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [← ADR-ARCH-021](./ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md) · [← ADR-ARCH-022](./ADR-ARCH-022-order-settlement-platform.md) · [← ADR-ARCH-023](./ADR-ARCH-023-financial-core-capabilities.md) · [← ADR-ARCH-024](./ADR-ARCH-024-split-payment-platform.md) · [← ADR-ARCH-026](./ADR-ARCH-026-settlement-record-platform.md) · [← ADR-ARCH-032](./ADR-ARCH-032-refund-platform.md) · [← ADR-ARCH-037](./ADR-ARCH-037-payment-process-domain.md) · [← ADR-ARCH-038](./ADR-ARCH-038-cashier-direct-financial-commit.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | **Accepted (governance)** |
| **Owner** | Architecture Authority |
| **Program** | FINANCIAL-AUTHORITY-SUPERSESSION-ADR-1 |
| **Date** | 2026-08-20 |
| **Revision** | **1.0** |
| **Source investigation** | [FINANCIAL-AUTHORITY-RESET-ARCHITECTURE-1](../../engineering/programs/FINANCIAL-AUTHORITY-RESET-ARCHITECTURE-1/ARCHITECTURE-DECISION-REPORT.md) — APPROVED WITH CONDITIONS |
| **Supersedes (target end-state, adopted channels)** | I-FIN-01 and I-FIN-02 as **sole** monetary/Revenue rules; Check as PAID/refund mutation root; I-OS-07 same-TX coupling; SR-INV-03 “Check remains Financial Authority”; SR-INV-04 “same TX as Check finalize” **when** Revenue reads Collection Facts; I-PAY-03/15 as ban on a collection aggregate; I-PAY-22/23/24 as requiring OS/SR inside Cashier Confirm; ADR-037 clause “Check is the sole monetary aggregate”; ADR-038 §7 completion set |
| **Does not supersede** | Order core (001); UI not authority (002/006); I-PAY-05/08/12/19; I-FIN-09/12; SR-INV-01 (copy, never calculate); ADR-021; compensating-refund **mechanism** (032); CRMP custody (028/030/033); Commercial 034–036; R9 (Revenue ≠ tender sum) |
| **Does not modify** | Application code, schema, APIs, Payment/Check/Settlement/Reporting/Cashier runtime |
| **Implementation status** | **Governance only.** This ADR authorizes **no** production code, schema, migration, or runtime change. Until an adoption program is **certified**, **all channels including `cashier_pos` remain on the legacy Check-centered completion path (ADR-038 §7).** |
| **Numbering note** | Next constitutional FSP ADR after ADR-ARCH-038. **Must not reuse 015 / 023 / 029 / 034.** Next free number after this ADR is **040**. |

---

## 1. Context

MineuQR’s Financial Settlement Platform (ADR-020) made **Check** the sole monetary aggregate so sessionless channels could collect Revenue without fake Sessions. Payment (ADR-037) is the **process** that finalizes that obligation. Settlement Record (ADR-026) is immutable **publication**, not authority. Cashier Confirm (ADR-038) removed OPEN Check as a **readiness** gate but kept Check+Charges+ST+OS+SR as the **completion** set.

FINANCIAL-AUTHORITY-RESET-ARCHITECTURE-1 approved, with conditions, a long-term reset:

- Collection and Settlement are different responsibilities.
- An insert-only **Collection Fact** is canonical financial truth for **adopted** channels.
- Check remains the operational/commercial **bill**.
- PAID means durable collection commit, not OS/SR/reporting/print completion.
- `cashier_pos` is the first intended adopter; other channels stay on Check until their own programs.
- One transaction MUST have exactly one financial authority (no dual-write).

This ADR **establishes that governance**. It does **not** implement it.

---

## 2. Problem

Check is both:

1. the **open operational bill** (mutable while OPEN, I-FIN-04), and  
2. the **monetary / PAID / Revenue / refund root** (I-FIN-01/02, ADR-032).

That conflation:

- Forces Cashier Confirm to wait on OS/SR publication (038 §7 / I-OS-07 / SR-INV-04).
- Leaves ADR-024 “Payment Success ≠ Financial Settlement” without a collection identity.
- Makes ADR-025 “one Payment → many Checks” Check-owned conservation instead of a collection identity that survives Check split/merge.

ADR-037 correctly forbade a **second** grandTotal beside Check. The reset is not a second root beside Check for the **same** collection. It is a **replacement root for adopted collections**, with Check remaining the bill.

---

## 3. Decision

**For channels that Architecture Authority has certified as Collection-Authority-adopted, the platform SHALL treat an insert-only Collection Fact as the monetary authority and Revenue source. Check SHALL remain the operational/commercial bill. Payment SHALL remain the process/command that commits the Collection Fact. Settlement SHALL consume the Collection Fact and MUST NOT invalidate PAID.**

Until a channel is certified adopted, **legacy law remains in force for that channel** (Check freeze + ST + OS + SR in the financial TX; I-FIN-01/02).

### 3.1 Owner classes (mandatory — do not collapse)

| Class | Owner |
|---|---|
| **Process / command** | Payment (`confirmPayment` and successors) |
| **Collection aggregate (adopted)** | Collection Fact (insert-only) |
| **Operational bill aggregate** | Check |
| **Commercial sale** | Order |
| **Publication document** | Settlement Record (copy; never calculates) |
| **Tender components (canonical)** | Committed **with** the Collection Fact |
| **Order financial state** | Order Settlement (downstream of collection) |
| **Custody** | CRMP (028/030/033) — not money |

Payment **owns the command**. The Collection Fact **is** the persisted collection aggregate. A third “generic financial record” entity is **not** required.

### 3.2 Constitutional rules

1. **I-COL-01** — One successful payment intent produces at most one Collection Fact (partial payments = distinct intents).  
2. **I-COL-02** — A committed Collection Fact is immutable. Corrections are compensating facts only.  
3. **I-COL-03** — PAID (adopted) means the Collection Fact COMMIT succeeded. Owner: Collection Fact committed state.  
4. **I-COL-04** — Settlement MUST NOT invalidate PAID.  
5. **I-COL-05** — Settlement (OS, SR publication, reporting projections) is downstream of PAID on adopted channels **only after** Revenue reads Collection Facts (I-REV-U-01). Until then, legacy same-TX publication remains.  
6. **I-COL-06** — Collection Commit MUST include server-frozen payable (tax/discount snapshots + composition from persisted Order lines) and tender components that reconcile to that amount. Browser totals are not authority (I-PAY-05 retained).  
7. **I-COL-07** — Background / async **collection** commit is forbidden.  
8. **I-COL-08** — Financial facts are tenant-scoped (`restaurantId`) and auditable.  
9. **I-COL-09** — Historical collection truth MUST NOT require reading mutable OPEN Check state.  
10. **I-COL-10** — Operational Check MUST NOT rewrite a committed Collection Fact.  
11. **I-REV-U-01** — One transaction contributes to Revenue through **exactly one** authority. Dual-write of paid Check **and** Collection Fact for the same collection is forbidden.  
12. **I-REV-U-02** — During migration, Revenue is the **union** of (a) Collection Facts on adopted channels and (b) paid Checks whose collection is **not** adopted — partitioned by canonical collection identity (see §7).  
13. **I-REF-C-01** — Refunds/voids/reversals/corrections on adopted collections are compensating facts referencing `priorCollectionFactId`. The original fact is not UPDATEd.  
14. **I-SET-01** — Settlement is idempotent on collection identity; failure is retryable (`pending` / `failed` / `retryable` / `reconciled`).  
15. **I-SET-02** — Settlement Record remains not an Aggregate Root and MUST NOT calculate money (SR-INV-01 retained). Producer on adopted channels becomes the Collection Fact (copy).  
16. **I-PAY-19 retained** — `cashier_pos` Confirm MUST NOT require an OPEN Check as readiness.

---

## 4. Collection Fact contract (governance)

Minimum immutable fields (logical; persistence is an implementation program):

| Concern | Required |
|---|---|
| Identity | `collectionFactId` (stable) |
| Tenant | `restaurantId` |
| Sale | `orderId` (and intent id if partial payments exist) |
| Channel | `orderingChannel` |
| Amount / currency | server-frozen `amount`, `currencyCode` |
| Tax / discount | snapshots frozen at commit |
| Composition reference | charge snapshots or line hash sufficient to reproduce freeze |
| Tenders | insert-only components summing to `amount` |
| Actor / terminal | cashier/staff id; terminal id where applicable |
| Business day | frozen at commit (existing Reporting day rules) |
| Time | `committedAt` |
| Idempotency | key + fingerprint |
| Kind | `collection` (compensating kinds: `refund`, `void`, `reversal`, `correction`, `complimentary` as product requires) |

No UPDATE of money, currency, tenders, actor, timestamp, or sale identity after commit.

---

## 5. PAID

**Adopted:** PAID = Collection Fact committed.  
**Not PAID:** OS written, SR written, reporting, print, realtime, integrations.  
**Legacy (not adopted):** PAID remains `operational_checks.outcome = paid` after ADR-038 §7.

---

## 6. Check

**IS:** operational bill; commercial grouping; guest-facing bill; split/merge context; OPEN running total for visit channels; optional later link from bill to collection facts.

**IS NOT (adopted collections):** canonical payment history; Revenue authority; refund mutation root; PAID definition; immutable financial authority.

Check is **not deleted**. Session/Kiosk/Waiter/QR remain Check-centered until their migration ADRs.

Cashier left-side “check/bill” UI remains **presentation / operational bill preview**. It is **not** Collection Fact authority (ADR-038 / I-PAY-05).

---

## 7. Revenue Union

```
Revenue =
  Σ Collection Facts (kinds that count, adopted identity set)
  + Σ paid Check grandTotal (legacy identity set)
```

**Dedup identity (canonical):** `restaurantId` + `orderingChannel` + `orderId` for Cashier 1:1 collection; later partials use `paymentIntentId`. An identity is in **exactly one** set.

Refunds: adopted → compensating facts; legacy → compensating SR / Check refund law (032) until that channel adopts.

Complimentary/void: fact `kind` or legacy Check outcome — never both for one identity.

Business day: frozen on the contributing record; do not re-derive from live Check.

Reconciliation: union total vs source sets; repair **downstream** only.

**Reporting code is not changed by this ADR.**

---

## 8. Settlement / ST / OS / SR

```
Collection Fact (committed)
  → Settlement (idempotent)
      → ST  = tender settlement projection OR the same components already committed (MUST NOT be a second tender SSOT)
      → OS  = per-Order settlement state (not PAID)
      → SR  = publication copy of the fact freeze
```

If ST **is** the tender store, those rows are written **in Collection Commit** (I-COL-06). If ST is a projection, tenders on the fact are canonical.

OS failure ≠ payment failure (I-COL-04).

SR-INV-04 is **partially superseded** on adopted channels **once I-REV-U-01 is implemented** (Revenue on facts). Until then, SR remains in the financial TX (legacy).

---

## 9. Refund

ADR-032 compensating **mechanism** retained. **Origin** on adopted channels: Collection Fact, not Check. `refundableBalance` from fact history (+ publication copies). No UPDATE of the original collection.

---

## 10. Idempotency and concurrency

ADR-021 retained. Collection uniqueness: one committed collection per intent. Double-click, HTTP retry, lost response, concurrent Confirm → one fact. Settlement retry MUST NOT create a second collection. Refund retry → one compensating fact.

Concurrency: unique constraint on intent; CAS/lock on sale/intent; stale sale via fingerprint (lines + discount).

---

## 11. Channel scope and migration

| Phase | Governance | Runtime (this ADR) |
|---|---|---|
| Now | This ADR accepted | **Unchanged** — all channels Check completion |
| After ledger + Revenue union + Cashier adoption certified | `cashier_pos` adopted | Cashier writes Collection Facts only |
| Later | Per-channel programs | Table / waiter / kiosk / QR |

Temporary two **paths** are allowed. Permanent two authorities for **one collection** are forbidden. Retirement of Check-as-Revenue is required before calling migration complete.

---

## 12. Alternatives

| Alternative | Verdict |
|---|---|
| Keep Check as permanent monetary AR | Rejected as end-state (reset investigation) |
| Payment process with no Collection Fact | Rejected as end-state |
| SR as authority | Rejected (SR-INV-01) |
| Cashier-only second universe | Rejected (dual Revenue) |
| Dual-write Check PAID + Fact | Rejected (I-REV-U-01) |
| Async collection commit | Rejected (I-COL-07) |
| Eight separate ADRs for each concept | Rejected — one constitutional ADR; implementation ADRs later |
| Implement runtime in this ADR | Rejected |

---

## 13. Consequences

**Positive:** Collection vs bill vs publication named; Cashier-first legally possible; 024/025 gain a collection identity; Confirm boundary can shrink **after** Revenue reads facts.

**Cost:** Supersession of I-FIN-01/02 on adopted channels; Revenue union complexity; OS/SR decoupling is **conditional**.

**Runtime:** None from this ADR. ADR-038 implementation remains the Cashier path until adoption certification.

---

## 14. Invariants (normative)

I-COL-01…10, I-REV-U-01…02, I-REF-C-01, I-SET-01…02, I-PAY-19 as listed in §3.2.

Legacy I-FIN-01/02, I-OS-07, SR-INV-03/04, 038 §7 remain **binding on non-adopted channels** and on **all channels until first adoption is certified**.

---

## 15. Ownership summary

| Domain | Authority after adoption | Until adoption |
|---|---|---|
| Collection / PAID / Revenue (that txn) | Collection Fact | Paid Check |
| Bill | Check | Check |
| Payment command | Payment process | Payment process |
| ST canonical tenders | Fact components (± ST in same commit) | ST under Check |
| OS | Downstream of fact | Same TX as Check PAID |
| SR | Publication of fact | Publication of Check |
| Refund | Compensating fact | Compensating SR under Check |

---

## 16. Implementation authorization

**None.** Successor programs are listed in FINANCIAL-AUTHORITY-SUPERSESSION-DECISION.md §28. They require Architecture Authority sequencing. This ADR MUST NOT be cited as permission to change Confirm, schema, or Reporting.
