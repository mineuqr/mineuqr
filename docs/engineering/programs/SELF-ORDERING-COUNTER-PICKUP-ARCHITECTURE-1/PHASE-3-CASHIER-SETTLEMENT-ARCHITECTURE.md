# SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 — Phase 3

# Cashier Settlement Architecture / Design

| Field | Value |
|---|---|
| **Program** | SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 |
| **Phase** | Phase 3 — Cashier Settlement Architecture / Design |
| **Date** | 2026-07-25 |
| **Mode** | Architecture & Domain Design only |
| **Implementation** | **Not authorized** |
| **Migration / UI / Production** | **Not authorized** |
| **Prerequisites** | Phase 1 Architecture Audit — CERTIFIED · Phase 2 Self Ordering UI Adoption — CERTIFIED |
| **Constitution** | ADR-ARCH-019 · 018 · **020** · **022** · **026** · **028** · **030** · **031** · REGISTER-OPERATIONS-FINAL-CERTIFICATION-1 |
| **Verdict** | **PHASE 3 CASHIER SETTLEMENT ARCHITECTURE CERTIFIED** |

### Roadmap note

Phase 2 deferred “Phase 3 — Runtime validation.” This program **resequences** Phase 3 to **Cashier Settlement Architecture** by explicit authorization. Former runtime validation becomes a later operational gate (recommended as Phase 3b / pre–Phase 4). Phase 4 remains **Cashier Cancel + Settle adoption** (IMPACT-1).

---

## 1. Executive Summary

Counter Pickup is an **Order channel / Self Ordering UX** where:

1. The customer **places** at a kiosk (or equivalent Ordering Client).  
2. **Kitchen starts immediately** on `OrderCreated`.  
3. The customer **pays a human cashier** at a Register under an open Financial Shift.  
4. **Check** remains the sole monetary Aggregate Root; **Settlement Record** remains the immutable financial fact; **Register / Financial Shift** provide operational cash accountability via **Settlement Attribution**.

There is **no Dining Session**, **no Table**, **no Waiter** for this channel’s financial path. There is **no new payment platform**.

**Canonical settlement timing for Counter Pickup: Option B — Kitchen first, payment at cashier later** (already adopted in Phase 2 UI). Option A (pay before kitchen) is **rejected** for this channel. Option C (configurable) is reserved for **future multi-channel policy**, not for forking Counter Pickup ownership.

---

## 2. Counter Pickup Business Workflow

### 2.1 Happy path (customer + cashier)

```
Customer arrives (no table / no session)
        │
        ▼
Browse / Cart / Modifiers / Notes / Discounts (Ordering Client)
        │  tax preview may exist; tax freeze remains Check authority
        ▼
Place Order ──► order.placeWithIdentity
        │         + ensureCheckForOrder  → unpaid Check (sessionId = null)
        │         + OrderCreated         → Kitchen / Print / KDS / Expo
        ▼
Confirmation (operational only)
  • pickup / displayReference
  • “proceed to cashier”
  • NO payment success / NO financial receipt
        │
        ▼
Customer waits / monitors queue (optional queue display — future)
        │
        ▼
Cashier (Register Ops + Settlement Station role of Register)
  • Selects / is bound to Register with open Duty + open Financial Shift
  • Locates Order / Check by pickup number / displayReference / search
  • Reviews Check lines / totals (Check is money SSOT)
  • Accepts tender(s): cash / card / split / partial (Check policies)
  • Staff settle façade → Check finalize → Settlement Record(s)
  • Settlement Attribution → active Register + Financial Shift + cashier User
  • Prints Settlement Receipt (SR-backed) — not kiosk confirmation
        │
        ▼
Kitchen continues / completes fulfilment independently of pay timing*
        │
        ▼
Pickup counter presents order → customer collects
        │
        ▼
Operational completion (Present / Served — Phase 5; not money)
```

\*Under Option B, kitchen may finish before or after pay; money state and fulfilment state are **orthogonal**.

### 2.2 Line / commercial operations (ownership)

| Step | Owner | Notes |
|------|-------|-------|
| Items, modifiers, notes | **Order** | Place / amend per Order rules |
| Discounts (order-time) | **Order** line/commercial rules | Never invent Check totals outside Check freeze |
| Tax | **Check** at freeze / settle | Previews may exist; freeze is Check |
| Payment / tender | **Check** | Cashier-operated |
| Receipt (financial) | **Settlement Record** presentation | After finalize |
| Kitchen ticket | **Kitchen / Fulfilment** from Order events | Not Settlement |
| Pickup ticket / display | **Fulfilment / Order Read** identity | Not money |
| Refund / void / complimentary | **Check** (+ compensating SR per platform rules) | Never Order-owned money |

### 2.3 Non-happy commercial paths

| Path | Architecture |
|------|----------------|
| **Partial payment** | Check partial settle policies (existing); Attribution per published SR policy |
| **Split payment** | Check split payment platform (existing); same settle convergence |
| **Void before settle** | Check/Order void rules; unpaid Check closed without Paid SR |
| **Complimentary** | Check complimentary outcome → SR path if platform publishes; Attribution if SR exists |
| **Refund after paid** | Compensating financial records via Check/SR (CS-09); Shift Attribution of refund SR per CRMP policy |
| **Cancel unpaid after kitchen started** | Operational cancel + kitchen cancel; no Paid SR; Reporting unchanged |
| **Failure handling** | See §9 |

---

## 3. Canonical Aggregate Diagram

```
Ordering Client (Kiosk)
  Browse → Cart → Place (placeWithIdentity) → Confirmation (ops only)
                         │
                         ▼
              ORDER (operational AR)
           lines · identity · fulfilment
              serviceMode = counter
                 NEVER owns money
                ┌───────┴────────┐
    OrderCreated│                │ ensureCheckForOrder
    (Kitchen /  │                ▼
     Print/KDS) ▼         CHECK (monetary AR)
              Kitchen       sessionId = null
              Ticket        bill · tax · tenders · outcome
                                 │ staff settle
                                 ▼
                        SETTLEMENT RECORD (immutable)
                        publication SSOT for Reporting
                                 │ Settlement Attribution
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
          REGISTER        FINANCIAL SHIFT        User
        (ops station)     (accountability)     (cashier)
         never money       never settlement
                                 │
                                 ▼
                         REPORTING (read-only)
                      Paid SR + Order Read metrics
```

**Pickup Ticket / Receipt**

| Artifact | Kind | Source of truth |
|----------|------|-----------------|
| Kitchen Ticket | Fulfilment document | Order / Kitchen Platform |
| Pickup identity | Operational display | Order business / display reference |
| Financial Receipt | Financial document | Settlement Record |
| Confirmation screen | UX only | Not a financial document |

---

## 4. Ownership Matrix

| Concern | Owner | Must not |
|---------|-------|----------|
| Ordering / cart / place | **Order** | Own tenders, revenue, SR |
| Bill, tax freeze, tender, paid outcome | **Check** | Be replaced by Register or Session |
| Per-order financial state entity | **Order Settlement** (under Check, ADR-022) | Become an AR or Order-owned |
| Immutable paid facts | **Settlement Record** | Be mutated by Shift / drawer variance |
| Register selection, Duty, device bind | **Register Operations / CRMP Register** | Own revenue or invent settle |
| Cashier accountability period | **Financial Shift** | Own or rewrite Settlement |
| SR → Register+Shift+User link | **Settlement Attribution** | Mutate SR; be channel-specific |
| Kitchen / Expo / Print | **Kitchen / Fulfilment** | Wait for Settlement to start (Counter Pickup) |
| Pickup / present / served | **Fulfilment / Order lifecycle** (Phase 5) | Drive Reporting revenue |
| Display retention of Shift history | **DRAP** (policy) + Shift (data) | Purge SR |
| Revenue / payment analytics | **Reporting** (read) | Read Counter-only tables as money SSOT |

### Lifecycle interactions (canonical sequence)

1. **Place** → Order created + unpaid Check + Kitchen starts.  
2. **Cashier settle** → Check finalize → SR published.  
3. **Attribute** → active Shift on Register + cashier User (fail-open if Attribution fails: money already correct).  
4. **Fulfilment** progresses independently (may precede or follow step 2).  
5. **Reporting** consumes Paid SR (+ Order Sales from Order Read) — never Counter Pickup shadow ledgers.

---

## 5. Settlement Timing Decision

### Option A — Immediate payment before kitchen

| Axis | Assessment |
|------|------------|
| Risk | Lower kitchen waste on unpaid no-shows; higher queue friction |
| Accounting | Clean “paid before produce” |
| UX | Customer pays at kiosk — **rejected by Phase 2** for Counter Pickup |
| Ops | Returns Self Ordering to customer-settle model |
| Reporting | Same SR path, earlier Paid timestamp |
| Complexity | Reintroduces kiosk tender UX + gateway on Ordering Client |

**Verdict:** **Rejected for Counter Pickup channel.**

### Option B — Kitchen first, payment later (cashier)

| Axis | Assessment |
|------|------------|
| Risk | Food may be prepared before pay (accepted QSR trade-off; mitigate via pickup identity + staff cancel) |
| Accounting | Unpaid open Check exists; Paid SR only after cashier settle — **canonical** |
| UX | Matches Phase 2 journey; cashier uses Register |
| Ops | Natural Counter Pickup / QSR flow |
| Reporting | Unpaid period invisible to Revenue (correct) |
| Complexity | Requires staff settle of **sessionless** Check (IMPACT-1) — design below |

**Verdict:** **Recommended and adopted (Phase 2).**

### Option C — Configurable business policy

| Axis | Assessment |
|------|------------|
| Risk / UX | Flexibility for other channels (e.g. future pay-at-kiosk SKUs) |
| Complexity | Policy engine must **not** fork money ownership |
| Reporting | Must still only count Paid SR |

**Verdict:** **Allowed as future cross-channel policy overlay**, provided every mode still: Place → Check; Settle → Check → SR → Attribution. **Not required to ship Counter Pickup.** Counter Pickup’s certified default remains **B**.

### Recommendation

| Channel policy | Settlement timing |
|----------------|-------------------|
| **Counter Pickup (this program)** | **B — Kitchen first, cashier settle later** |
| Future optional modes | C via explicit restaurant policy, never via a second money platform |

---

## 6. Settlement Timeline

```
t0  Place Order
    Order = placed
    Check = open / unpaid (sessionless)
    Kitchen = started
    Reporting Revenue = no change

t1  (optional) Kitchen progress / ready for pickup
    Fulfilment state advances
    Money state unchanged

t2  Cashier identifies Check + confirms tender
    Check accepts tender(s) / finalize
    Settlement Record published (Paid / refund / etc. per outcome)
    Settlement Attribution → Register + Financial Shift + User
    Financial receipt printable
    Reporting Revenue updates from Paid SR

t3  Pickup / Present / Served (Phase 5)
    Operational only — does not create money
```

**Partial / split:** Multiple tenders or staged settles follow **existing Check** rules; each published SR attributes under CRMP policy (at most one Attribution per SR — CR-INV-14).

---

## 7. Register Integration Model

| Topic | Design |
|-------|--------|
| **Register selection** | Cashier works on a Register with catalog `active` + Duty open; Settlement Station / counter types preferred for Counter Pickup |
| **Open Shift requirement** | **Required** for Attribution of cash accountability; settle of Check **must not be blocked** if Attribution cannot attach (ADR-030 fail-open) — ops alert instead |
| **Cashier identity** | Authenticated User on Register Duty (no new “Cashier” domain / device role) |
| **Drawer ownership** | Drawer entity under **Financial Shift** |
| **Cash accountability** | Expected cash / counts / over-short on **Shift** — never rewrite SR |
| **Multiple registers** | Each settle attributes to the Register/Shift that was active for that cashier action |
| **Multiple cashiers** | One active operator per Register Duty; handover via Shift handover (certified lifecycle) |
| **Shift transfer** | Handover successor Shift; new Attribution target for subsequent SR; historical SR stay immutable |
| **Offline behavior** | Architecture: no new offline money ledger. If device offline, settle deferred until connectivity or certified offline Check settle package (future) — **do not** invent Register-local revenue |

**Kiosk Register:** Ordering Client **must not** bind customer place to a Register. Register appears only at **staff settle**.

---

## 8. Financial Shift Integration

| Topic | Design |
|-------|--------|
| **When Shift “receives” revenue** | It does **not** receive revenue. It receives **Settlement Attribution** after SR exists. Revenue remains Reporting←SR. |
| **How tenders recorded** | On **Check** at settle; SR captures published tender facts; Shift tender summaries **read** SR via certified compose |
| **Cash reconciliation** | Shift counts vs expected cash (drawer) — **CS-08** |
| **Over / Short** | Shift accountability metric only |
| **Refund effects** | Compensating SR (+ Attribution per policy); Shift summaries update via reads — no mutation of original Paid SR |
| **Void effects** | Unpaid void: no Paid SR. Paid void/refund: compensating records |
| **Complimentary** | Check outcome → SR if published; Attribution if SR exists |
| **Corrections** | Never edit historical SR; issue compensating financial documents |

---

## 9. Reporting Flow

```
Paid Settlement Record  ──► Revenue / Payment methods / Tax (Reporting)
Order Read projections  ──► Order Sales / operational counts
Financial Shift reports ──► Drawer / tender mix (SR-backed reads) — additive ops metrics
Register analytics      ──► Attribution + Shift — not a second revenue ledger
Cashier analytics       ──► User on Attribution + Shift
Business Day            ──► Canonical Business Calendar (CS-10)
```

**No duplicate counting rules**

1. Revenue counts **Paid SR only** (unchanged).  
2. Order Sales follow Order Read dual-metric law (unchanged).  
3. Counter Pickup **must not** introduce `counter_payments` (or similar) as Reporting source (**CS-07**).  
4. Kitchen completion / pickup **must not** mark revenue.

---

## 10. Failure Handling

| Scenario | Handling |
|----------|----------|
| Payment timeout / gateway failure | Check remains unpaid; retry settle; no SR; kitchen may already be running — staff cancel or re-tender |
| Cash mismatch (drawer) | Shift count / over-short; **does not** alter SR |
| Kitchen cancellation | Fulfilment cancel; unpaid Check void/cancel per Check rules; no Paid SR |
| Customer cancellation (unpaid) | Same as unpaid cancel; kitchen stop |
| Customer cancellation (paid) | Refund / compensating SR path |
| Duplicate payment attempt | Check settle idempotency / conflict; no double SR |
| Duplicate receipt print | Reprint of same SR document — allowed |
| Lost receipt | Reprint from SR by Check/SR id |
| Printer failure | Settle success independent of print; reprint later |
| Offline register | No local shadow ledger; queue settle or block tender UI until online (product choice; architecture forbids offline revenue AR) |
| Offline payment terminal | Card tender fails; fallback cash or retry; Check unpaid until success |
| Refund after pickup | Compensating SR; fulfilment already done — ops only |
| Refund after Business Day close | Compensating SR on current/authorized day per Business Calendar + Check refund rules; Shift Attribution to **active** refund settle Shift |

---

## 11. Architecture Decision Record (Draft)

### Title

**Counter Pickup Cashier Settlement — Reuse Check + SR + CRMP Attribution; Kitchen-First Timing**

### Status

**Accepted (Architecture Phase 3)** — Implementation in Phase 4+.

### Context

Counter Pickup has no Session/Table/Waiter. Phase 2 removed customer settle UI. IMPACT-1: `session.markPaid` cannot settle sessionless Checks. CRMP and Settlement platforms are production-certified.

### Decision

1. Counter Pickup money path is **staff Check settle** → **Settlement Record** → **Settlement Attribution** to Register + Financial Shift + User.  
2. Timing is **Option B** (kitchen first).  
3. No new financial platform, no kiosk Register binding, no Session fabrication for till accountability.  
4. Phase 4 adoption must expose a **sessionless Check settle / cancel** surface for cashiers (Order/Check façade), not Dashboard Session Mark Paid alone.

### Consequences

| Positive | Negative / manage |
|----------|-------------------|
| Zero ownership forks | Unpaid kitchen risk (ops process) |
| Reporting unchanged | Cashier UX must search sessionless Checks |
| Reuses production CRMP | Attribution fail-open needs ops visibility |
| Aligns ADR-028 P9 / CR-INV-10 | Phase 4 implementation required |

### Rejected alternatives

| Alternative | Why rejected |
|-------------|--------------|
| Customer pay-at-kiosk (Option A) | Contradicts Phase 2; wrong UX for Counter Pickup |
| Session Mark Paid for kiosk Checks | IMPACT-1 — sessionless |
| Register-owned payment ledger | Violates CS-02 / ADR-028 |
| Shift-owned settlement | Violates CS-03 / ADR-030 |
| Counter-specific Attribution model | Violates CR-INV-10 |
| Kitchen-complete ⇒ Paid | Violates Reporting / Check ownership |
| Fake Dining Session for finance | Forbidden by ADR-020 / 028 |

### Risk assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Food prepared, never paid | Medium | Pickup identity + staff cancel + restaurant policy |
| Cashier settles wrong Check | Medium | Search by displayReference + confirm totals |
| Attribution lag | Low | Fail-open; money correct; ops repair Attribution |
| Duplicate settle | Low | Existing Check idempotency |

### Scalability / correctness

- Multi-register / multi-cashier: Attribution targets active Shift per settle action.  
- Franchise: tenant `restaurantId` on all CRMP + Check objects.  
- Financial correctness: single monetary AR (Check) + immutable SR + non-owning Shift.

---

## 12. Required Invariants

### Program invariants (Counter Pickup Cashier Settlement)

| ID | Invariant |
|----|-----------|
| **CS-01** | Order never owns money. |
| **CS-02** | Register never owns revenue. |
| **CS-03** | Financial Shift never owns settlement. |
| **CS-04** | Settlement Record is immutable after publish. |
| **CS-05** | Every paid Counter Pickup order maps to exactly one Check monetary outcome path (membership via certified Check–Order rules). |
| **CS-06** | Every attributed tender/SR belongs to at most one Settlement Attribution under active policy, targeting exactly one Financial Shift (and Register + User). |
| **CS-07** | Reporting never reads Counter Pickup–only tables as financial SSOT. |
| **CS-08** | Cash reconciliation (over/short) never changes historical Settlement Records. |
| **CS-09** | Refunds create compensating financial records — never edit original Paid SR. |
| **CS-10** | Business Day boundaries use the canonical Business Calendar. |
| **CS-11** | Counter Pickup Checks are sessionless (`sessionId = null`); settle MUST use Check-centric façades (not Session Mark Paid alone). |
| **CS-12** | Kitchen start MUST NOT require Settlement; `OrderCreated` remains the kitchen trigger. |
| **CS-13** | Kiosk / Ordering Client MUST NOT invoke settle or display financial paid receipt for Counter Pickup. |
| **CS-14** | Settlement Attribution MUST NOT be required for Check finalize success (fail-open); absence is an operational defect, not money corruption. |
| **CS-15** | Financial receipt SSOT is Settlement Record; confirmation/pickup screens are non-financial. |
| **CS-16** | No fabricated Dining Session or Table may be introduced to “make Session settle work.” |

---

## 13. Future Expansion Compatibility

| Capability | Compatibility |
|------------|---------------|
| Mobile / Handheld POS | Same staff Check settle + Register Duty on mobile_pos type |
| Multiple pickup counters | Fulfilment anchors / stations; money still Check+SR; Register chosen at settle |
| Delivery handoff | Different channel policy possible; money path unchanged if staff settle |
| Queue displays | Read Order / fulfilment identity — not SR |
| Loyalty / gift cards | Tender types on **Check**; SR publication; Attribution unchanged |
| Fiscal devices | Fiscalize from SR/Check publish events — never from Counter tables |
| Enterprise franchises | Tenant isolation + Business Calendar + DRAP policies |
| DRAP | Shift archive retention unrelated to SR permanence |

---

## 14. Deliverables Checklist

| # | Deliverable | Section |
|---|-------------|---------|
| 1 | Counter Pickup Business Workflow | §2 |
| 2 | Canonical Aggregate Diagram | §3 |
| 3 | Ownership Matrix | §4 |
| 4 | Settlement Timeline | §6 |
| 5 | Register Integration Model | §7 |
| 6 | Financial Shift Integration | §8 |
| 7 | Reporting Flow | §9 |
| 8 | Failure Handling | §10 |
| 9 | Architecture Decision Record Draft | §11 |
| 10 | Required Invariants | §12 |
| 11 | Future Expansion | §13 |
| 12 | Final Recommendation | §15 |

---

## 15. Final Recommendation

**Adopt the following as the permanent Counter Pickup Cashier Settlement Architecture:**

1. **Reuse** Order → Check → Settlement Record → Settlement Attribution → Register / Financial Shift / Reporting.  
2. **Timing:** Kitchen first; cashier settles later (**Option B**).  
3. **Cashier tool path (Phase 4):** Sessionless Check locate + cancel/settle façade; Register Ops for Duty/Shift; SR receipt print.  
4. **Never** add a Counter payment platform, Register revenue ledger, or Session fabrication.  
5. **Preserve** IMPACT-1: Dashboard Session Mark Paid is insufficient.

### Phase gate

| Next | Purpose |
|------|---------|
| **Phase 3b (optional)** | Runtime / operational validation certification (former Phase 3) |
| **Phase 4** | Cashier Cancel + Settle adoption (sessionless Check) — implementation |
| **Phase 5** | Present Order = Served (fulfilment, not money) |
| **Phase 6–7** | Settlement / Reporting adoption confirmation |

---

## 16. Final Certification

| Criterion | Status |
|-----------|--------|
| No ownership violations | **Met** |
| No duplicate financial sources | **Met** |
| Register / Shift / Settlement / Reporting reused | **Met** |
| Accounting remains canonical | **Met** |
| Counter Pickup integrated without new financial platform | **Met** |
| Invariants CS-01…CS-16 published | **Met** |

### Verdict

**PHASE 3 — CASHIER SETTLEMENT ARCHITECTURE CERTIFIED**

Implementation, migrations, UI, and production changes remain **out of scope** until Phase 4+ is explicitly authorized.

---

*End of Phase 3 — SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1*
