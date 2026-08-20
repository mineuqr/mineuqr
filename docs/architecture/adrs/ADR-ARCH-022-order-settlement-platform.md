# ADR-ARCH-022: Order Settlement Platform

> [← ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [← ADR-ARCH-021](./ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Architecture Authority |
| **Program** | ORDER-SETTLEMENT-ARCHITECTURE-1 · ORDER-SETTLEMENT-ARCHITECTURE-HARDENING-1 |
| **Date** | 2026-07-22 |
| **Revision** | **1.1** — 2026-07-22 (ORDER-SETTLEMENT-ARCHITECTURE-HARDENING-1) |
| **Supersedes** | — |
| **Refines** | [ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) (introduces per-Order financial state **without** moving settlement into the Order aggregate or creating a second Revenue root) |
| **Related ADRs** | ADR-ARCH-001 · ADR-ARCH-002 · ADR-ARCH-003 · ADR-ARCH-007 · ADR-ARCH-019 · ADR-ARCH-020 · ADR-ARCH-021 |
| **Related programs** | CHECK-MANAGEMENT-ARCHITECTURE-1 · CHECK-SETTLEMENT-METHODS-1 · CHECK-GENERALIZATION-* · COMPATIBILITY-CLEANUP-1 · ORDER-SETTLEMENT-ARCHITECTURE-HARDENING-1 · ORDER-SETTLEMENT-DOMAIN-1 (successor) |
| **Implementation status** | **Not implemented** — constitutional + program architecture only; no schema/API/runtime changes authorized by this ADR alone |
| **Refined by** | [ADR-ARCH-037](./ADR-ARCH-037-payment-process-domain.md) — Order Settlement remains per-Order publication, not Bill amount authority (I-PAY-17). Payment MUST NOT derive amount due from OS amounts. |
| **Partially superseded by** | [ADR-ARCH-039](./ADR-ARCH-039-payment-collection-financial-authority.md) — I-OS-07 (paid Check ⇒ OS settled in the same TX) yields on **certified adopted** channels **after** Revenue reads Collection Facts. I-PAY-17 retained. **No runtime change from 039.** |

### Revision notes

| Rev | Date | Program | Change |
|-----|------|---------|--------|
| 1.0 | 2026-07-22 | ORDER-SETTLEMENT-ARCHITECTURE-1 | Initial acceptance |
| 1.1 | 2026-07-22 | ORDER-SETTLEMENT-ARCHITECTURE-HARDENING-1 | Governance hardening only: **I-OS-14** (no terminal→non-terminal regression); lifecycle terminal/non-terminal documentation; explicit Aggregate Ownership boundaries. **Does not** alter ADR-ARCH-020, Revenue SSOT, Membership authority, Check ownership, or I-OS-01…I-OS-12 meaning. |

---

## 1. Purpose

This ADR defines the **Order Settlement Platform** — the architectural home for the **financial settlement state of each Order**.

It answers, without tribal knowledge:

> After Check and Membership authority are production-certified, how does MineuQR represent whether an individual Order is unpaid, partially settled, settled, refunded, voided, or cancelled — without violating ADR-ARCH-020?

This ADR authorizes **architecture publication only**. Runtime work requires successor programs (starting with `ORDER-SETTLEMENT-DOMAIN-1`).

---

## 2. Context (evidence)

### 2.1 Certified baseline (ADR-ARCH-020 + generalization)

| Capability | Authority today | Evidence |
|------------|-----------------|----------|
| Bill / tax / grandTotal / outcome | **Check** | ADR-ARCH-020 I-FIN-01…05 |
| Contributing Orders | **Check-owned Membership** | I-FIN-06, I-FIN-10; M1–M5 + cleanup |
| Tender lines | **SettlementTransaction** under Check | CHECK-SETTLEMENT-METHODS-1 |
| Operational lines / `totalAmount` | **Order** | ADR-ARCH-001 / 007 |
| Visit context | **Dining Session** (optional) | ADR-ARCH-020 |
| Check Revenue | Reporting reads paid Check `grandTotal` | I-FIN-02 |
| Order Sales | Reporting reads Order Read | Dual-metric law |

Canonical graph today:

```
Order  (0..*)  ──membership──►  Check  (1)
Check  (1)     ──owns──►  SettlementTransaction  (0..*)
```

### 2.2 Gap

ADR-ARCH-020 forbids settling **inside** the Order aggregate (I-FIN-12 / R10) and forbids a second monetary root (R5).  
It does **not** yet define a first-class **per-Order financial state** object.

As a result:

1. Channels and operators cannot ask “is *this Order* settled?” without inferring from Check outcome + Membership.  
2. Future partial settlement / per-Order coverage / refunds-at-Order-granularity lack a durable write model.  
3. Kiosk/counter 1:1 Order↔Check UX still lacks a named Order-level financial lifecycle (façade gap noted post-cleanup).

Business decision: **introduce Order Settlement as the financial state of each Order**, under the Financial Settlement Platform.

---

## 3. Decision

**The Financial Settlement Platform SHALL include Order Settlement as a Check-owned entity representing the financial settlement state of one enrolled Order.**

### Constitutional rules

1. **Order Settlement is an Entity**, not an Aggregate Root, not a Value Object, and not a Projection.  
2. **Ownership:** Financial Settlement Platform / **Check Domain** owns Order Settlement.  
3. **Order Domain does not own** Order Settlement, tenders, tax snapshots, or Check outcome (I-FIN-12 preserved).  
4. **Check remains** the sole **bill / Revenue / tender** monetary aggregate root (I-FIN-01 preserved).  
5. **Membership remains** the authoritative association of Order → Check (composition discovery).  
6. **Order Settlement is created when Membership enrolls** an Order into a Check (or in the same atomic enrollment transaction in implementation).  
7. **SettlementTransaction remains a child of Check** (tender ledger). Order Settlement does **not** become a second tender ledger.  
8. **No Invoice. No ERP ledger. No AR/AP. No second Revenue formula.**  
9. **Revenue SSOT unchanged:** paid Check `grandTotal`. Order Settlement is SSOT for **Order-level settlement state**, not for restaurant Revenue.

---

## 4. Critical challenges resolved

| # | Challenge | Risk if ignored | Constitutional correction |
|---|-----------|-----------------|---------------------------|
| R1 | Order Settlement as Order-owned aggregate | Violates I-FIN-12 / North Star | Owned by **Check / FSP**, referenced by `orderId` |
| R2 | Order Settlement as second monetary root | Dual Revenue (R5 of ADR-020) | Entity under Check; Revenue stays Check |
| R3 | Replace Membership with Order Settlement | Dual composition authority | Membership stays discovery authority; OS tracks **state + amounts** |
| R4 | Move tenders under Order Settlement | Fragmented tender SSOT | Tenders stay under Check; OS allocates/covers via Check settle rules |
| R5 | Require OS for every Order always | Forces finance on kitchen-only Orders | OS exists only while Order is enrolled on a non-void Check (or historical terminal OS retained after settle) |
| R6 | Derive-only / projection-only OS | Cannot support partial settle / refunds | OS is a **writable entity** with lifecycle; may be synchronized from Check events |
| R7 | Redefine Revenue as sum of settled Orders | Breaks Reporting | Forbidden — dual-metric law unchanged |

---

## 5. Answers to architecture questions

### 5.1 What is Order Settlement?

| Classification | Verdict | Rationale |
|----------------|---------|-----------|
| Aggregate | **No** | Would create a second monetary root beside Check |
| Entity | **Yes** | Has identity, lifecycle, and mutable financial state |
| Value Object | **No** | Lifecycle and identity matter; not replaceable by attributes alone |
| Projection | **No** | Not read-only; write authority for Order-level settlement state |

**Definition:**  
**Order Settlement** is the Check-owned entity that records, for one enrolled Order, the financial settlement lifecycle and coverage amounts relative to that Order’s contributing total on the Check.

### 5.2 Who owns Order Settlement?

| Candidate | Verdict |
|-----------|---------|
| Order Domain | **Forbidden** (I-FIN-12) |
| Settlement Domain (standalone aggregate) | **Forbidden** (second root) |
| Check Domain / FSP | **Owner** |
| Separate Aggregate | **No** — Entity inside Check aggregate boundary |

### 5.3 Relationship with Order

| Question | Decision |
|----------|----------|
| Cardinality | **1:1** Order ↔ Order Settlement **while enrolled** on a given Check |
| Optional? | **Yes before enrollment**; Orders MAY exist with no OS (ADR-020 R3) |
| Required? | **Required after enrollment** onto a non-void Check |
| Historical | Terminal OS records MAY remain after Check terminal outcome for audit/reporting |

### 5.4 Relationship with Check

| Question | Decision |
|----------|----------|
| Cardinality | **N:1** — many Order Settlements per Check |
| Model | **Allocation / coverage** of Order contribution within one Check bill |
| Bill composition | Still Membership → Order totals → Check money (I-FIN-04) |
| Split Check | **Out of scope** (still requires a future ADR per ADR-020) |

### 5.5 Relationship with Settlement Transactions

| Question | Decision |
|----------|----------|
| Direct ownership of tenders? | **No** |
| Through Check? | **Yes** — tenders settle the Check; OS state transitions when Check coverage rules apply |
| Separate ledger? | **Forbidden** |
| v1 product reality | Atomic Check settle → all active Order Settlements on that Check transition together |
| Future (same ADR model) | Partial coverage MAY update OS amounts without new monetary root; still no tender re-parenting |

### 5.6 Relationship with Membership

| Question | Decision |
|----------|----------|
| Membership authoritative for composition? | **Yes — remains** |
| Does OS replace Membership? | **No** |
| Does OS consume Membership? | **Yes** — OS is bound to `(checkId, orderId)` established by Membership |
| Lifecycle coupling | Enroll → open OS; deactivate/void membership with Check void → void OS |

### 5.7 Financial authority after introduction

| Concern | SSOT |
|---------|------|
| Restaurant Check Revenue / Tax | **Check** (unchanged) |
| Payment Method Analytics | **SettlementTransaction** under Check (unchanged) |
| Order Sales (operational) | **Order Read** (unchanged) |
| Order line / catalog money | **Order.totalAmount** (unchanged) |
| **Per-Order financial settlement state** | **Order Settlement** (new) |
| Bill membership | **Membership** (unchanged) |

---

## 6. Canonical lifecycle

### 6.1 States (canonical)

| State | Meaning |
|-------|---------|
| `pending` | Enrolled on an open Check; outstanding equals contributing total; nothing captured for this Order |
| `partially_settled` | Some positive settled amount; outstanding remaining (future productization; model reserved) |
| `settled` | Fully covered as **paid** contribution |
| `complimentary` | Fully covered under Check complimentary outcome |
| `refunded` | Previously settled/complimentary coverage reversed (full or modeled refund; details in domain program) |
| `voided` | Check voided (or financial contribution cancelled with Check void) |
| `cancelled` | Order cancelled while Check still open; OS closed without collection |

**Not used as OS states:** Check `open` (Check outcome), Order FSM statuses (operational), Membership `active` flag (composition).

### 6.2 Terminal vs non-terminal states

| Class | States | Meaning |
|-------|--------|---------|
| **Non-terminal** | `pending`, `partially_settled` | Financial lifecycle still open; further business transitions allowed under this ADR |
| **Terminal** | `settled`, `complimentary`, `refunded`, `voided`, `cancelled` | Financial lifecycle closed for that path; **must not regress** to non-terminal (I-OS-14) |

Notes:

- `refunded` is terminal for the settled/complimentary coverage path. It is **not** a return to `pending`.  
- `settled` → `voided` / `complimentary` → `voided` (if ever productized) are **terminal → terminal** and remain constrained by domain legality — they are **not** regressions to non-terminal.  
- Any exception that would reopen a terminal OS into `pending` or `partially_settled` requires a **new ADR** and Architecture Authority approval.

### 6.3 Allowed business transitions

These are the **only** transitions authorized by this ADR (v1 + reserved partial):

| From | To | Business meaning |
|------|----|------------------|
| *(none)* | `pending` | Membership enroll opens OS |
| `pending` | `partially_settled` | Partial cover (future product) |
| `pending` | `settled` | Full paid cover |
| `pending` | `complimentary` | Comp cover |
| `pending` | `cancelled` | Order cancelled while Check open |
| `pending` | `voided` | Check voided |
| `partially_settled` | `settled` | Remaining paid cover |
| `partially_settled` | `complimentary` | Comp cover (constrained) |
| `partially_settled` | `cancelled` | Order cancelled while Check open |
| `partially_settled` | `voided` | Check voided |
| `settled` | `refunded` | Refund of paid coverage |
| `complimentary` | `refunded` | Refund of complimentary coverage |
| `settled` | `voided` | Constrained void-after-settle (domain legality) |
| `complimentary` | `voided` | Constrained void-after-comp (domain legality) |
| `refunded` | `voided` | Constrained void-after-refund (domain legality) |

```
(none)
  --enroll--> pending
pending --partial cover--> partially_settled   [future product]
pending|partially_settled --full paid cover--> settled
pending|partially_settled --comp cover--> complimentary
pending|partially_settled --order cancel--> cancelled
pending|partially_settled --check void--> voided
settled|complimentary --refund--> refunded
settled|complimentary|refunded --check void--> voided   [constrained; domain program defines legality]
```

### 6.4 Architecturally forbidden transitions (lifecycle regression)

The following are **architecturally forbidden** (not merely “not implemented”). They violate **I-OS-14**.

| From (terminal) | To (non-terminal) | Status |
|-----------------|-------------------|--------|
| `settled` | `pending` | **Forbidden** |
| `settled` | `partially_settled` | **Forbidden** |
| `complimentary` | `pending` | **Forbidden** |
| `complimentary` | `partially_settled` | **Forbidden** |
| `refunded` | `pending` | **Forbidden** |
| `refunded` | `partially_settled` | **Forbidden** |
| `voided` | `pending` | **Forbidden** |
| `voided` | `partially_settled` | **Forbidden** |
| `cancelled` | `pending` | **Forbidden** |
| `cancelled` | `partially_settled` | **Forbidden** |

Also forbidden without a new ADR:

- Any terminal → non-terminal transition not listed above  
- “Re-open” semantics that recreate unpaid state on the same OS identity after terminal close  
- Treating refund as a return to `pending` (refund is its own terminal state)

**Exception rule:** Any future exception requires a **new ADR** and explicit Architecture Authority approval.

### 6.5 Amount fields (conceptual — not schema)

| Field | Meaning |
|-------|---------|
| `orderTotalSnapshot` | Contributing Order total used for settlement math (recalculates while Check open per I-FIN-04) |
| `settledAmount` | Amount covered for this Order |
| `outstandingAmount` | `orderTotalSnapshot − settledAmount` (≥ 0) |
| `allocatedAmount` | Amount of Order contribution included in current open Check bill (v1: equals `orderTotalSnapshot` when pending) |

Exact decimal/tax allocation rules (especially bill discounts shared across Orders) are deferred to `ORDER-SETTLEMENT-DOMAIN-1` under invariants below.

---

## 6A. Aggregate Ownership

### 6A.1 Canonical aggregate boundary diagram

```
+------------------------------------------------------+
|                 Check Aggregate                      |
|------------------------------------------------------|
| Check                                                |
| Membership[]                                         |
| SettlementTransaction[]                              |
| OrderSettlement[]                                    |
+------------------------------------------------------+

                 references
                       │
                       ▼
+------------------------------------------------------+
|                 Order Aggregate                      |
|------------------------------------------------------|
| Order                                                |
| Order Items                                          |
| Notes                                                |
| Modifiers                                            |
| Operational Lifecycle                                |
+------------------------------------------------------+
```

### 6A.2 Boundary rules

1. **Check owns Order Settlement.** `OrderSettlement[]` lives inside the Check aggregate boundary.  
2. **Order Aggregate never owns financial settlement.** No settlement outcome, tender, tax policy, or OS lifecycle authority on Order.  
3. **Order Settlement references Order** by `orderId` (and `restaurantId`) but **does not belong** to the Order Aggregate.  
4. **Membership** and **SettlementTransaction** remain Check-owned; Order Settlement does not absorb either.  
5. Cross-aggregate rule: Check/FSP **may reference** Order; Order **must not** embed Check/OS as write authority.

### 6A.3 Ownership boundaries (explicit)

| Owner | Owns | Does not own |
|-------|------|--------------|
| **Order Aggregate** | Operational lifecycle · Order items · Notes · Modifiers · Customer intent · line/`totalAmount` money | Membership · Check · Order Settlement · Settlement Transactions · tax snapshots · Revenue |
| **Financial Settlement Platform (Check Aggregate)** | Membership · Check · Order Settlement · Settlement Transactions · bill tax/grandTotal/outcome | Order items · Notes · Modifiers · operational FSM · customer intent |

This section **strengthens documentation only**. It does not change ADR-ARCH-020 decisions, Revenue SSOT, Membership authority, or Check ownership.

---

## 7. Invariants

### Inherited (ADR-ARCH-020) — still binding

- I-FIN-01…I-FIN-12 remain in force.  
- Especially: **I-FIN-12** — settlement authority (tenders, tax policy, Check outcome) **MUST NOT** move into the Order aggregate.  
- **I-FIN-01 / I-FIN-02** — Check remains sole Revenue aggregate/formula.

### New Order Settlement invariants

1. **I-OS-01** Order Settlement identity is unique per `(restaurantId, checkId, orderId)`.  
2. **I-OS-02** Order Settlement **MUST NOT** exist without a corresponding Membership row for the same `(checkId, orderId)` at creation time (historical retention after membership deactivate is allowed only under void/cancel rules defined by domain program).  
3. **I-OS-03** `settledAmount + outstandingAmount = orderTotalSnapshot` (money algebra; cancelled/voided terminal rules may zero outstanding without implying collection).  
4. **I-OS-04** `settledAmount` **MUST NEVER** exceed `orderTotalSnapshot`.  
5. **I-OS-05** Sum of active Order Settlement `orderTotalSnapshot` on an open Check **MUST** reconcile to Check orders subtotal before bill discount (within domain-defined rounding policy).  
6. **I-OS-06** An Order has at most one **non-terminal-or-active** Order Settlement path consistent with I-FIN-06 (at most one non-void Check contribution).  
7. **I-OS-07** Terminal Check `paid` ⇒ every active OS on that Check is `settled` (v1 atomic settle).  
8. **I-OS-08** Terminal Check `complimentary` ⇒ every active OS on that Check is `complimentary`.  
9. **I-OS-09** Terminal Check `voided` ⇒ active OS on that Check become `voided`; no new tenders (I-FIN-07).  
10. **I-OS-10** Order Settlement **MUST NOT** redefine Check Revenue or Payment Method Analytics.  
11. **I-OS-11** Order Settlement **MUST** carry `restaurantId` matching Check and Order.  
12. **I-OS-12** Business Identity fields **MUST NOT** key Order Settlement (I-FIN-11).  
13. **I-OS-14** Terminal Order Settlement states (`settled`, `complimentary`, `refunded`, `voided`, `cancelled`) **MUST NOT** transition back to non-terminal states (`pending`, `partially_settled`). Lifecycle regression is architecturally forbidden. Any future exception requires a **new ADR** and explicit Architecture Authority approval.

> **Note:** Identifier **I-OS-13** is reserved / unused in this ADR revision to preserve the review-assigned **I-OS-14** id without renumbering accepted invariants I-OS-01…I-OS-12.

---

## 8. Event model (names only — do not implement here)

| Event | Emitted when |
|-------|----------------|
| `OrderSettlementCreated` | OS opened on enrollment |
| `OrderSettlementRecalculated` | Open-Check amount refresh from Order total change |
| `OrderSettlementPartiallySettled` | Partial coverage applied |
| `OrderSettlementSettled` | Full paid coverage |
| `OrderSettlementComplimentary` | Complimentary coverage |
| `OrderSettlementRefunded` | Refund applied |
| `OrderSettlementVoided` | Void path |
| `OrderSettlementCancelled` | Order cancel closes OS without collection |

**Transport / idempotency:** consumers MUST follow ADR-ARCH-014 + ADR-ARCH-021.  
Enrollment/settlement consumers are **accumulation / state-transition** effects — durable business claim or aggregate-guard patterns as classified in ADR-021.

---

## 9. Projection / read model impact

| Surface | Impact |
|---------|--------|
| Operational DTOs | MAY expose Order Settlement state beside Order identity for Dashboard/Waiter/Counter/Kiosk |
| Presentation DTOs | Display-only; no client-invented formulas (ADR-ARCH-006) |
| Reporting — Revenue | **No change** (Check) |
| Reporting — Order Sales | **No change** (Order Read) |
| Reporting — optional future | “Settled Orders count/amount” MAY read OS — must not be labeled Revenue |
| Payment Method Analytics | Still SettlementTransaction |

---

## 10. Backward compatibility & migration (policy)

1. **Additive** — introduce OS alongside Membership + Check; do not rewrite Revenue.  
2. **Backfill** — for historical paid/comp/void Checks with Membership, create terminal OS rows matching Check outcome.  
3. **Deployment** — expand/contract: ship writers behind dual-write or post-commit sync from Check finalize; cut over readers when backfill proven.  
4. **Zero downtime** — Check settle remains authoritative path; OS sync is co-transactional or immediately consistent within the same Check finalize unit of work in domain program design.  
5. **No compatibility financial layer revival** — do not reintroduce Session-scan money or dual Revenue APIs.

---

## 11. Out of scope

- Schema, migrations, APIs, runtime code (this ADR).  
- Split Check / seat transfer (still needs a future ADR).  
- PSP/gateway integration.  
- ERP Invoice / AR / customer accounts.  
- Moving tenders under Order.  
- Redefining Check Revenue.

---

## 12. Consequences

### Positive

- Named per-Order financial lifecycle for all channels.  
- Preserves ADR-020 Revenue and Membership authority.  
- Enables future partial settle/refund without architectural redesign.  
- Clears `ORDER-SETTLEMENT-DOMAIN-1` to start.

### Costs

- Additional entity synchronized with Membership + Check finalize.  
- Discount/tax allocation rules across multi-Order Checks must be specified carefully in domain program.  
- Discipline required to keep OS from becoming a second Revenue root.

---

## 13. Alternatives considered

| Alternative | Verdict |
|-------------|---------|
| Settle fields on Order root | **Rejected** — I-FIN-12 |
| New SalesSettlement aggregate | **Rejected** — dual monetary SSOT |
| Projection-only OS derived at read time | **Rejected** — insufficient for partial/refund write model |
| Replace Membership with OS | **Rejected** — confuses composition with settlement state |
| Direct Order↔SettlementTransaction | **Rejected** — breaks Check tender invariants |

---

## 14. Implementation roadmap (programs)

| # | Program | Purpose |
|---|---------|---------|
| 0 | **ORDER-SETTLEMENT-ARCHITECTURE-1** | This ADR + ARCHITECTURE.md (current) |
| 1 | **ORDER-SETTLEMENT-DOMAIN-1** | Contracts, invariants code, lifecycle pure functions, architecture guards |
| 2 | **ORDER-SETTLEMENT-PERSISTENCE-1** | Schema + repositories (separate authorization) |
| 3 | **ORDER-SETTLEMENT-INTEGRATION-1** | Enroll/recalc/finalize sync with Membership + Check |
| 4 | **ORDER-SETTLEMENT-BACKFILL-1** | Historical OS rows + validation |
| 5 | **ORDER-SETTLEMENT-CHANNEL-ADOPTION-1** | Channel/UX/API adoption |
| 6 | **ORDER-SETTLEMENT-REPORTING-1** (optional) | Non-Revenue OS metrics if product requires |

---

## 15. Final constitutional statement

**Order Settlement is the Check-owned entity for the financial settlement state of each enrolled Order.  
Check remains the sole bill/Revenue/tender aggregate.  
Membership remains the sole composition authority.  
Order remains the sole operational core and MUST NOT own settlement.  
SettlementTransaction remains under Check.  
Restaurant Revenue mathematics are unchanged.  
Terminal Order Settlement states MUST NOT regress to non-terminal states (I-OS-14).**

This decision governs Order Settlement architecture until Architecture Authority accepts a superseding ADR.

---

**Authority:** Architecture Constitution v1.0 · Architecture Authority  
**Document type:** Constitutional ADR — decision + roadmap (no implementation authorization beyond governance)
