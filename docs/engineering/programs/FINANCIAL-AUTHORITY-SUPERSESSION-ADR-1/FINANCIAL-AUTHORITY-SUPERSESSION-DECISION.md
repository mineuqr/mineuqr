# FINANCIAL-AUTHORITY-SUPERSESSION-ADR-1

**Financial Authority Supersession Decision**

Governance only. No application code, schema, migration, API, Payment/Check/Settlement/Reporting/Cashier runtime, deploy, or commit of implementation.

| Field | Value |
|---|---|
| **Program** | FINANCIAL-AUTHORITY-SUPERSESSION-ADR-1 |
| **Date** | 2026-08-20 |
| **Constitutional ADR** | [ADR-ARCH-039](../../../architecture/adrs/ADR-ARCH-039-payment-collection-financial-authority.md) |
| **Source** | FINANCIAL-AUTHORITY-RESET-ARCHITECTURE-1 — APPROVED WITH CONDITIONS |
| **Commercial Capability Impact** | **NO** |
| **Runtime change** | **NONE** — all channels remain on legacy Check completion until a **certified** adoption program |

---

## 1. Executive Decision

**APPROVED WITH CONDITIONS.**

ADR-ARCH-039 is the replacement constitution for **adopted** collections:

- Payment = collection **process**  
- Collection Fact = insert-only **financial authority**  
- PAID = Collection Fact **COMMIT**  
- Check = operational / commercial **bill**  
- Settlement = downstream processing of the fact  
- Revenue = **union** during migration; **one authority per transaction**  
- Refund = **compensating** facts  

Existing ADRs are **not** silently rewritten. Conflicting clauses are **partially superseded** by 039 for **certified adopted channels only**. Until first adoption is certified, **I-FIN-01/02 and ADR-038 §7 remain binding for every channel, including `cashier_pos`.**

---

## 2. Source Architecture Decision

FINANCIAL-AUTHORITY-RESET-ARCHITECTURE-1 approved the reset **with conditions**, including: freeze+tenders inside Collection Commit; no dual-write; Revenue union before OS/SR leave Confirm; I-PAY-19 retained; no implementation in the investigation.

This program **encodes** that decision as ADR-039. It does **not** relax those conditions.

---

## 3. Current Governance

| Layer | Law today (runtime + ADR) |
|---|---|
| Monetary AR / Revenue | Check (I-FIN-01/02) |
| Payment | Process only (037); not AR (023 R1, I-PAY-15) |
| PAID | `operational_checks.outcome = paid` after freeze+ST+OS+SR |
| SR | Publication; Check producer; same TX (SR-INV-01/03/04) |
| OS | Check-owned; I-OS-07 same TX as paid Check |
| Refund | Check-owned compensating SR (032) |
| Cashier entry | No OPEN Check beforehand (I-PAY-19) |
| Cashier completion | 038 §7 still Check-owned TX |

---

## 4. Governance Problem

Check is both mutable OPEN bill and monetary root. Confirm therefore waits on settlement publication. Payment Success ≠ Settlement (024) has no collection row. One Payment → many Checks (025) conserves value on Check. 037 forbade a **second** root beside Check for the **same** money; it did not freeze Check as **eternal** end-state if Architecture Authority **replaces** the root **per collection** with one SSOT.

---

## 5. Financial Authority Reset

```
Sale / Order
  → Operational Check / Bill   (not Revenue)
  → Payment (process)
  → Collection Commit (freeze + tenders + insert)
  → Immutable Collection Fact
  → PAID
  → Settlement (OS / SR publication / ST projection)
  → Revenue (union) / Reporting / Operations
```

**Not** live until adoption certification. Governance is live as **target law**.

---

## 6. Payment Authority

Payment = authorized **command** to record collection (`confirmPayment` and successors).

**Not:** UI tender state, Check, Settlement, Reporting.

```
Payment → Collection Commit → Collection Fact
```

Payment **owns the command**. Collection Fact **is** the persisted aggregate. No third entity.

---

## 7. Collection Fact

Insert-only. Contract: ADR-039 §4 (`collectionFactId`, tenant, order/intent, channel, frozen amount/currency, tax/discount snapshots, tenders, actor, terminal, business day, committedAt, idempotency, kind).

Immutable after COMMIT. No UPDATE that turns one monetary event into another.

---

## 8. PAID Semantics

**I-COL-03:** PAID = Collection Fact COMMIT (adopted).

**Does not mean:** ST projection, OS, SR, reporting, print, realtime, integrations.

**Owner:** Collection Fact committed state.

**Until adoption:** PAID remains Check `outcome = paid` after 038 §7.

---

## 9. Check Redefinition

**IS:** operational bill; grouping; guest-facing bill; split/merge; OPEN visit total; optional allocation target.

**IS NOT (adopted):** payment history; Revenue; refund root; PAID; immutable collection authority.

Not deleted. UI “check” ≠ Collection Fact.

---

## 10. Collection vs Settlement

| | Meaning |
|---|---|
| Collection | Durable record that money was collected |
| Settlement | Consequences of that collection |

Collection → PAID is independent of Settlement → ST/OS/SR **after** I-REV-U-01 is implemented. Settlement failure MUST NOT un-PAID (**I-COL-04**).

---

## 11. Settlement Governance

Source: Collection Fact. Trigger: committed fact. Idempotency: `collectionFactId`. Retry: I-SET-01 states. Reconciliation: repair OS/SR only. Settlement is **not** a monetary root (**I-SET-02**).

Until Revenue reads facts, **legacy** keeps OS/SR in the collection TX (condition from reset).

---

## 12. ST Governance

Canonical tenders live **in Collection Commit** (I-COL-06). ST is either those rows or a **projection**. Never a second tender SSOT. Not Revenue (R9).

---

## 13. OS Governance

Downstream per-Order state. Not PAID. Not Bill amount (I-PAY-17 retained). OS failure ≠ payment failure. I-OS-07 **partially superseded** on adopted channels **after** Revenue-on-facts.

---

## 14. SR Governance

Immutable **publication**. Not authority. Not second root. SR-INV-01 **retained**. SR-INV-03 **amended**: authority = Collection Fact (adopted), not Check. SR-INV-04 **partially superseded** when I-COL-05 applies. Producer: fact copy. Runtime unchanged now.

---

## 15. Revenue Union

**I-REV-U-01/02.** Dedup: `restaurantId + orderingChannel + orderId` (Cashier 1:1); later `paymentIntentId`. Never Check PAID + Fact for one identity. Refunds follow the identity’s authority. Not implemented here.

---

## 16. Refund Governance

Compensating events (**I-REF-C-01**). ADR-032 **mechanism retained**; **origin** amended to Collection Fact on adopted channels. No UPDATE of original fact.

---

## 17. Idempotency

**I-COL-01** + ADR-021. One intent → one successful collection. Double-click, retry, lost HTTP, concurrent Confirm: replay. Duplicate settlement: no second fact. Duplicate refund: one compensating fact.

---

## 18. Concurrency

Unique collection per intent; lock/CAS on sale/intent; fingerprint for stale sale; settlement/refund keyed by fact id + generation.

---

## 19. Immutability

After COMMIT: amount, currency, tenders, actor, timestamp, sale identity **cannot** be rewritten. Corrections = compensating facts.

---

## 20. Cashier Governance

First **intended** adopter. Path: Sale → operational bill/UI preview → Payment → Confirm → Collection Commit → Fact → PAID → HTTP → Settlement.

**Not implemented here.** Adoption = `CASHIER-PAYMENT-PATH-ADOPTION-1` after ledger + Revenue union. Until certified, Cashier **runtime** remains 038 §7.

Left-side Check UI = display/operational bill, **not** financial authority.

---

## 21. Legacy Channel Governance

Session, Table, Waiter, Kiosk, QR: **unchanged**. Check-centered until their own migration ADRs. New architecture is **channel-scoped** at adoption time, not globally live.

---

## 22. Migration Governance

| Phase | Content | This program |
|---|---|---|
| 1 | Supersession ADRs | **This** — ADR-039 |
| 2 | Collection Fact implementation | Later |
| 3 | Revenue Union | Later |
| 4 | Settlement decoupling | Later (after 3) |
| 5 | Cashier adoption | Later |
| 6 | Production certification | Later |
| 7+ | Other channels | Later |

Temporary two **paths** allowed iff source of truth, dedup, reconciliation, and **retirement** are explicit (I-REV-U-*). Permanent dual-write forbidden.

---

## 23. ADR Supersession Matrix

| Existing ADR / Invariant | Current rule | Conflict | Decision | Replacement |
|---|---|---|---|---|
| **ADR-020 I-FIN-01** | Check sole monetary AR | Bill = ledger | **PARTIALLY SUPERSEDE** (adopted) | I-COL; Check = bill AR |
| **ADR-020 I-FIN-02** | Revenue = paid Check | Ties Revenue to Check PAID | **PARTIALLY SUPERSEDE** (adopted) | I-REV-U-01/02 |
| **I-FIN-04** | OPEN Check recalculates | — | **RETAIN** | Operational bill |
| **I-FIN-05** | Terminal Check freeze | Freeze object | **PARTIALLY SUPERSEDE** (adopted) | Freeze on Collection Fact; bill freeze optional |
| **I-FIN-07** | Tenders sum to Check total | Check-shaped | **PARTIALLY SUPERSEDE** | I-COL-06 |
| **I-FIN-09** | Tenant on financial rows | — | **RETAIN** | I-COL-08 |
| **I-FIN-12** | Settlement not in Order | — | **RETAIN** | |
| **ADR-021** | Event/business idempotency | — | **RETAIN** | + I-COL-01 |
| **I-OS-07** | Paid Check ⇒ OS same TX | Couples PAID to OS | **PARTIALLY SUPERSEDE** (adopted, after Revenue-on-facts) | I-COL-04/05, I-SET-01 |
| **I-OS-14 / I-PAY-17** | No OS regression; OS ≠ bill amount | — | **RETAIN** | |
| **SR-INV-01** | SR never calculates | — | **RETAIN** | |
| **SR-INV-03** | Check is financial authority | Pointer | **AMEND** (adopted) | Collection Fact is authority; SR not AR |
| **SR-INV-04** | SR same TX as Check finalize | Forces SR on Confirm | **PARTIALLY SUPERSEDE** when I-COL-05 | I-SET-02 |
| **SR-INV-09** | Payment alone never creates SR | Process vs document | **CLARIFY** | Process commits **Fact**; SR still not created from HTTP without a fact |
| **ADR-023 R1** | Payment not AR | Blocks collection aggregate | **PARTIALLY SUPERSEDE** | Payment process + Collection Fact AR; still one SSOT per txn |
| **ADR-024** | Payment success ≠ settlement; Payment not AR | Needs a fact row | **AMEND** | Keep success≠settlement; Fact is collection AR |
| **ADR-025** | Allocation Check-commanded | Conserved value on Check | **AMEND** (future products) | Conserved value on Fact |
| **ADR-026 producer** | Check produces SR | — | **PARTIALLY SUPERSEDE** (adopted) | Fact produces SR copy |
| **ADR-032 origin** | Refund under Check | — | **PARTIALLY SUPERSEDE** (adopted) | I-REF-C-01; mechanism **RETAIN** |
| **ADR-028/030/033** | Custody; Check money | Money pointer | **CLARIFY** | Custody unchanged; money = Fact when adopted |
| **I-PAY-01/05/08/12** | Process, preview, Order≠bill, Confirm | — | **RETAIN** | |
| **I-PAY-03/15** | No competing SSOT / no payments table | Blocks Fact persistence | **PARTIALLY SUPERSEDE** | One SSOT = Fact; still no **second** amount |
| **I-PAY-19** | Cashier no OPEN Check before Confirm | — | **RETAIN** | |
| **I-PAY-22/23/24 / 038 §7** | Sync set includes OS/SR; no async money; latency retained | Over-wide sync set | **PARTIALLY SUPERSEDE** after adoption+Revenue-on-facts | I-COL-05/06/07; **no async collection** |
| **ADR-006** | UI presentation | — | **RETAIN** | Cashier bill UI |
| **ADR-001/007** | Order core | — | **UNCHANGED** | |
| **ADR-034–036** | Commercial | — | **UNCHANGED** | Orthogonal to Check Revenue |
| **R9** | Revenue ≠ tender sum | — | **RETAIN** | |

**New ADR required:** **ADR-ARCH-039 only** (minimum set). Separate ADRs for ledger schema, Revenue union implementation, settlement worker, Cashier adoption — **implementation-era**, not this program.

**ADRs not rewritten in body:** 020, 022, 023, 024, 025, 026, 032, 037, 038 receive **explicit “Partially superseded by 039” pointers only**.

---

## 24. New Invariants

Normative text lives in ADR-039 §3.2:

I-COL-01…10, I-REV-U-01…02, I-REF-C-01, I-SET-01…02.

---

## 25. Compatibility Matrix

| Domain | Current authority | New authority (adopted) | Migration state |
|---|---|---|---|
| Order | Operational sale | Unchanged | Unchanged |
| Check | Monetary AR + bill | **Bill only** | Legacy: both; adopted: bill |
| Payment | Process | Process | Unchanged role |
| Collection | Check freeze | Collection Fact | Not implemented |
| PAID | Check outcome | Fact COMMIT | Legacy until adoption |
| ST | Check child | Fact tenders / projection | Legacy until adoption |
| OS | Check, same TX | Downstream of fact | Legacy until Revenue-on-facts |
| SR | Check publication | Fact publication | Legacy until Revenue-on-facts |
| Revenue | Paid Check | Union then facts | Not implemented |
| Refund | Check + compensating SR | Compensating facts | Legacy until adoption |
| Settlement | = Check finalize TX | Downstream of fact | Legacy until Phase 4 |

---

## 26. Rejected Alternatives

Two monetary roots; dual-write; mutable history; PAID before COMMIT; Settlement required for PAID; Settlement reverses PAID; client authority; async Collection Fact; refund by UPDATE; big-bang all channels; eight overlapping concept ADRs; treating 039 as runtime permission.

---

## 27. Implementation Boundary

**Forbidden now:** code, schema, migrations, APIs, Payment/Check/Settlement/Reporting/Cashier changes, deploy.

**039 does not authorize Confirm changes.** Runtime stays 038 §7.

---

## 28. Required Future Programs

Do **not** create these in this program:

1. `PAYMENT-LEDGER-IMPLEMENTATION-1`  
2. `PAYMENT-REVENUE-ADOPTION-1` (union)  
3. `PAYMENT-SETTLEMENT-DECOUPLING-1` (after 2)  
4. `CASHIER-PAYMENT-PATH-ADOPTION-1`  
5. `PAYMENT-REFUND-ADOPTION-1`  
6. Per-channel migration programs  

Sequence: 1 → 2 → 4 (Cashier may adopt after 1–2; decoupling 3 only after 2). Production certification after 4.

---

## 29. Governance Certification

| Gate | Result |
|---|---|
| G1–G2 ADRs/invariants mapped | **Pass** (§23) |
| G3 replacement invariants | **Pass** (I-COL / I-REV-U / I-REF-C / I-SET) |
| G4–G8 Payment, Fact, PAID, Check, Settlement | **Pass** |
| G9–G11 ST / OS / SR | **Pass** |
| G12 Revenue Union | **Pass** (governance; not implemented) |
| G13–G16 Refund, idempotency, concurrency, immutability | **Pass** |
| G17–G20 coexistence, no dual authority/Revenue, Cashier-first | **Pass** (partition + I-REV-U; adoption not automatic) |
| G21 implementation separated | **Pass** |
| G22 no code/schema/runtime | **Pass** |

---

## 30. Final Decision

**APPROVED WITH CONDITIONS**

### Conditions

1. **No runtime** until sequenced implementation + adoption certification.  
2. **I-COL-06:** freeze + tenders in Collection Commit.  
3. **I-COL-05:** OS/SR leave Confirm only after Revenue reads facts.  
4. **I-REV-U-01/16:** no dual-write; one authority per transaction.  
5. **I-COL-07:** no async collection commit.  
6. **I-PAY-19** retained.  
7. Legacy channels untouched.  
8. Check not deleted.  
9. ADR-038 §7 remains **runtime law** until Cashier adoption is certified.  
10. This program does not create implementation programs.

### Final governed target (after adoption)

CHECK = operational/commercial bill  
PAYMENT = collection process  
COLLECTION FACT = immutable financial authority  
PAID = committed collection  
SETTLEMENT = downstream  
REVENUE = canonical reporting outcome (union then facts)  
REFUND = compensating event  

---

ARCHITECTURE DECISION:
APPROVED WITH CONDITIONS

GOVERNANCE ADR:
ADR-ARCH-039

RUNTIME:
Unchanged (ADR-038 §7 for Cashier; Check-centered for all channels)

IMPLEMENTATION AUTHORIZED:
NO
