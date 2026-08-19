# ADR-ARCH-020: Financial Settlement Platform Architecture

> [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Architecture Authority |
| **Program** | SALES-SETTLEMENT-PLATFORM-ARCHITECTURE-1 · CHECK-GENERALIZATION-ARCHITECTURE-1 |
| **Date** | 2026-07-19 |
| **Supersedes** | — |
| **Refines** | CHECK-MANAGEMENT-ARCHITECTURE-1 · CHECK-SETTLEMENT-METHODS-1 (Session-mandatory Check binding); ADR-ARCH-002 (financial SSOT); ADR-ARCH-003 (settlement ownership); ADR-ARCH-010 (Session integration remains event-driven; financial enrollment is Check-owned) |
| **Implementation status** | Not implemented — constitutional decision only; no schema/API/runtime changes authorized by this ADR alone |
| **Related investigations** | SALES-SETTLEMENT-PLATFORM-ARCHITECTURE-1 · CHECK-GENERALIZATION-ARCHITECTURE-1 |
| **Refined by** | [ADR-ARCH-037](./ADR-ARCH-037-payment-process-domain.md) — Payment is the financial **process** owner. Check remains the sole monetary **aggregate** (R5 / I-FIN-01 unchanged). I-FIN-04 MUST NOT be read as live Order totals for Bill amount; Charge composition + `computeCheckMoney` is the certified obligation path. |

---

## Critical review (mandatory before acceptance)

This ADR was not authored as a transcription of the investigations. The following weaknesses were challenged and **resolved into constitutional corrections** before acceptance.

| # | Challenge | Risk if ignored | Constitutional correction |
|---|-----------|-----------------|---------------------------|
| R1 | “CheckMembership” as a **separate aggregate** | Dual ownership of bill composition; DDD boundary violation | **Membership is owned by the Check aggregate** (internal association of Order identifiers). It is not a second root. |
| R2 | Permanent dual discovery (Session order-scan **and** membership) | Dual SSOT for Check subtotal; divergent Revenue | After cutover, **membership is the sole discovery path** for contributing Orders. Session scan is transitional only. |
| R3 | Every Order must have a Check | Forces fake Sessions / premature finance; breaks kitchen-only flows | Orders **MAY** exist without a Check. Such Orders **MUST NOT** contribute to Check Revenue until enrolled and the Check is settled `paid` (or counted under complimentary rules). |
| R4 | Business Identity as Order–Check link | Couples display sequence to money; BI can lag; violates ADR-ARCH-019 orthogonality | **Forbidden.** BI remains day/display/scope only. |
| R5 | “Invoice” / Sales Settlement as a **second** monetary aggregate | Dual financial SSOT; ERP creep | **Rejected.** Check remains the sole monetary aggregate; “Financial Settlement Platform” is the **platform name** for generalized Check Management. |
| R6 | Open Check money vs Order amount changes | Stale bills or silent drift | While `outcome = open`, Check **MUST** recalculate from **current** enrolled Order totals (non-cancelled). On terminal settle, totals **freeze**. |
| R7 | Multi-tenant leakage via membership | Cross-restaurant bill corruption | Every Check, membership reference, and SettlementTransaction **MUST** carry `restaurantId`; enrollment **MUST** reject cross-tenant Order IDs. |
| R8 | Settle API remains Session-only forever | Kiosk/counter cannot settle without fake Session | Session settle commands **MAY** remain as façades; **authoritative settle** is Check-identified. |
| R9 | Revenue redefined as tender sum | Breaks CHECK-SETTLEMENT-METHODS-1 / Reporting | **Forbidden.** Revenue remains paid Check `grandTotal`. |
| R10 | Settlement moved into Order “for simplicity” | Violates Order-Centric North Star | **Forbidden.** |

Only with R1–R10 resolved is this ADR accepted.

---

## Context

MineuQR is an Order-centric Restaurant Operations SaaS (Architecture Constitution; ADR-ARCH-001).

Financial settlement was introduced under **Check Management**:

```
Dining Session → Check → SettlementTransaction[]
```

Check is the certified monetary SSOT for **Check Revenue**, **Tax**, and (via child tenders) **Payment Method Analytics**. Order Read remains the SSOT for **Order Sales** (served/completed operational value). These are intentional dual metrics, not duplicates.

**Order Identity** (ADR-ARCH-019) already allows non-table channels (kiosk/counter/delivery) without fake tables. Those channels place Orders with **ephemeral / null Session**. Because Check creation and subtotal discovery are **Session-mandatory** today, those Orders never enter the financial settlement path.

Investigations concluded: do **not** invent a second monetary aggregate; **generalize Check**.

---

## Problem statement

Financial ownership is implicitly gated by Dining Session traversal (`sessionId` on Check; subtotal via `Orders where sessionId = …`).

That coupling:

1. Blocks clean financial architecture for Self-Ordering Kiosk, counter, delivery, and future channels.  
2. Risks anti-patterns (fake Sessions solely to unlock Check).  
3. Confuses operational visit lifecycle with monetary settlement lifecycle.  
4. Threatens long-term SaaS extensibility without changing Revenue mathematics.

The platform requires a constitutional model where **any sales channel that collects money** can participate in **one** Financial Settlement Platform without rewriting Order, Reporting formulas, or introducing ERP.

---

## Decision

**The platform SHALL evolve Check Management into the Financial Settlement Platform.**

### Constitutional rules

1. **Check** is the **sole monetary settlement aggregate** for restaurant sales.  
2. **Order** remains the **sole core operational aggregate** for placement, lines, fulfilment lifecycle, and line money (`totalAmount`).  
3. **SettlementTransaction** exists **only** as a child of Check (tender lines).  
4. **Dining Session** is an **optional operational context** (visit/occupancy/attach). It **MUST NOT** be required to own or discover financial totals.  
5. Financial contribution of Orders to a Check **SHALL** be via **Check-owned membership** of Order identifiers — not via Session order scanning (except temporary migration adapters).  
6. **Revenue, Tax, bill-level discounts, service-charge slots, and grand totals** originate **only** from Check (using frozen snapshots and Check freeze policy).  
7. **Reporting Platform** continues to treat Check as financial SSOT for collected money; Order Read remains SSOT for Order Sales.  
8. **No Invoice aggregate. No ledger. No AR/AP. No journal. No second financial model.**  
9. **Evolution over replacement:** existing table-service Check behavior remains the compatibility path; generalization is additive.

---

## Architectural principles

| Principle | Meaning |
|-----------|---------|
| **Zero Dual SSOT** | One monetary root (Check). One Revenue formula. One membership discovery path after cutover. |
| **Order-Centric** | Order never absorbs settlement, tax policy, or tenders. |
| **Session ≠ Finance** | Session may reference an active Check; Session does not define bill membership. |
| **Platform before channels** | Channels must not invent alternate monetary aggregates or payment SSOTs. |
| **Snapshots beat live settings** | Historical tax/currency on Check never re-read live Business Settings. |
| **Restaurant Ops, not ERP** | Guest-check settlement only. |
| **Production-first evolution** | Compatibility façades allowed; permanent forks forbidden. |
| **Tenant isolation** | `restaurantId` on every financial write and membership. |

---

## Ownership boundaries

| Concern | Owner | Forbidden owners |
|---------|-------|------------------|
| Order lifecycle / lines / line totals | Order | Check, Session, Reporting, UI |
| Visit / table occupancy / session lifecycle | Dining Session (Operational Session) | Check, Order |
| Bill membership (which Orders compose the bill) | **Check** | Session scan (post-cutover), BI, UI |
| Tax / currency snapshots, bill discount, grandTotal, outcome | Check | Order, Session, SettlementTransaction sum-as-Revenue |
| Tender / payment method lines | SettlementTransaction under Check | Order, Session, Reporting writes |
| Check Revenue / Tax KPIs | Reporting reads Check | Client aggregation, Order Sales, tender sum |
| Order Sales / completed order KPIs | Reporting reads Order Read | Check |
| Business Identity (day/display/scope) | Business Identity on Order | Check linkage |
| Fulfilment Anchor / Service Mode | Order Identity (ADR-ARCH-019) | Check |

---

## Aggregate responsibilities

### Order

- Place, price-at-create (catalog), lines, status FSM, cancel.  
- Optional `sessionId` for operational visit attach.  
- **Must not** store settlement outcome, tax policy snapshot, or payment tenders as authority.  
- **May** carry a non-authoritative Check reference for query convenience only if Check membership remains authoritative (implementation programs decide; constitution requires Check authority).

### Dining Session

- Operational visit keyed by Session Anchor (ADR-ARCH-019 / OSP).  
- Optional `activeCheckId` pointing at the visit’s active Check.  
- **Must not** compute Revenue or own tender lines.

### Check (Financial Settlement Platform root)

- Create open Check (with or without Session).  
- Own membership of contributing Orders.  
- Freeze currency/tax snapshots at create; recalculate while open; freeze totals on terminal outcomes.  
- Outcomes: `open` \| `paid` \| `complimentary` \| `voided`.  
- Emit financial domain facts/events for integration (event-driven extensibility).

### SettlementTransaction

- Captured/pending/voided/refunded tender lines under one Check.  
- Split tenders must satisfy Check paid invariants.  
- **Must not** redefine Revenue.

---

## Canonical relationships

```
Order  (0..*)  ──membership──►  Check  (1)
Check  (0..1)  ◄──activeCheckId──  Dining Session  (optional)
Check  (1)     ──owns──►  SettlementTransaction  (0..*)
Order  (0..1)  ──sessionId──►  Dining Session  (optional)
```

**Cardinality invariants**

| Relation | Rule |
|----------|------|
| Orders per Check | 1..* allowed (table bills); 1..1 typical for kiosk/delivery |
| Checks per Order | At most **one** non-void membership |
| Sessions per Check | 0..1 |
| Checks per Session (active) | At most one open Check via `activeCheckId` |
| Cross-Session Orders on one Check | **Forbidden** (v1 constitutional scope) |
| Cross-tenant membership | **Forbidden** |

---

## Domain model (conceptual)

```
Financial Settlement Platform
  Check
    - identity (own id ≠ Session id)
    - restaurantId
    - sessionId?                 // optional operational context
    - membership: OrderId[]      // Check-owned
    - currencySnapshot
    - taxPolicySnapshot
    - serviceChargeSnapshot?     // reserved
    - billDiscountAmount
    - subtotal, taxAmount, taxBreakdown, grandTotal
    - outcome, freeze timestamps
    - SettlementTransaction[]
```

Persistence shape is **out of scope** for this ADR (no schema mandate here). Future implementation programs must realize these responsibilities without violating invariants.

---

## Invariants

1. **I-FIN-01** Check is the only monetary settlement aggregate for restaurant sales.  
2. **I-FIN-02** Revenue = sum of `grandTotal` where `outcome = paid` (tenant-scoped).  
3. **I-FIN-03** Tax collected for financial reporting uses Check `taxAmount` + frozen snapshots for paid Checks.  
4. **I-FIN-04** While open, Check totals derive from current non-cancelled enrolled Order `totalAmount` values minus bill discount, then tax rules from frozen snapshots.  
5. **I-FIN-05** Terminal outcomes freeze totals; further recalculation forbidden.  
6. **I-FIN-06** An Order contributes to at most one non-void Check.  
7. **I-FIN-07** Paid tenders sum to `grandTotal`; complimentary uses complimentary tender rules; void writes no tenders.  
8. **I-FIN-08** Snapshots never mutate after Check create.  
9. **I-FIN-09** Membership and Check share `restaurantId` with enrolled Orders.  
10. **I-FIN-10** After migration cutover, Session order-scan **MUST NOT** be an alternate subtotal authority.  
11. **I-FIN-11** Business Identity fields **MUST NOT** be used as financial foreign keys.  
12. **I-FIN-12** Settlement **MUST NOT** move into the Order aggregate.

---

## Allowed relationships

- Session creates/opens a Check for table visits and sets `activeCheckId`.  
- Order enrollment into Check via Check commands / event handlers owned by Financial Settlement Platform.  
- Order domain events trigger enrollment/recalculation **without** Order owning money.  
- Reporting reads Checks and SettlementTransactions.  
- UI captures tenders and invokes settle on Check (directly or via Session façade).  
- Future PSP capture still finalizes through Check + SettlementTransaction.

---

## Forbidden relationships

- Order aggregate owning payment methods, tax policy, or settlement outcome as SSOT.  
- Second monetary aggregate (“Invoice”, “SalesSettlement”, “Bill” root beside Check).  
- Fake Dining Sessions invented solely to unlock Check.  
- Revenue = sum of SettlementTransaction amounts.  
- Check line-item duplication of Order catalog lines as a second line SSOT (Check composes Order totals; it does not re-own menu lines).  
- ERP ledger, AR/AP, journal entries, statutory invoice engine inside this platform.  
- Permanent dual subtotal discovery.  
- BI-based Check linkage.  
- Cross-tenant or cross-Session (v1) membership.

---

## Reporting ownership

| KPI family | SSOT | Notes |
|------------|------|-------|
| Check Revenue, Tax, Paid Checks, Average Check, Comp/Void | Check | Unchanged formulas |
| Payment Method Analytics | SettlementTransaction (captured) | Never replaces Revenue |
| Order Sales, Completed Orders, Average Order | Order Read | Unchanged; dual metric preserved |
| Executive operational cards | Order Sales family | Financial Summary retains Check metrics |
| Business Day filters | Existing Reporting Business Day utilities on Check/Order paths | Sessionless Checks use Check timestamps + restaurant working hours — not BI keys |

**Constitutional dual-metric law:** Check Revenue ≠ Order Sales. Labels and calculation paths must remain distinct (Product Semantics).

---

## Operational vs financial separation

| Layer | Question answered |
|-------|-------------------|
| Order | What was ordered and how is fulfilment progressing? |
| Session | Who is occupying this visit/anchor right now? |
| Check | What is owed/collected for this bill, under which tax/tender rules? |
| Reporting | How do we present KPIs without becoming write authority? |

Session closure remains independent of Order completion (prior certified constraint). Check settlement remains independent of kitchen “served” except where product enrollment rules require it — **served is not synonymous with paid**.

---

## Supported sales channels

| Channel | Session | Check | Membership pattern |
|---------|---------|-------|--------------------|
| Waiter | Required (table) | Yes | N Orders → 1 Check |
| QR table | Required (table) | Yes | N Orders → 1 Check |
| Kiosk | Optional/none | Yes (when money collected) | Typically 1 → 1 |
| Counter | Optional/none | Yes | 1..N → 1 |
| Delivery | Optional/none | Yes | Typically 1 → 1 |
| Future channels | Must not invent new monetary roots | Must enroll Orders into Check to collect Revenue | Platform patterns above |

Channels that never collect money need not create Checks; they also must not appear in Check Revenue.

---

## Migration policy

1. **Additive evolution** — no big-bang rewrite of Order or Reporting formulas.  
2. **Compatibility first** — table Session → Check path remains behaviorally compatible via adapters.  
3. **Transitional dual-write** of membership from Session Orders is allowed.  
4. **Cutover rule** — when membership backfill + dual-write are proven, Session scan loses authority (I-FIN-10).  
5. **No dual Revenue APIs** — do not mount a parallel “SalesSettlementRevenue” beside Check Revenue.  
6. Implementation requires **separate programs** chartered under this ADR; this ADR alone authorizes no schema or production change.

---

## Compatibility strategy

- `session.markPaid` / complimentary / close-void **MAY** remain public façades that resolve `activeCheckId` and delegate to Check settle.  
- Dashboard Session UX **MAY** remain Session-centric for table service.  
- New sessionless channels **MUST** use Check-centric settle authority.  
- Historical `operational_checks` rows remain valid Revenue history.

---

## Risks

| Risk | Mitigation in this ADR |
|------|------------------------|
| Dual SSOT during migration | Time-boxed adapters; I-FIN-10 cutover |
| Enrollment races | Check open recalculation must be concurrency-safe in implementation programs (ADR-ARCH-011 spirit applied to Check) |
| Order amount change after enroll | I-FIN-04 / I-FIN-05 |
| Operators confuse Order Sales with Revenue | Dual-metric law + Product Semantics (unchanged) |
| ERP creep via naming | Forbidden relationships; Check ≠ Invoice |
| Tenant isolation bugs | I-FIN-09 |

---

## Trade-offs

| Benefit | Cost |
|---------|------|
| One financial model for all channels | Membership + nullable Session design work in future programs |
| Preserves Reporting KPIs | Dual metrics remain (intentional complexity) |
| Preserves Order sovereignty | Check depends on Order totals by reference (composition, not ownership) |
| Avoids second aggregate | Check model becomes more central — must stay within Ops boundary |

---

## Consequences

### Positive

- Constitutional end-state for 5–10 year channel growth without financial rewrites.  
- Aligns ADR-ARCH-019 non-table Orders with a real money path.  
- Keeps certified freeze, tender, and Revenue mathematics.  
- Clarifies Session as optional operational context.

### Negative / costs

- Future implementation programs required (membership, APIs, channel settle UX).  
- Temporary migration complexity.  
- Discipline required to avoid dual discovery and Invoice/ERP naming.

### Neutral clarifications

- “Financial Settlement Platform” is the **platform capability name**; the aggregate remains **Check**.  
- SaaS subscription `invoices` (commercial billing) remain a **separate** domain and are out of scope.

---

## Future extensibility

Allowed without changing this constitutional model:

- New payment method codes and PSP `externalReference` on tenders.  
- New Fulfilment Anchors / Service Modes (ADR-ARCH-019).  
- Partial tender coverage productization under existing Check invariants.  
- Refund flows via SettlementTransaction status under Check.  
- Multi-rate tax via existing snapshot `components[]`.

Allowed via refining ADR (does not replace Check as Revenue root):

- **Order Settlement** as Check-owned per-Order financial state — see [ADR-ARCH-022](./ADR-ARCH-022-order-settlement-platform.md).

Requires a **new ADR** (fundamental capability change):

- Split Check / seat transfer as first-class multi-Check per Session.  
- Accounts receivable / customer credit accounts.  
- Marketplace split-pay across legal entities.  
- Replacing Check with an accounting Invoice engine.

---

## Alternatives considered

| Alternative | Verdict |
|-------------|---------|
| New SalesSettlement aggregate + Check as view | **Rejected** — dual monetary SSOT (R5) |
| Keep Session-mandatory Check | **Rejected** — blocks ADR-ARCH-019 channels |
| Settle inside Order | **Rejected** — violates ADR-ARCH-001 / North Star |
| BI as financial join | **Rejected** — R4 |
| Fake Sessions for kiosk | **Rejected** — corrupts occupancy; violates Platform Before Channels |
| Revenue = tender sum | **Rejected** — R9 |
| Membership as separate aggregate root | **Rejected** — R1 |

---

## Related ADRs

| ADR | Relationship |
|-----|----------------|
| ADR-ARCH-001 | Order remains core operational domain |
| ADR-ARCH-002 | Financial SSOT = Check; Order Sales separate |
| ADR-ARCH-003 | Settlement ownership boundary = Check platform |
| ADR-ARCH-004 / 008 / 010 / 014 | Integration via events; Session/Check effects not inline in Order command forever |
| ADR-ARCH-006 | UI must not invent financial formulas |
| ADR-ARCH-009 | Order Read owns **order** analytics — not Check Revenue |
| ADR-ARCH-019 | Non-table identity enabled; this ADR supplies financial completion |

---

## Related programs

- CHECK-MANAGEMENT-ARCHITECTURE-1 (implemented foundation)  
- CHECK-SETTLEMENT-METHODS-1 (tenders; implemented foundation)  
- REPORTING-PLATFORM-ARCHITECTURE-1 (financial read SSOT)  
- SALES-SETTLEMENT-PLATFORM-ARCHITECTURE-1 (investigation)  
- CHECK-GENERALIZATION-ARCHITECTURE-1 (investigation)  
- Future implementation programs **must** cite this ADR and must not redefine the model

---

## Acceptance criteria (for future implementation certification)

Implementation programs deriving from this ADR are complete only when:

- [ ] Check enrollment (membership) is authoritative for contributing Orders  
- [ ] Sessionless Checks can be created and settled without Dining Session  
- [ ] Table Session façade remains behaviorally compatible  
- [ ] Session order-scan is not an alternate subtotal authority post-cutover  
- [ ] Revenue / Tax / Payment Analytics formulas unchanged  
- [ ] Architecture guards forbid second monetary aggregate and settlement-in-Order  
- [ ] Multi-tenant membership invariants enforced  
- [ ] No ERP Invoice / ledger surfaces introduced  

---

## Final constitutional statement

**MineuQR’s Financial Settlement Platform is generalized Check Management:**  
**Check is the sole monetary settlement aggregate; Order is the sole operational core; Session is optional operational context; SettlementTransaction belongs only to Check; Order–Check contribution is Check-owned membership; Reporting reads Check for collected money and Order Read for Order Sales; the platform shall not introduce a second financial model or ERP accounting concepts.**

This decision governs MineuQR financial settlement architecture until Architecture Authority accepts a superseding ADR for a fundamental business capability change.

---

**Authority:** Architecture Constitution v1.0 · Architecture Authority  
**Document type:** Constitutional ADR — decision only (no implementation authorization beyond governance)
