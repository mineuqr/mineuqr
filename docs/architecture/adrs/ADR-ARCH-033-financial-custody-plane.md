# ADR-ARCH-033: Financial Custody Plane

> [← ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [← ADR-ARCH-021](./ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md) · [← ADR-ARCH-022](./ADR-ARCH-022-order-settlement-platform.md) · [← ADR-ARCH-026](./ADR-ARCH-026-settlement-record-platform.md) · [← ADR-ARCH-028](./ADR-ARCH-028-cash-register-management-platform.md) · [← ADR-ARCH-030](./ADR-ARCH-030-financial-shift-operational-lifecycle.md) · [← ADR-ARCH-032](./ADR-ARCH-032-refund-platform.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | **Accepted** |
| **Owner** | Architecture Authority |
| **Program** | ADR-ARCH-033-FINANCIAL-CUSTODY-PLANE · FINANCIAL-CUSTODY-PLANE-1 · REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 |
| **Date** | 2026-07-27 |
| **Revision** | **1.0** |
| **Supersedes** | — |
| **Refines** | [ADR-ARCH-028](./ADR-ARCH-028-cash-register-management-platform.md) · [ADR-ARCH-030](./ADR-ARCH-030-financial-shift-operational-lifecycle.md) · [ADR-ARCH-032](./ADR-ARCH-032-refund-platform.md) (custody plane governance; Register Refund Settlement named as custody specialization) |
| **Does not modify** | ADR-ARCH-001 · 002 · 003 · 020 · 021 · 022 · 023 · 026 · 027 · 028 · 030 · 032 ownership of Order, Check money, Settlement Record immutability, Refund authority, CRMP aggregate classification, or Reporting financial formulas |
| **Related ADRs** | ADR-ARCH-001 · 002 · 003 · 006 · 014 · 020 · 021 · 022 · 023 · 026 · 027 · 028 · 030 · 031 · 032 |
| **Related programs** | FINANCIAL-CUSTODY-PLANE-1 · REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 · CASH-REGISTER-MANAGEMENT-ARCHITECTURE-1 · REFUND-PLATFORM-ARCHITECTURE-1 · REFUND-REGISTER-ADOPTION-1 |
| **Investigation / design base** | [REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1](../../engineering/programs/REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1/ARCHITECTURE-DECISION.md) — **ARCHITECTURE CERTIFIED** |
| **Implementation status** | **Governance only** — constitutionalizes the Financial Custody Plane. Existing CRMP + Attribution runtime remains under ADR-028/030/032 adoptions. This ADR alone authorizes no new schema, Aggregate Roots, or money ownership. |
| **Numbering note** | Next custody governance ADR after ADR-ARCH-032. **Does not introduce Aggregate Roots.** CRMP Register / Financial Shift remain the sole custody Aggregate Roots (ADR-028). |

---

## 1. Executive Summary

MineuQR constitutionalizes the **Financial Custody Plane** as the permanent architectural boundary that governs **execution, custody, reconciliation, and audit of money movements in the physical / operational world** — without becoming a source of financial truth.

**Core principle (permanent law):**

> **Financial Custody SHALL NEVER become a source of financial truth.**  
> Financial Custody SHALL execute, record, and audit custody operations only.  
> Financial ownership always remains with the canonical financial aggregate (**Check**).

**Constitutional one-liners (permanent law):**

1. **Financial Authority** decides and owns money.  
2. **Financial Custody** executes and accounts for custody of money.  
3. **Financial Documents** publish immutable financial facts.  
4. **Custody never creates, destroys, or recalculates money.**  
5. **Custody executes only approved Financial Documents** (or approved non-document custody ops under CRMP).  
6. **CRMP** remains the sole owner of Register / Financial Shift / Drawer / Settlement Attribution aggregates.  
7. **Financial Custody Plane** is a **governance plane**, not a new Aggregate Root.  
8. **Reporting** consumes Financial Documents for financial KPIs and Custody events for operational KPIs — never duplicated money math.  
9. **Cashier** is an operational role of Staff User — never a domain Aggregate.  
10. **Register Refund Settlement** is a named specialization of this plane (not a second money SSOT).

This ADR **refines** certified custody architecture (ADR-028 / 030 / 032). It **does not redesign** Check, Order, Settlement Record, Refund Platform, Register aggregates, Reporting ownership, or Operational Sessions.

---

## 2. Architecture Rationale

### 2.1 Why this plane is required

Financial ownership is already constitutionalized:

| Concern | Authority | ADR |
|---------|-----------|-----|
| Order Aggregate | Order | ADR-ARCH-001 / 007 |
| Check Aggregate (money) | Check | ADR-ARCH-020 |
| Order Settlement | Check entity | ADR-ARCH-022 |
| Settlement Record | Check-published immutable document | ADR-ARCH-026 |
| Refund Platform | Check capability | ADR-ARCH-032 |
| Settlement Ledger | Unified Financial Entry Point (not authority) | ADR-ARCH-032 |
| Operational Document Identity / RF numbering | Identity plane | ADR-ARCH-027 |
| Register / Shift / Drawer / Attribution | CRMP | ADR-ARCH-028 / 030 |

What remains under-specified as a **named constitutional plane** is the separation between:

- **Financial decision + publication** (Check / Settlement Record / Refund)  
- **Operational cash custody execution** (who held the drawer, which register/shift, expected vs actual, reconciliation)

Without a named Financial Custody Plane:

- Future cash ops (Safe Drop, Bank Deposit, Paid In/Out, Float) risk becoming Register-owned money.  
- Refund Document creation risks being read as “cash already left the drawer.”  
- Operational reporting risks inventing financial totals.  
- Multi-register / multi-cashier accountability lacks a single governance vocabulary.

### 2.2 Why CRMP alone is insufficient as naming

ADR-028 constitutionalized **platform ownership** (CRMP aggregates).  
ADR-030 constitutionalized **lifecycle prerequisites**.  
ADR-032 constitutionalized **Refund money** and stated Register owns custody only.

**ADR-033** constitutionalizes the **plane law**: custody is a distinct authority class from financial ownership, with its own invariants, events, lifecycle, audit, and reporting contract — spanning settlement attribution **and** all present/future drawer operations.

### 2.3 Explicit non-goals

- Introducing new Aggregate Roots  
- Creating Register-owned money or Revenue  
- Duplicating Settlement Record  
- Duplicating Reporting ownership or financial formulas  
- Modifying Order, Check, Refund, Session, or Settlement Record domains  
- Implementing schema, APIs, UI, or migrations under this ADR alone  
- Introducing a Cashier / Employee Aggregate  

---

## 3. Decision

**MineuQR SHALL establish the Financial Custody Plane as the canonical constitutional governance for execution, custody, reconciliation, and audit of cash and related till operations — without becoming financial authority, without owning Financial Documents, and without introducing Aggregate Roots beyond CRMP.**

### 3.1 Mandatory constitutional establishment

| Decision | Constitutional status |
|----------|----------------------|
| Financial Custody Plane exists as named governance plane | **Law** |
| Financial Custody is never financial truth | **Law** |
| Check remains sole monetary Aggregate Root | **Law** (ADR-020 preserved) |
| Settlement Record remains immutable Check-published Financial Document | **Law** (ADR-026 preserved) |
| CRMP remains sole owner of Register / Shift / Drawer / Attribution | **Law** (ADR-028 preserved) |
| No new Aggregate Roots authorized by this ADR | **Law** |
| Custody executes approved Financial Documents only (when document-linked) | **Law** |
| Custody execution is fail-open w.r.t. financial commit | **Law** (ADR-030 / 032 preserved) |
| Operational reporting ≠ financial reporting ownership | **Law** |
| Register Refund Settlement is a custody specialization | **Law** |

### 3.2 Separation of planes (canonical)

```
┌─────────────────────────────────────────────────────────────────┐
│ FINANCIAL AUTHORITY PLANE                                        │
│  Check Aggregate — money decision, budget, settle, refund        │
│  Settlement Record / RF Document — immutable financial facts     │
│  Settlement Ledger — Unified Financial Entry Point (not authority)│
└───────────────────────────────┬─────────────────────────────────┘
                                │ publishes / references
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ FINANCIAL CUSTODY PLANE  ← this ADR                              │
│  Execution · Attribution · Expected Cash · Reconciliation · Audit│
│  Owned operationally by CRMP aggregates (ADR-028 / 030)          │
│  NEVER owns Revenue, Tax, Order totals, or Financial Documents   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Definitions (canonical vocabulary)

| Term | Definition | Owns money? |
|------|------------|-------------|
| **Financial Authority** | The Check Aggregate (and Check-owned FSP capabilities) that decides, authorizes, and finalizes monetary outcomes. | **Yes** (sole) |
| **Financial Custody** | The operational accountability for holding, moving, expecting, counting, and reconciling cash (and correlating financial publications to Register/Shift/Operator). | **No** |
| **Financial Custody Plane** | Constitutional governance plane over Financial Custody operations, events, invariants, audit, and operational reporting contracts. | **No** |
| **Operational Execution** | The act of performing a custody operation (attribution, drawer movement, count, reconcile) under an open Financial Shift with complete operational context. | **No** |
| **Financial Document** | Immutable published financial fact — primarily Settlement Record (including `recordKind=refund` / RF identity). Produced by Check. Referenced by custody; never mutated by custody. | Document is money fact; custody does not own it |
| **Settlement Attribution** | CRMP association correlating a Settlement Record to Register + Financial Shift + Operator (+ cash tender custody delta when applicable). | **No** |
| **Expected Cash** | Shift-scoped custody model of cash that should be in the Drawer, derived from opening float + drawer movements + attributed cash tenders (signed). Never derived from unpaid Orders/Checks. | **No** (custody model) |
| **Cash Drawer** | Logical cash custody container under a Financial Shift (CRMP Entity). | **No** |
| **Register** | Operational financial station Aggregate Root (CRMP). Not Device, not fulfilment Station, not Staff. | **No** |
| **Shift / Financial Shift** | Time-bound accountability Aggregate Root on exactly one Register (CRMP). | **No** |
| **Cashier** | **Operational role label** for the Staff User operating a Financial Shift / performing custody actions. **Not** an Aggregate, bounded context, or money owner. Identity remains User-based (ADR-028 P8 / CR-INV-11). | **No** |
| **Audit** | Immutable append-only record of custody actions with mandatory operational fields (§12). | **No** |

---

## 5. Ownership Matrix

Exactly one constitutional owner per concern.

| Concern | Constitutional owner | Plane |
|---------|----------------------|-------|
| Order placement / kitchen lifecycle | **Order** | Business |
| Dining / Operational Session | **Session / Operational Session Platform** | Business / Ops |
| Money / Revenue / tenders / finalize | **Check** | Financial Authority |
| Order Settlement entity | **Check** | Financial Authority |
| Refund decision / budget / apply | **Check / Refund Platform** | Financial Authority |
| Settlement Record publication | **Check** (producer) | Financial Document |
| Settlement Record / RF Document immutability | **Settlement Record Platform** | Financial Document |
| RF / ST operational document identity | **Operational Document Identity** | Identity |
| Settlement Ledger entry UX | **Presentation / Settlement Ledger** | Entry (not authority) |
| **Settlement Attribution** | **CRMP (Financial Custody Plane)** | Custody |
| **Register identity & duty** | **CRMP Register** | Custody |
| **Financial Shift lifecycle** | **CRMP Financial Shift** | Custody |
| **Cash Drawer / movements / counts / variance** | **CRMP Financial Shift** | Custody |
| **Expected Cash** | **CRMP Financial Shift** | Custody |
| **Cash reconciliation / drawer balance** | **CRMP Financial Shift** | Custody |
| **Operator / Cashier attribution** | **CRMP** (references **User**) | Custody |
| **Custody audit trail** | **CRMP / Audit consumers** | Custody |
| Financial reporting (Gross / Net / Revenue / Tax) | **Reporting** ← Financial Documents | Reporting (financial) |
| Operational custody reporting | **Reporting / CRMP ops reports** ← Custody events + Expected Cash | Reporting (operational) |
| Staff identity | **User (Identity / Access)** | Identity |
| Device / Screen binding | Device / Screen Platform (refs); CRMP may bind Register | Reference |

### Forbidden ownership (STOP conditions)

| Actor | Must NEVER own |
|-------|----------------|
| Register / Drawer / Shift / Custody Plane | Revenue, Refund decision, Settlement decision, Tax, Order totals, Financial Document mutation |
| Settlement Attribution | Settlement Record money fields; refund authorization |
| Settlement Ledger | Money SSOT or custody SSOT |
| Reporting | Write authority over money or custody facts |
| Order / Session | Money or till custody SSOT |
| Cashier (role) | Domain Aggregate status; independent money balances |

---

## 6. Responsibility Matrix

### 6.1 Financial Custody Plane SHALL own

| Responsibility | Meaning |
|----------------|---------|
| Cash execution | Perform custody effects after approved financial commit (or approved non-document drawer ops) |
| Drawer balance / Expected Cash | Maintain shift custody cash model |
| Shift attribution | Bind custody facts to Financial Shift |
| Register attribution | Bind custody facts to Register |
| Cash reconciliation | Count vs Expected; compute variance |
| Operator attribution | Record Staff User who executed custody |
| Audit trail | Immutable custody audit (§12) |
| Operational completion | Custody lifecycle terminal states (EXECUTED / SKIPPED / FAILED / COMPLETED) |
| Fail-open control | Incomplete context → skip/defer — never invent Register/Shift/operator |

### 6.2 Financial Custody Plane SHALL NOT own

| Forbidden | Owner instead |
|-----------|---------------|
| Revenue | Check / Reporting (paid SR law) |
| Refund decision | Check / Refund Platform |
| Settlement decision | Check |
| Tax | Check / Settlement Record / Reporting consumers |
| Order totals | Order / Check |
| Financial balances (guest liability) | Check |
| Financial Documents | Settlement Record Platform (Check-produced) |
| Financial Document identity numbers | Operational Document Identity |
| ERP / GL / AR-AP | Out of platform |

---

## 7. Invariant Catalogue

### 7.1 Financial Custody Plane invariants (FC-INV)

| ID | Invariant |
|----|-----------|
| **FC-INV-01** | **Custody never creates money.** No custody operation may invent guest liability, Revenue, or Settlement totals. |
| **FC-INV-02** | **Custody never destroys money.** No custody operation may erase or reverse a committed Financial Document. Corrections require compensating financial publication + custody follow-up under certified ADRs. |
| **FC-INV-03** | **Custody never recalculates money.** Custody amounts for document-linked ops MUST derive from published Settlement Record / payment snapshot — never from UI invention or Order totals. |
| **FC-INV-04** | **Custody never owns financial identity.** RF/ST/document numbers are identity-only; never keys for custody math authority. |
| **FC-INV-05** | **Custody executes only approved Financial Documents** when the operation is document-linked (settle / refund attribution). Non-document drawer ops (float, paid in/out, safe drop, bank deposit) are CRMP-authorized custody types — still non-monetary SSOT. |
| **FC-INV-06** | **Financial Documents remain immutable.** Custody MUST NOT mutate Settlement Record money, tenders, tax, or totals. |
| **FC-INV-07** | **Custody records remain auditable.** Every custody action produces an immutable audit trail meeting §12 minimum fields. |
| **FC-INV-08** | **Custody execution is idempotent.** At most one successful Settlement Attribution per Settlement Record under active policy (inherits CR-INV-14 / RRS-INV-02). Retries MUST NOT duplicate custody deltas. |
| **FC-INV-09** | **Custody is fail-open w.r.t. financial commit.** Attribution / custody failure MUST NOT roll back Check settle or Refund commit. |
| **FC-INV-10** | **Missing operational context → skip / defer.** System MUST NEVER fabricate Register, Financial Shift, Operator, Device, or Business Day. |
| **FC-INV-11** | **Expected Cash derives only from custody inputs** (float + movements + attributed cash tenders). NEVER from unpaid Orders or open Checks. |
| **FC-INV-12** | **Drawer Variance ≠ financial truth.** Variance MUST NOT redefine Settlement, Refund, Revenue, or Tax. |
| **FC-INV-13** | **No Cashier Aggregate.** Cashier remains Staff User role + Screen permission only. |
| **FC-INV-14** | **No new Aggregate Roots** under this ADR. Custody uses CRMP Register / Financial Shift only. |
| **FC-INV-15** | **Financial Document ≠ physical cash movement.** Publication of settle/refund documents does not by itself prove cash entered or left the drawer; cash impact occurs only when custody successfully executes for a cash tender (or explicit drawer movement). |
| **FC-INV-16** | **Tenant isolation.** Custody facts carry `restaurantId`; cross-restaurant custody forbidden. |
| **FC-INV-17** | **Closed Financial Shift is immutable** for custody membership (corrections via compensating CRMP records / new counts — never silent rewrite). |

### 7.2 Inherited invariants (must remain)

| Family | Source |
|--------|--------|
| I-FIN-* / sole monetary AR | ADR-ARCH-020 |
| I-OS-* / no terminal reopen | ADR-ARCH-022 |
| SR-INV-* / immutability | ADR-ARCH-026 |
| CR-INV-01…14 | ADR-ARCH-028 |
| Shift lifecycle / never invent context | ADR-ARCH-030 |
| RF-LAW-* / RF-INV-REG* / RF-INV-T03 fail-open | ADR-ARCH-032 |
| RRS-INV-01…10 | REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 (ratified herein as custody specialization) |

### 7.3 Register Refund Settlement specialization (RRS)

Register Refund Settlement is the custody lifecycle for a published Refund Document. RRS-INV-01…10 remain binding and are **instances** of FC-INV for refund attribution.

**Affirmed law:** `RF Document ≠ cash left register.`

**Completion event:** successful Register Refund Settlement completes as **`SettlementAttributed`** (no parallel money SSOT event).

---

## 8. Lifecycle Governance

### 8.1 Document-linked custody lifecycle (settle / refund attribution)

```
FINANCIAL_DOCUMENT_PUBLISHED
        │
        ▼
AWAITING_CUSTODY
        │
        ├─► CUSTODY_EXECUTED ──► COMPLETED
        │         (Attribution created / already_applied)
        │
        ├─► CUSTODY_SKIPPED ──► (may retry) ──► AWAITING_CUSTODY
        │         (incomplete Register / Shift / operator context)
        │
        └─► CUSTODY_FAILED ───► (may retry) ──► AWAITING_CUSTODY
                  (create/ops error; financial document remains valid)
```

| State | Financial Document | Custody cash effect |
|-------|--------------------|---------------------|
| FINANCIAL_DOCUMENT_PUBLISHED | Exists | Unchanged |
| AWAITING_CUSTODY | Exists | Unchanged |
| CUSTODY_EXECUTED / COMPLETED | Exists | Updated if cash tender / applicable movement |
| CUSTODY_SKIPPED / FAILED | Exists (still valid) | Unchanged |

### 8.2 Non-document custody lifecycle (drawer operations)

```
REQUESTED → VALIDATED (open Shift + permission) → EXECUTED → AUDITED
                 └─► REJECTED (no invent; no financial rewrite)
```

Applies to: Opening Float, Closing Float, Cash In / Cash Out, Paid In / Paid Out, Drawer Adjustment, Safe Drop, Bank Deposit, and future CRMP-typed movements.

### 8.3 Plane sequencing (canonical)

```
Settlement Ledger (entry)
        → Check Financial Authority (decide + commit)
        → Financial Document publish (immutable)
        → Financial Custody Plane (attribute / execute / reconcile)  [fail-open]
        → Reporting consumes documents + custody events (separate contracts)
```

---

## 9. Event Catalogue

### 9.1 Canonical custody events

| Event | Owner | Meaning | Money SSOT? |
|-------|-------|---------|-------------|
| **SettlementAttributed** | CRMP | Document-linked custody executed (settle or refund SR correlated) | **No** — custody only |
| **CustodyExecuted** | CRMP | Generic successful custody execution (may alias specialized outcomes) | **No** |
| **CustodyFailed** | CRMP / ops façade | Custody attempt failed; financial document unchanged | **No** |
| **CustodySkipped** | CRMP / ops façade | Incomplete context; deferred; financial document unchanged | **No** |
| **CashReconciled** | CRMP | Count vs Expected performed for a Shift | **No** |
| **DrawerBalanced** | CRMP | Variance accepted / shift close custody completion signal | **No** |

### 9.2 Ownership rules

| Rule | Statement |
|------|-----------|
| Financial events | Owned by Check / Settlement Record (e.g. settled, RefundApplied, SR created) |
| Custody events | Owned by CRMP under Financial Custody Plane governance |
| Presentation | MUST NOT emit custody or financial events as authority |
| Parallel SSOT forbidden | Do not invent `RefundSettlementCompleted` as a second completion SSOT; product naming MAY alias `SettlementAttributed` for refund SRs |

### 9.3 Idempotency (ADR-021 compatibility)

| Concern | Rule |
|---------|------|
| Transport | At-least-once delivery consumers MUST be idempotent (ADR-014 / 021) |
| Business | Attribution unique per Settlement Record id (FC-INV-08) |
| Retries | Re-delivery of Attribute* MUST return already_applied without double Expected Cash delta |

---

## 10. Supported Operations

The Financial Custody Plane MUST support present and future operations **without architectural redesign**, by extending CRMP movement types / attribution policies — not by new monetary aggregates.

| Operation | Kind | Financial Document required? | Custody effect |
|-----------|------|------------------------------|----------------|
| Payment settlement attribution | Document-linked | Yes (Paid Settlement Record) | Attribute; Expected Cash ↑ for cash tender |
| Refund settlement attribution | Document-linked | Yes (Refund SR / RF) | Attribute; Expected Cash ↓ for cash tender |
| Cash In | Drawer movement | No | Expected Cash ↑ |
| Cash Out | Drawer movement | No | Expected Cash ↓ |
| Paid In | Drawer movement | No | Expected Cash ↑ |
| Paid Out | Drawer movement | No | Expected Cash ↓ |
| Drawer Adjustment | Drawer movement | No | Policy-typed custody correction (audited) |
| Safe Drop | Drawer movement | No | Expected Cash ↓ (cash to safe) |
| Bank Deposit | Drawer movement | No | Expected Cash ↓ (cash to bank) |
| Opening Float | Drawer movement / VO | No | Initializes Expected Cash |
| Closing Float / Close Count | Count + reconcile | No | Actual vs Expected → Variance |
| Future custody operations | CRMP-typed extension | Per policy | Must obey FC-INV-* |

**Extension rule:** New custody ops add movement types, policies, and events under CRMP — they MUST NOT create Register-owned Revenue or mutate Financial Documents.

---

## 11. Reporting Governance

| Report class | Consumes | Owner of formula |
|--------------|----------|------------------|
| Revenue / Gross / Net / Tax / Settlement analytics | **Financial Documents** (Settlement Records including refund publications) | **Reporting Platform** (financial) |
| Register / Shift / Expected Cash / Variance / movements | **Custody events + CRMP Expected Cash / counts** | **Operational reporting** (custody) |
| Attribution status presentation | Custody outcomes (EXECUTED / SKIPPED / FAILED) | Presentation / ops — fail-open |

### Mandatory reporting laws

| ID | Law |
|----|-----|
| **FC-REP-01** | Financial reporting MUST NOT recalculate money from custody events. |
| **FC-REP-02** | Operational reporting MUST NOT invent Revenue / Net / Tax from Expected Cash or Variance. |
| **FC-REP-03** | No duplicated financial calculations across planes. |
| **FC-REP-04** | Custody KPIs are additive operational reports — never a second financial SSOT. |

---

## 12. Audit Requirements

Every custody action SHALL produce an **immutable audit trail**.

### Minimum fields

| Field | Requirement |
|-------|-------------|
| **Operator** | Staff User id (Cashier role) — never invented |
| **Register** | registerId |
| **Shift** | financialShiftId |
| **Device** | Optional device/screen reference when known |
| **Business Day** | Restaurant business-day context when defined by ops policy |
| **Timestamp** | Action time (attribution / movement / reconcile time) |
| **Operation** | Typed custody operation (attribute settle, attribute refund, paid_in, safe_drop, …) |
| **Reference Document** | settlementRecordId and/or operational document identity when document-linked |
| **Result** | EXECUTED / SKIPPED / FAILED / RECONCILED / … |

Audit facts are append-only. Corrections create new audited custody records — never silent overwrite of prior custody audit.

---

## 13. Multi-Register / Multi-Shift / Multi-Cashier Governance

| Concern | Governance |
|---------|------------|
| Multiple Registers | Restaurant-scoped; each Register hosts at most one active Financial Shift (CR-INV-01) |
| Multiple Shifts | Sequential accountability periods per Register; closed Shifts immutable |
| Multiple Cashiers | Operator User references on Shift + Attribution; no Cashier Aggregate |
| Cross-register execution | **Allowed only** when target Register has an **open** Financial Shift and complete operator context; never invent Shift |
| Cross-restaurant custody | **Forbidden** (FC-INV-16) |
| Document attributed twice | **Forbidden** (FC-INV-08) |
| Future distributed custody | Extensions MUST preserve plane separation (Authority vs Custody), fail-open attribution, and single monetary AR; distribution is operational topology — not a second money model |

---

## 14. Compatibility Analysis

| Artifact | Compatibility verdict | Evidence |
|----------|----------------------|----------|
| **ADR-ARCH-001** (Order Core) | **Compatible** | Custody does not own Order lifecycle or totals |
| **ADR-ARCH-002** (SSOT) | **Compatible** | Money SSOT remains Check; custody is separate non-competing SSOT class |
| **ADR-ARCH-003** (Service Ownership) | **Compatible** | Custody owned by CRMP; financial authority owned by Check; no cross-write of foreign aggregates |
| **ADR-ARCH-021** (Idempotency) | **Compatible** | FC-INV-08 + Attribution uniqueness; transport vs business claims preserved |
| **ADR-ARCH-022** (Order Settlement) | **Compatible** | No reopen; custody post-publication only |
| **Refund Platform (032)** | **Compatible** | Money under Check; custody post-commit AttributeRefund; RF ≠ cash left drawer |
| **Settlement Platform (020/023/026)** | **Compatible** | SR immutable; custody references only |
| **Register Platform (028/030)** | **Compatible** | Plane governs; aggregates unchanged; no new ARs |
| **Reporting Platform** | **Compatible** | Dual consumption contracts (FC-REP-01…04) |
| **Operational Sessions** | **Compatible** | Session ≠ Financial Shift (P12 preserved) |
| **Operational Document Identity (027)** | **Compatible** | Identity-only; FC-INV-04 |
| **REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1** | **Compatible / ratified** | RRS lifecycle + RRS-INV + `SettlementAttributed` completion absorbed as specialization |

**Architecture Impact STOP:** Not triggered — no certified money ownership movement; no new Aggregate Roots; no Settlement Record duplication; no Reporting ownership duplication.

---

## 15. Future Extension Guidelines

| Extension | How to extend without redesign |
|-----------|--------------------------------|
| New drawer movement types | Add CRMP movement type + audit + Expected Cash rule under FC-INV-* |
| Explicit “confirm cash handed out” UX | Presentation + optional custody confirmation step — still CRMP; never re-decide Refund money |
| Multi-register attribution policy UI | Policy on which Register may attribute — still fail-open; never invent context |
| Distributed / edge custody | Same plane law; sync via events; Check remains monetary AR |
| Chargeback / compensation custody | After compensating Financial Document publish → Attribute* under this plane |
| Store credit physical cash effects | Only if a published financial instrument exists; custody never invents credit liability |
| ERP cash posting | Out of platform — consume publications/events; do not reverse plane ownership |

**Forbidden extensions:**

- Register-owned wallet / balance as Revenue  
- Cashier Aggregate  
- Mutating Settlement Records for drawer variance  
- Parallel Refund Settlement monetary Aggregate  

---

## 16. Relationship to Existing Platforms (one-page map)

```
Order / Session                 → business ownership
Settlement Ledger               → financial entry (not authority)
Check / Refund / Settle         → FINANCIAL AUTHORITY
Settlement Record / RF          → FINANCIAL DOCUMENT
CRMP Register / Shift / Drawer  → custody aggregates
Financial Custody Plane         → governance over custody execution (this ADR)
Settlement Attribution          → document-linked custody association
Reporting                       → financial docs + custody events (separate)
```

---

## 17. Consequences

### 17.1 Positive

- Named constitutional boundary ends Authority/Custody ambiguity.  
- Future cash operations fit without new monetary roots.  
- Register Refund Settlement ratified as custody specialization.  
- Reporting dual-contract prevents duplicated money math.  
- Preserves Check / SR / CRMP / Refund certified ownership.

### 17.2 Accepted trade-offs

- Attribution may lag financial commit (operational control gap, not money corruption).  
- Product language must distinguish RF publication from cash-out execution.  
- Multi-register policy remains operational governance, not financial redesign.

### 17.3 Neutral

- “Cashier” remains vocabulary for UX/ops — mapped to Staff User.  
- `CustodyExecuted` may be introduced as telemetry/umbrella without replacing `SettlementAttributed` for document-linked completion.

---

## 18. Alternatives Considered

| Alternative | Rejected because |
|-------------|------------------|
| Make Register a monetary Aggregate Root | Violates ADR-020 sole monetary AR / FC-INV-01…03 |
| Fold custody into Settlement Record | Violates SR immutability / duplicates Reporting inputs |
| Treat Settlement Ledger as custody authority | Ledger is entry workspace only (ADR-032) |
| Introduce Cashier Aggregate | Forbidden by ADR-028 P8 / CR-INV-11 / FC-INV-13 |
| New “Refund Settlement” monetary Aggregate | Dual SSOT; rejected by REGISTER-REFUND-SETTLEMENT design |
| Only document RRS without general plane | Would force redesign for Safe Drop / Float / multi-ops |

---

## 19. Architecture Constitution Update

This ADR is hereby part of the permanent **Architecture Constitution** index via [ADR-Registry.md](../constitution/ADR-Registry.md).

### Constitutional amendments established by ratification

1. **Financial Custody Plane** is a named constitutional governance plane.  
2. **Financial Authority ≠ Financial Custody** is permanent law.  
3. **FC-INV-01…17** are binding custody invariants.  
4. **FC-REP-01…04** govern reporting plane separation.  
5. **Register Refund Settlement** (RRS-INV-01…10 + lifecycle) is ratified as a custody specialization under this plane.  
6. No Aggregate Root inventory change: CRMP Register / Financial Shift remain the only custody Aggregate Roots.

### Binding hierarchy reminder

```
Architecture Constitution
  → ADR-ARCH-020 / 026 / 032 (Financial Authority + Documents)
  → ADR-ARCH-028 / 030 (CRMP aggregates + lifecycle)
  → ADR-ARCH-033 (Financial Custody Plane governance)   ← this ADR
  → Implementation programs
  → Code
```

---

## 20. Successor Programs (not authorized by this ADR alone)

| Program intent | Purpose |
|----------------|---------|
| Custody presentation (Ledger/Detail statuses) | Surface AWAITING / EXECUTED / SKIPPED / FAILED read-only |
| Ops repair / re-attribute | Retry Attribute* when context becomes available |
| Explicit cash-out confirmation UX | Optional custody confirmation — no money re-decision |
| Drawer movement expansion | Safe Drop / Bank Deposit / Paid In-Out production hardening |
| Multi-register attribution policy | Which Registers may execute custody for a document |
| Distributed custody topology | Future edge/sync — preserve plane laws |

---

## 21. Certification

| Criterion | Status |
|-----------|--------|
| Financial Custody Plane named and governed | **Met** |
| Financial ownership remains unique (Check) | **Met** |
| No duplicated money ownership | **Met** |
| No new Aggregate Roots | **Met** |
| No Settlement Record duplication | **Met** |
| No Reporting ownership duplication | **Met** |
| Existing domains unmodified | **Met** |
| Compatible with ADR-001 / 002 / 003 / 021 / 022 | **Met** |
| Compatible with Refund / Settlement / Register / Reporting / Sessions | **Met** |
| Future cash ops extensible without redesign | **Met** |
| RRS specialization ratified | **Met** |
| Production implementation newly authorized by this ADR alone | **No** |

### ADR Verdict

**ADR-ARCH-033 ACCEPTED — Financial Custody Plane constitutionalized.**

---

## Final Certification

**ARCHITECTURE CERTIFIED**
