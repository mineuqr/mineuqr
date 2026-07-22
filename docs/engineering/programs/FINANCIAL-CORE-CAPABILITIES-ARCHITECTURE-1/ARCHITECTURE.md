# FINANCIAL-CORE-CAPABILITIES-ARCHITECTURE-1 — Architecture

| Field | Value |
|---|---|
| **Status** | Published |
| **Date** | 2026-07-23 |
| **Revision** | **1.0** |
| **Type** | Architecture Design (no implementation) |
| **Constitutional ADR** | [ADR-ARCH-023](../../../architecture/adrs/ADR-ARCH-023-financial-core-capabilities.md) |
| **Preserves** | [ADR-ARCH-020](../../../architecture/adrs/ADR-ARCH-020-financial-settlement-platform.md) · [ADR-ARCH-021](../../../architecture/adrs/ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md) · [ADR-ARCH-022](../../../architecture/adrs/ADR-ARCH-022-order-settlement-platform.md) |
| **Certified baseline** | Check · Order Settlement · Persistence · Projection · Read API · Presentation |
| **Successors** | SPLIT-PAYMENT-ARCHITECTURE-1 · MULTI-CHECK-ALLOCATION-ARCHITECTURE-1 · OUTSTANDING-BALANCE-ARCHITECTURE-1 · REFUND-PLATFORM-ARCHITECTURE-1 · FINANCIAL-TIMELINE-ARCHITECTURE-1 |

---

## 1. Purpose

Establish the **constitutional financial foundation** for every Phase C platform:

- Split Payments  
- Multi-Check Allocation  
- Refund Platform  
- Outstanding Balance  
- Financial Timeline  

This program publishes **architecture only**:

- No code · No schema · No migrations · No APIs · No projections · No UI · No financial calculations  

---

## 2. Certified baseline (must not be redesigned)

```
Check Aggregate
  → Order Settlement Domain
    → Persistence
      → Projection
        → API
          → Presentation
```

| Platform | Remains |
|----------|---------|
| Check Aggregate | Sole monetary / Revenue / tender mutation root |
| Order Settlement | Check-owned Entity; per-Order settlement SSOT |
| SettlementTransaction | Check-owned tender ledger |
| Membership | Sole Order→Check composition discovery |
| Projection / API / Presentation | Read-only consumers |
| Reporting | Check Revenue + Order Sales dual-metric law |

---

## 3. Shared Financial Language

Each concept: **Definition · Owner · Lifecycle · Consumers · Relationships · Non-goals**.

### 3.1 Payment

| Aspect | Specification |
|--------|---------------|
| **Definition** | A financial capability representing **value received** (or authorized) toward settling Check / Order Settlement obligations. Payment is the business intent; Tender is the recorded instrument line. |
| **Owner** | Financial Settlement Platform / **Check Aggregate** |
| **Lifecycle** | Created → Allocated (partial/full) → Applied → (optional) Partially/fully Refunded → Terminal historical |
| **Consumers** | Allocation · Outstanding Balance · Timeline · Projection · Reporting (payment-method analytics via Tender) · API · Presentation |
| **Relationships** | Owns/authorizes **Payment Allocations**; backed by one or more **Tenders**; reduces **Outstanding Balance** when applied |
| **Non-goals** | Not an Aggregate Root · Not Invoice · Not ERP cash posting · Not Order-owned |

### 3.2 Payment Allocation

| Aspect | Specification |
|--------|---------------|
| **Definition** | Deterministic assignment of a portion of a Payment to a settlement target (Order Settlement and/or Check responsibility slice). |
| **Owner** | Check Aggregate (allocation authority) |
| **Lifecycle** | Created with Payment application → Immutable after commit (corrections via reversing allocation / refund facts) |
| **Consumers** | Outstanding Balance · Order Settlement coverage · Timeline · Projection |
| **Relationships** | Child of Payment; references Settlement Reference / Order Settlement identity |
| **Non-goals** | Must not invent money · Must not bypass Membership for Order targets |

### 3.3 Settlement

| Aspect | Specification |
|--------|---------------|
| **Definition** | The act and resulting state of covering financial obligation — at Check level (`paid` / `complimentary` / `voided`) and at Order Settlement level (`settled` / `partially_settled` / …). |
| **Owner** | Check Aggregate (mutation); Order Settlement Entity (per-Order state) |
| **Lifecycle** | Per ADR-020 / ADR-022 (open → terminal; I-OS-14 forbids terminal→non-terminal regression) |
| **Consumers** | Projection · API · Presentation · Reporting |
| **Relationships** | Settlement uses Payments/Tenders; produces Financial Events |
| **Non-goals** | Settlement authority never moves to Order Aggregate or UI |

### 3.4 Outstanding Balance

| Aspect | Specification |
|--------|---------------|
| **Definition** | Remaining unpaid financial obligation on a Check (and optionally decomposed per Order Settlement). Always ≥ 0. |
| **Owner** | **Check Aggregate** (authoritative outstanding); Order Settlement `outstandingAmount` is the per-Order component |
| **Lifecycle** | Recalculated while Check open per certified money rules; freezes with terminal Check totals |
| **Consumers** | Split Payment UX · Timeline · Projection · API · Presentation |
| **Relationships** | Decreases via applied Payment Allocations; increases only via approved reversing/refund/adjustment facts defined by successor ADRs |
| **Non-goals** | Not UI-computed · Not Projection-owned · Never negative |

### 3.5 Refund

| Aspect | Specification |
|--------|---------------|
| **Definition** | An approved financial operation that returns previously settled/collected value within refundable limits. |
| **Owner** | **Refund Platform** under Financial Settlement Platform / Check Aggregate |
| **Lifecycle** | Requested/Authorized → Allocated → Applied → Terminal (historical) |
| **Consumers** | Refund Allocation · Order Settlement (`refunded` path) · Outstanding (if re-open forbidden — ADR-022: refund is terminal OS state, not reopen) · Timeline · Reporting |
| **Relationships** | References original Settlement/Payment via Refund Reference; never exceeds refundable value |
| **Non-goals** | Not owned by Order · Does not reopen terminal OS to `pending` (I-OS-14) · Not ERP credit memo |

### 3.6 Refund Allocation

| Aspect | Specification |
|--------|---------------|
| **Definition** | Assignment of refunded value to prior Payment Allocations / Order Settlements / Tender instruments. |
| **Owner** | Check Aggregate / Refund Platform |
| **Lifecycle** | Created with Refund application → Immutable after commit |
| **Consumers** | Timeline · Projection · Reporting |
| **Relationships** | Child of Refund; sum ≤ parent Refund |
| **Non-goals** | Must not create net-new collectible value beyond approved reverse facts |

### 3.7 Tender

| Aspect | Specification |
|--------|---------------|
| **Definition** | Recorded payment instrument line under a Check (today: SettlementTransaction). Canonical source for Payment Method Analytics. |
| **Owner** | Check Aggregate (SettlementTransaction child) |
| **Lifecycle** | Created at settle/apply · Historical after Check terminal |
| **Consumers** | Reporting payment-method analytics · Timeline · Projection (as needed) |
| **Relationships** | Realizes Payment; may be target of Tender Allocation / Refund Allocation |
| **Non-goals** | Not Order-owned · Not Revenue formula (Revenue = paid Check grandTotal) |

### 3.8 Tender Allocation

| Aspect | Specification |
|--------|---------------|
| **Definition** | Mapping between Tender value and Payment/Allocation targets when instrument-level decomposition is required (split tenders, multi-method). |
| **Owner** | Check Aggregate |
| **Lifecycle** | Created with tender capture → Immutable after commit |
| **Consumers** | Payment Method Analytics · Timeline |
| **Relationships** | Links Tender ↔ Payment Allocation |
| **Non-goals** | Must not redefine Check Revenue |

### 3.9 Guest Responsibility

| Aspect | Specification |
|--------|---------------|
| **Definition** | Logical share of Check obligation attributed to a guest/seat/party for **allocation UX** (split bill). Not a person financial account. |
| **Owner** | Check Aggregate (responsibility model under FSP) |
| **Lifecycle** | Defined while Check open · Frozen or dissolved at terminal settle |
| **Consumers** | Split Payment · Multi-party UX · Timeline (optional) |
| **Relationships** | May receive Payment Allocations; maps onto Order Settlements / Check slices via Allocation Strategy |
| **Non-goals** | Not CRM wallet · Not house account · Not AR customer ledger |

### 3.10 Check Responsibility

| Aspect | Specification |
|--------|---------------|
| **Definition** | The Check’s total financial obligation (bill) and its settlement duty as Aggregate Root. |
| **Owner** | Check Aggregate |
| **Lifecycle** | Open (mutable money) → Terminal (frozen) |
| **Consumers** | All FSP capabilities · Reporting Revenue |
| **Relationships** | Parent of Membership, Order Settlement, Tender, Payment, Refund, Outstanding |
| **Non-goals** | Not Session-owned |

### 3.11 Financial Event

| Aspect | Specification |
|--------|---------------|
| **Definition** | Domain fact describing a committed financial mutation (Payment applied, OS settled, Refund applied, etc.). |
| **Owner** | Emitting Aggregate/Entity (Check Aggregate / Order Settlement commands) |
| **Lifecycle** | Produced on successful command · Collected for consumers · Never mutated |
| **Consumers** | Projection · Timeline · Idempotency claims (ADR-021) |
| **Relationships** | May yield Timeline Events and Projection updates |
| **Non-goals** | Not a bus design in this program · Not transport envelope |

### 3.12 Financial Timeline Event

| Aspect | Specification |
|--------|---------------|
| **Definition** | Append-only historical record for operational/financial chronology on a Check (and related identities). |
| **Owner** | **Financial Timeline** capability (write append under Check/FSP governance; read via Timeline Projection/API) |
| **Lifecycle** | Appended once · Never edited · Corrections = new reversing events |
| **Consumers** | Timeline API · Presentation · Support tooling |
| **Relationships** | Derived from / correlated to Financial Events |
| **Non-goals** | Not mutation authority · Not Revenue SSOT |

### 3.13 Allocation Strategy

| Aspect | Specification |
|--------|---------------|
| **Definition** | Named policy for distributing Payment/Refund value across targets (e.g. proportional by Order Settlement outstanding, guest share, explicit operator amounts). |
| **Owner** | Check Aggregate (strategy selection + enforcement) |
| **Lifecycle** | Chosen at allocation time · Resulting allocations are facts |
| **Consumers** | Split Payment · Multi-Check Allocation successors |
| **Relationships** | Produces Payment/Refund Allocations |
| **Non-goals** | Strategy must not live in UI as authority · Must not violate Membership |

### 3.14 Settlement Reference

| Aspect | Specification |
|--------|---------------|
| **Definition** | Stable reference to a settlement fact (Check settle outcome and/or Order Settlement identity + revision context). |
| **Owner** | Check Aggregate / Order Settlement |
| **Lifecycle** | Created at settle · Immutable |
| **Consumers** | Refund · Timeline · Projection metadata |
| **Relationships** | Target of Refund Reference |
| **Non-goals** | Not Business Identity |

### 3.15 Refund Reference

| Aspect | Specification |
|--------|---------------|
| **Definition** | Stable reference linking a Refund to the Settlement/Payment facts it reverses. |
| **Owner** | Refund Platform / Check Aggregate |
| **Lifecycle** | Created with Refund · Immutable |
| **Consumers** | Timeline · Reporting · Support |
| **Relationships** | Points to Settlement Reference / Payment identity |
| **Non-goals** | Not a second settlement root |

### 3.16 Financial Identity

| Aspect | Specification |
|--------|---------------|
| **Definition** | Canonical identity types for financial facts (see §6). Always scoped by `restaurantId`. |
| **Owner** | Owning Aggregate/Entity of the identified concept |
| **Lifecycle** | Issued at creation · Never reused for different facts |
| **Consumers** | All FSP write/read models |
| **Relationships** | Compose Settlement/Refund References |
| **Non-goals** | Not Order number · Not Business Identity · Not Session id |

### 3.17 Financial Revision

| Aspect | Specification |
|--------|---------------|
| **Definition** | Deterministic freshness token for a financial write-model state or projection (e.g. Order Settlement `projectionRevision`). No business semantics. |
| **Owner** | Write model owner issues; Projection mirrors |
| **Lifecycle** | Changes when committed state changes |
| **Consumers** | API · Presentation cache validation · Replay safety |
| **Relationships** | Paired with Financial Snapshot |
| **Non-goals** | Not a status · Not Revenue |

### 3.18 Financial Snapshot

| Aspect | Specification |
|--------|---------------|
| **Definition** | Point-in-time frozen view of financial fields (Check tax/currency snapshots; OS money snapshots; settle-time freezes). |
| **Owner** | Check Aggregate / Order Settlement as applicable |
| **Lifecycle** | Captured per freeze policy · Immutable after capture |
| **Consumers** | Reporting · Projection · Timeline |
| **Relationships** | Underpins terminal Settlement |
| **Non-goals** | Snapshots never re-read live Business Settings after freeze |

### 3.19 Financial State

| Aspect | Specification |
|--------|---------------|
| **Definition** | The current committed combination of Check outcome, Order Settlement statuses, Outstanding Balance, and applied Payment/Refund facts. |
| **Owner** | Check Aggregate (authoritative) |
| **Lifecycle** | Evolves only via Aggregate commands |
| **Consumers** | Projection reflects; API exposes; Presentation renders |
| **Relationships** | Superset of Settlement + Outstanding + Payment application |
| **Non-goals** | Not client cache · Not inferred from Session events |

---

## 4. Capability Ownership Matrix

**Rule:** exactly **one** owner per capability. No shared ownership.

| Capability | Sole Owner | Must not own |
|------------|------------|--------------|
| Check bill / tax / grandTotal / outcome | **Check Aggregate** | Order · Session · UI · Projection |
| Membership (Order↔Check composition) | **Check Aggregate** | Order Settlement · Payment |
| Order Settlement state & amounts | **Check Aggregate** (via OS Entity) | Order Aggregate · Projection |
| Tender / SettlementTransaction | **Check Aggregate** | Order · Refund Platform as tender SSOT |
| Payment application | **Check Aggregate** | Presentation · Reporting |
| Payment / Refund Allocation | **Check Aggregate** | UI strategy as authority |
| Outstanding Balance authority | **Check Aggregate** | Projection · API · UI |
| Refund Platform | **Check Aggregate / FSP Refund capability** | Order Aggregate |
| Guest Responsibility model | **Check Aggregate** | CRM · Wallet |
| Financial Timeline (append) | **Financial Timeline capability under FSP** | Projection as writer of truth |
| Order Settlement Projection | **OS Projection platform** (read) | Business rules |
| Order Settlement API | **OS API platform** (read adapter) | Mutations |
| Presentation | **Presentation** (render only) | Money math · lifecycle |
| Reporting (Check Revenue / Order Sales / Payment Method) | **Reporting Platform** (read) | Settlement mutation |
| Operational DTO mapping | **API / Presentation mappers** | Domain invariants |

---

## 5. Aggregate Boundaries

### 5.1 Boundary diagram

```
+------------------------------------------------------------------+
|                    Check Aggregate (FSP Root)                     |
|------------------------------------------------------------------|
| Check (bill, tax, grandTotal, outcome, snapshots)                |
| Membership[]                                                     |
| OrderSettlement[]          ← per-Order settlement SSOT           |
| SettlementTransaction[]    ← Tender ledger                       |
| Payment* / PaymentAllocation*   (Phase C capability)             |
| Refund* / RefundAllocation*     (Phase C capability)             |
| Outstanding Balance authority                                    |
| Guest Responsibility* (allocation model)                         |
+------------------------------------------------------------------+
         │ references orderId                    │ emits
         ▼                                       ▼
+---------------------------+         +---------------------------+
| Order Aggregate           |         | Financial Events          |
| (operational only)        |         | → Timeline (append-only)  |
| items / notes / lifecycle |         | → Projections (read)      |
+---------------------------+         +---------------------------+

* Conceptual Phase C capabilities — detailed in successor architecture programs.
  They remain inside Check Aggregate authority; they are not new Aggregate Roots.
```

### 5.2 Responsibility clarification

| Concern | Owner |
|---------|-------|
| **Mutation** | Check Aggregate commands only |
| **Calculation** (money algebra) | Domain under Check / Order Settlement (write model) |
| **Lifecycle** | Check + Order Settlement (+ Refund capability lifecycle) |
| **Identity issuance** | Owning Aggregate/Entity |
| **Projection** | Projection platforms (read materialization) |
| **Reporting** | Reporting Platform (read metrics) |
| **History** | Financial Timeline (append-only) + terminal write-model retention |

### 5.3 Forbidden overlaps

- Order Aggregate must not own Payment, Refund, Tender, Outstanding, or OS mutation.  
- Projection must not calculate Outstanding or invent Payment.  
- Timeline must not reverse history by edit.  
- Reporting must not settle or refund.  
- Session must not own financial totals discovery.

---

## 6. Financial Identity Specification

All identities are **restaurant-scoped**. Business Identity (day/display/scope) **MUST NOT** key financial identities (I-FIN-11 / I-OS-12).

| Identity | Ownership | Uniqueness | Creation | Relationship rules |
|----------|-----------|------------|----------|--------------------|
| **PaymentId** | Check Aggregate | Unique per restaurant | On Payment create | Parent of Payment Allocations |
| **AllocationId** | Check Aggregate | Unique per restaurant | On allocation create | References PaymentId or RefundId + target Settlement Reference |
| **RefundId** | Refund Platform / Check | Unique per restaurant | On Refund create | References Settlement/Payment via Refund Reference |
| **TimelineEventId** | Financial Timeline | Unique per restaurant (or globally unique opaque id) | On append | Append-only; never reused |
| **BalanceId** | Check Aggregate | Typically 1:1 with Check (or Check+period key defined by OUTSTANDING-BALANCE-ARCHITECTURE-1) | With Check / balance open | Not a second monetary root |
| **SettlementReference** | Check / Order Settlement | Stable reference tuple | At settle | `(restaurantId, checkId[, orderId], settlementRevision)` conceptual |
| **FinancialTransactionId** | Check Aggregate | Unique per restaurant | On applied financial mutation (Payment/Refund/Tender apply) | Correlates Tender + Payment facts; **not** ERP journal id |
| **OrderSettlement identity** | Check / OS | `(restaurantId, checkId, orderId)` | On enrollment | ADR-022 I-OS-01 |
| **Tender / SettlementTransaction id** | Check | Surrogate under Check | On tender insert | Child of Check |

**Financial Revision:** opaque/deterministic token derived from committed write fields (see certified OS `projectionRevision` pattern).  
**Financial Snapshot:** frozen field set at capture time; revision advances when snapshot/state changes.

---

## 7. Financial Lifecycle Specification

### 7.1 Global lifecycle rules

1. **Creation** — only via Check Aggregate commands after authorization/tenant checks.  
2. **Modification** — only while non-terminal and allowed by domain invariants.  
3. **Terminal states** — immutable except through an **approved reversing financial operation** that creates **new facts** (Refund), never by editing history.  
4. **Cancellation / Void** — Check/OS void/cancel paths per ADR-020 / ADR-022; do not reopen terminal OS to unpaid (I-OS-14).  
5. **Refund** — terminal OS path `refunded` (or Check-level refund facts); does not restore `pending`.  
6. **Reconciliation** — operational matching of Tender/Payment facts; does not create a second Revenue root.  
7. **Historical preservation** — terminal rows and Timeline events retained; hard-delete forbidden for financial history.

### 7.2 Phase C capability lifecycle (conceptual)

| Capability | Non-terminal | Terminal | Reversal mechanism |
|------------|--------------|----------|--------------------|
| Payment | authorized / partially allocated | fully applied + closed | Refund (+ Refund Allocation) |
| Allocation | n/a (immutable fact) | committed | Compensating allocation / refund allocation |
| Outstanding | open Check with balance > 0 | zero at full settle / void rules | Only via approved reverse facts |
| Refund | authorized / partial | applied | Further refund limited by refundable remainder |
| Timeline Event | n/a | appended | New correcting event only |

---

## 8. Capability Relationships

### 8.1 Canonical graph

```
Check Responsibility
  ├── Membership → Order
  ├── Order Settlement (per Order)
  │     └── outstandingAmount (component)
  ├── Outstanding Balance (Check authority)
  ├── Tender (SettlementTransaction)
  ├── Payment
  │     └── Payment Allocation → Order Settlement / Guest Responsibility
  ├── Refund
  │     └── Refund Allocation → prior Settlement/Payment/Tender
  └── Financial Events → Financial Timeline (append-only)
                              └── Projections / API / Presentation / Reporting (read)
```

### 8.2 Communication matrix

| From → To | Write allowed? | Read allowed? | Notes |
|-----------|----------------|---------------|-------|
| Check → Order Settlement | **Yes** | Yes | Sole OS mutation path |
| Check → Tender/Payment/Refund | **Yes** | Yes | Sole mutation path |
| Order → Check/OS/Payment | **No** | Reference only | I-FIN-12 |
| Projection → Write Model | **No** | Source committed state | Passive |
| API → Projection store | Read only | Yes | No rebuild commands from API |
| Presentation → API | Read only | Yes | No Domain/Repo/Store |
| Timeline → Write Model | Append facts only | Yes | No edits |
| Reporting → Write Model | **No** | Via certified read paths | Dual-metric law |
| Session → Check money discovery | **No** (post-cutover) | Optional pointer | Session ≠ Finance |

### 8.3 Forbidden communication

- UI inventing Outstanding or Payment.  
- Projection emitting financial commands.  
- Order Aggregate applying Refund/Payment.  
- Multi-Check Allocation without Membership enrollment rules.  
- Cross-restaurant identity references.

---

## 9. Global Financial Invariants

| ID | Invariant | Owner | Validation point | Failure behavior |
|----|-----------|-------|------------------|------------------|
| **I-FC-01** | Financial truth exists once (Check Aggregate write model) | Check Aggregate | Command commit | Reject command |
| **I-FC-02** | Money is never duplicated across Payments/Allocations/Revenue | Check Aggregate | Allocation/settle | Reject; no partial commit |
| **I-FC-03** | Money is never destroyed silently (every decrease has a typed fact: settle/void/refund/cancel) | Check Aggregate | Command | Reject undocumented wipe |
| **I-FC-04** | Sum(Payment Allocations) ≤ Payment amount | Check Aggregate | Allocation apply | Reject overflow |
| **I-FC-05** | Sum(Refund Allocations) ≤ Refund amount ≤ refundable value | Refund Platform / Check | Refund apply | Reject overflow |
| **I-FC-06** | Outstanding Balance ≥ 0 always | Check Aggregate | Recalc / apply | Reject negative |
| **I-FC-07** | Settlement ownership never moves to Order / Session / UI | Architecture Authority | Design review + guards | Program rejection |
| **I-FC-08** | Timeline is append-only | Financial Timeline | Append API/domain | Reject mutate/delete |
| **I-FC-09** | Projection never owns business truth | Projection platforms | Architecture guards | Guard fail |
| **I-FC-10** | Revenue SSOT remains paid Check `grandTotal` | Reporting + Check | Reporting adoption | Forbidden redefinition |
| **I-FC-11** | Tenant isolation on every financial identity | Check Aggregate | Command ingress | Forbidden / reject |
| **I-FC-12** | ADR-021: duplicate financial commands are deterministic (`applied` \| `already_in_state` or equivalent) | Emitting domain | Command handler | No double mutation |
| **I-FC-13** | I-OS-14 preserved: terminal OS must not regress to non-terminal | Order Settlement | OS commands | Domain error |
| **I-FC-14** | Membership remains sole Order↔Check composition discovery | Check Aggregate | Enrollment | Reject dual composition |
| **I-FC-15** | Failed financial transactions commit nothing (atomicity) | Check Aggregate tx boundary | Unit of work | Full rollback |

Inherited **I-FIN-01…12** and **I-OS-01…12, I-OS-14** remain binding.

---

## 10. Event Governance (ADR-ARCH-021 compatible)

| Class | Meaning | Idempotency expectation |
|-------|---------|-------------------------|
| **Financial Domain Events** | Facts from Check/OS/Payment/Refund commands | Business idempotency via command outcomes + claims |
| **Business Events** | Broader ops facts (may correlate) | Per ADR-021 consumer classification |
| **Projection Events/claims** | Read-model apply signals | Deterministic rebuild from committed state preferred; claim keys for duplicates |
| **Timeline Events** | Append-only chronology | Append once per fact key; duplicates no-op |

**Ordering:** consumers must tolerate at-least-once and out-of-order where applicable; authoritative state is Write Model, not event order alone.  
**Replay:** re-applying the same business fact must not inflate money (I-FC-02, I-FC-12).  
**Non-goals of this program:** Event Bus, Outbox, Inbox, broker topology.

---

## 11. Read Model Governance

| Surface | Owns | Must not |
|---------|------|----------|
| **Projection** | Read-optimized reflection + revision | Business rules, mutations, money invention |
| **API** | Auth, validation, DTO mapping | Commands, Domain, Repository bypass of Projection policy |
| **Presentation** | Rendering, formatting, UX states | Settlement decisions, Outstanding invention |
| **Reporting** | Certified metrics (Revenue, Order Sales, Payment Method, future refund/outstanding reports) | Settlement mutation |
| **Operational DTOs** | API-safe shapes | Persistence/Domain leakage |

**Rule:** every Phase C read path follows **Write Model → Projection → API → Presentation** (or Reporting read contracts). No bypass.

---

## 12. Reporting Impact

| Capability | Reportable? | Notes |
|------------|-------------|-------|
| Payments / Tenders | **Yes** | Payment Method Analytics remains Tender/SettlementTransaction-based unless a successor ADR extends |
| Refunds | **Yes** (future) | Read-only refund metrics; not Revenue redefinition |
| Outstanding Balances | **Yes** (future) | Ops/aging style metrics; not Revenue |
| Allocations | **Yes** (future) | Diagnostic/support; careful PII |
| Settlement History / Timeline | **Yes** (future) | Chronology; append-only source |
| Check Revenue | **Unchanged** | Paid Check `grandTotal` |
| Order Sales | **Unchanged** | Order Read |

Reporting remains **read-only**.

---

## 13. Extensibility Guidelines

Future capabilities **MUST** integrate as FSP capabilities under Check authority (or pure read platforms), **without** redesigning certified Check / OS / Projection / API / Presentation:

| Future capability | Integration rule |
|-------------------|------------------|
| Store Credit / Gift Cards / Wallet | New Tender/Payment instrument types under Check; not Order-owned balances as Revenue |
| House Accounts | Responsibility/Payment instrument — still Check-settled; not ERP AR |
| Tips / Service Charge Allocation | Check-level allocation strategy; snapshots; not Order settlement authority |
| Deposits | Pre-payment facts allocatable to later Check; Timeline recorded |
| Invoice Settlement | **Forbidden** as second monetary root unless new ADR explicitly supersedes ADR-020 |
| Partial Refund Reasons | Metadata on Refund facts; does not alter I-FC-05 |
| Chargebacks | Refund/adjustment facts with references; Timeline append |
| Offline Payments | Same Payment/Tender model with capture state; ADR-021 idempotency mandatory |

**Additive evolution only.** Compatibility façades temporary; permanent dual SSOTs forbidden.

---

## 14. Successor program readiness

| Successor | Consumes from this constitution |
|-----------|----------------------------------|
| **SPLIT-PAYMENT-ARCHITECTURE-1** | Payment · Payment Allocation · Tender · Guest Responsibility · Allocation Strategy · Outstanding |
| **MULTI-CHECK-ALLOCATION-ARCHITECTURE-1** | Allocation Strategy · Membership · Settlement Reference · I-FC-14 |
| **OUTSTANDING-BALANCE-ARCHITECTURE-1** | Outstanding Balance · BalanceId · I-FC-06 · Financial State |
| **REFUND-PLATFORM-ARCHITECTURE-1** | Refund · Refund Allocation · Refund Reference · I-FC-05 · I-OS-14 |
| **FINANCIAL-TIMELINE-ARCHITECTURE-1** | Financial/Timeline Events · I-FC-08 · append-only history |

Each successor publishes its own ADR/architecture **without** changing this language’s ownership map unless Architecture Authority accepts a new ADR.

---

## 15. Architecture Decision Report (summary)

| Decision | Verdict |
|----------|---------|
| New monetary Aggregate Roots for Payment/Refund? | **Rejected** — remain Check Aggregate capabilities |
| Outstanding owned by Projection/UI? | **Rejected** — Check Aggregate |
| Timeline as mutable ledger? | **Rejected** — append-only |
| Order-owned Refund? | **Rejected** — I-FIN-12 |
| Redesign certified OS/Projection/API/Presentation? | **Rejected** — additive Phase C only |
| Shared capability ownership? | **Rejected** — single owner matrix |
| Event Bus in this program? | **Out of scope** |
| Implementation/schema in this program? | **Forbidden** |

---

## 16. Success criteria checklist

- [x] Shared financial language defined for Phase C concepts  
- [x] Single ownership per capability  
- [x] Aggregate boundaries without overlap  
- [x] Financial identities specified conceptually  
- [x] Lifecycle + terminal/reversal rules  
- [x] Relationship + communication matrix  
- [x] Global invariants with owner/validation/failure  
- [x] Event / read / reporting governance  
- [x] Extensibility without certified-platform redesign  
- [x] Compatible with ADR-020 / 021 / 022  
- [x] Ready for five Phase C architecture successors  

**Certification statement:**  
*Financial Core Capabilities Architecture is published. Phase C architecture programs may proceed on this constitution without redesigning certified Check, Order Settlement, Projection, API, or Presentation platforms.*
