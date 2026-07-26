# ADR-ARCH-032: Refund Platform Architecture

> [← ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [← ADR-ARCH-021](./ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md) · [← ADR-ARCH-022](./ADR-ARCH-022-order-settlement-platform.md) · [← ADR-ARCH-023](./ADR-ARCH-023-financial-core-capabilities.md) · [← ADR-ARCH-026](./ADR-ARCH-026-settlement-record-platform.md) · [← ADR-ARCH-028](./ADR-ARCH-028-cash-register-management-platform.md) · [← ADR-ARCH-030](./ADR-ARCH-030-financial-shift-operational-lifecycle.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | **Accepted** |
| **Owner** | Architecture Authority |
| **Program** | REFUND-PLATFORM-ARCHITECTURE-1 |
| **Date** | 2026-07-26 |
| **Revision** | **1.0** |
| **Supersedes** | — |
| **Refines** | [ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [ADR-ARCH-021](./ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md) · [ADR-ARCH-022](./ADR-ARCH-022-order-settlement-platform.md) · [ADR-ARCH-023](./ADR-ARCH-023-financial-core-capabilities.md) · [ADR-ARCH-026](./ADR-ARCH-026-settlement-record-platform.md) · [ADR-ARCH-028](./ADR-ARCH-028-cash-register-management-platform.md) · [ADR-ARCH-030](./ADR-ARCH-030-financial-shift-operational-lifecycle.md) |
| **Does not modify** | ADR-ARCH-020 · 022 · 023 · 026 · 028 · 030 ownership of Check money, Order Settlement, Settlement Record immutability, or Register custody (additive Refund constitution only) |
| **Related ADRs** | ADR-ARCH-001 · 002 · 003 · 006 · 014 · 020 · 021 · 022 · 023 · 024 · 025 · 026 · 028 · 030 · 031 |
| **Related programs** | REFUND-PLATFORM-ARCHITECTURE-1 (investigation + this ADR) · FINANCIAL-CORE-CAPABILITIES-ARCHITECTURE-1 · SETTLEMENT-RECORD-PLATFORM-1 · successors listed in §22 |
| **Investigation** | [ARCHITECTURE-INVESTIGATION.md](../../engineering/programs/REFUND-PLATFORM-ARCHITECTURE-1/ARCHITECTURE-INVESTIGATION.md) — verdict **READY FOR ADR** |
| **Implementation status** | **Partial (domain)** — REFUND-DOMAIN-IMPLEMENTATION-1 certified: pure Refund domain + Check Aggregate TX orchestration (OS + compensating SR). No UI / Reporting / Register attribution. |
| **Numbering note** | Next FSP capability ADR after ADR-ARCH-031. **ADR-ARCH-023 remains Financial Core Capabilities** and MUST NOT be reused. |

---

## 1. Executive Summary

MineuQR constitutionalizes the **Refund Platform** as a **Financial Settlement Platform (FSP) capability** owned by the **Check Aggregate**.

**Refund** is the approved financial operation that returns previously settled or collected value within refundable limits, without reopening terminal lifecycles and without mutating published financial history.

**Constitutional one-liners (permanent law):**

1. **Refund Platform** is a Financial Settlement Platform capability.  
2. **Financial Settlement Platform** is owned by the **Check Aggregate**.  
3. **Settlement Ledger** is the **Unified Financial Entry Point** — the operational financial workspace where Settlement, Refund, Receipt, Audit, and future compensation operations begin.  
4. **Settlement Ledger is NOT the financial authority.**  
5. **Check Aggregate** remains the **sole monetary authority**.  
6. **Settlement Record** remains **immutable**.  
7. **Refund publishes compensating Settlement Records** (`recordKind=refund`).  
8. **Register** owns **custody only**.  
9. **Reporting** consumes **immutable financial publications** and never recalculates financial truth.

This ADR **refines** existing certified architecture. It **does not redesign** Check, Register, Settlement Records, Order Settlement, Split Payment, Multi Check Allocation, or Reporting ownership.

---

## 2. Context

### 2.1 Business problem

Restaurants must return guest value after a Check has already been financially finalized — full or partial, single or multiple refunds, across cash and electronic tenders — while preserving operational accountability (who performed the refund, which Register/Shift held custody) and auditability for tax and management reporting.

### 2.2 Financial problem

Without a constitutional Refund Platform:

- Reverse money risks becoming Order-owned, Session-owned, or Register-owned — creating a second financial SSOT.  
- Operators may be tempted to UPDATE Settlement Records or reopen terminal Order Settlement / Check states.  
- Partial and multiple refunds lack a single refundable-budget law.  
- Reporting cannot derive Net Revenue safely from immutable publications.  
- Stub refund verbs across capabilities risk vocabulary collapse and dual workflows.

### 2.3 Current production architecture (certified baseline)

| Concern | Owner | Authority |
|---------|-------|-----------|
| Monetary Aggregate Root / Revenue | **Check** | ADR-ARCH-020 |
| Per-Order settlement state | Order Settlement (Check-owned Entity) | ADR-ARCH-022 |
| Refund named as FSP capability | Financial Core Capabilities | ADR-ARCH-023 |
| Canonical financial publication | Settlement Record (immutable) | ADR-ARCH-026 |
| Tender / payment mix | SettlementTransaction under Check | ADR-ARCH-020 / 023 |
| Incremental Payment | Split Payment (Check capability) | ADR-ARCH-024 |
| Cross-Check responsibility | Multi Check Allocation (Check capability) | ADR-ARCH-025 |
| Custody / Attribution | Register + Financial Shift | ADR-ARCH-028 / 030 |
| Event idempotency | Transport + business claims | ADR-ARCH-014 / 021 |
| Settlement Record permanence | DRAP Permanent class | ADR-ARCH-031 |

Canonical graph:

```
Order / Session          (business ownership — never money)
        │
        ▼
Settlement Ledger        (Unified Financial Entry Point — workspace, not authority)
        │
        ▼
Check Aggregate          (sole monetary authority / FSP root)
  ├── Membership
  ├── SettlementTransaction[]
  ├── Order Settlement[]
  ├── Payment / Allocation capabilities
  ├── Refund Platform capability          ← this ADR
  └── Settlement Record publish (atomic with financial TX)
            │
            ▼
Settlement Attribution → Register + Financial Shift (custody only)
            │
            ▼
Reporting / Analytics / Exports (read consumers)
```

### 2.4 Why Refund is required

ADR-ARCH-023 already mandates Refund as a first-class FSP capability under Check. ADR-ARCH-026 already requires compensating Settlement Records for refunds. ADR-ARCH-022 already defines terminal Order Settlement state `refunded`. Production still lacks a unified Refund constitution covering ownership, budget law, generation law, commands, events, Settlement Ledger entry, Register/Reporting boundaries, and fitness rules.

### 2.5 Why current architecture already supports Refund

Investigation verdict **READY FOR ADR** established:

- Ownership is already assigned (ADR-023).  
- Publication model already exists (ADR-026 compensating `refund` records).  
- Lifecycle reopen is already forbidden (ADR-022 I-OS-14).  
- Dual monetary Aggregate is already forbidden (ADR-020).  
- Register money ownership is already forbidden (ADR-028).  

No redesign of certified platforms is required — only constitutional completion of the Refund capability.

### 2.6 Explicit non-goals of this ADR

- Implementing schema, migrations, repositories, services, APIs, UI, or projections  
- Redesigning Check, Order Settlement, Settlement Record, Register, or Reporting platforms  
- Introducing ERP Invoice / AR-AP / general ledger / journal as monetary authority  
- Authorizing product UX policy beyond architectural façades  
- Replacing void-before-pay paths with Refund (void remains a distinct compensation kind)

---

## 3. Decision

**The Financial Settlement Platform SHALL include Refund Platform as a Check-owned capability that applies reverse value within refundable limits and publishes an append-only compensating Settlement Record — without becoming a second monetary Aggregate Root, without mutating Settlement Record history, and without relocating money ownership to Order, Session, Register, or Reporting.**

### 3.1 Mandatory constitutional establishment

| Decision | Constitutional status |
|----------|----------------------|
| Refund Platform is an FSP capability | **Law** |
| FSP is owned by Check Aggregate | **Law** (ADR-020 preserved) |
| Settlement Ledger is the Unified Financial Entry Point | **Law** (this ADR) |
| Settlement Ledger is NOT the financial authority | **Law** |
| Check Aggregate remains sole monetary authority | **Law** (ADR-020 preserved) |
| Settlement Record remains immutable | **Law** (ADR-026 preserved) |
| Refund publishes compensating Settlement Records | **Law** |
| Register owns custody only | **Law** (ADR-028 preserved) |
| Reporting consumes immutable financial publications | **Law** |

### 3.2 Ownership

| Concern | Owner |
|---------|-------|
| Refund apply / authorize / complete | **Check Aggregate / Refund Platform** |
| Refundable budget derivation | **Check Aggregate / Refund Platform** |
| Refund Allocation | **Check Aggregate / Refund Platform** |
| Compensating Settlement Record production | **Check Aggregate** (Financial Producer) |
| Order Settlement transition to `refunded` | **Check Aggregate** via Order Settlement entity |
| Custody / drawer effect of cash refund | **Register + Financial Shift** (Attribution + drawer rules) |
| Net Revenue presentation | **Reporting** (consumes publications; does not invent money) |

### 3.3 Bounded Context

Refund Platform lives **inside** the Financial Settlement Platform bounded context. It is **not** a new Bounded Context Aggregate Root and **not** a separate Financial Compensation Aggregate.

Future packaging name “Financial Compensation Platform” MAY describe a capability package under FSP/Check. It MUST NOT introduce a second monetary Aggregate Root.

### 3.4 Aggregate Boundary

| Concept | Kind | Boundary |
|---------|------|----------|
| **Check** | Monetary Aggregate Root | Sole mutation authority for Refund application |
| **Refund** | FSP capability under Check | Not Aggregate Root |
| **Refund Allocation** | Check-owned fact under Refund | Immutable after commit |
| **Refund Reference** | Stable link to prior Settlement/Payment facts | Immutable |
| **Settlement Record (`refund`)** | Immutable Financial Document | Produced by Check; not Aggregate Root |
| **Settlement Ledger** | Operational financial workspace / entry point | Not Aggregate Root; not authority |
| **Order Settlement** | Check-owned Entity | May become terminal `refunded` |
| **Register / Financial Shift** | CRMP Aggregate subjects | Custody + Attribution only |

### 3.5 Financial Authority

**Check Aggregate** decides:

- Whether a Refund is allowed  
- Refundable balance  
- Allocation of refunded value  
- Effects on Order Settlement terminal state  
- Check-level outcome facts for full/partial refund generations  
- Atomic production of compensating Settlement Record  

**Settlement Record** publishes.  
**Settlement Ledger** admits the operation.  
**Neither decides money.**

### 3.6 Entry Point

All Refund operations **begin** at the **Settlement Ledger** (Unified Financial Entry Point) and are **executed** as Check Aggregate commands.

Channel façades (Session settle UI, Orders workspace, Counter Pickup cashier, future Refund UI) MAY initiate Refund intents. They MUST NOT own Refund money rules.

### 3.7 Publication Model

Refund financial publication is exclusively:

> An append-only compensating **Settlement Record** with `recordKind=refund`, monotonic `recordGeneration`, required `priorSettlementRecordId`, tenant-scoped `restaurantId`, and money fields **copied** from the Check reverse snapshot (SR-INV-01…10 preserved).

Original Settlement Records are **never** updated for refunds.

### 3.8 Integration Model

| Partner | Integration |
|---------|-------------|
| Order Settlement | Terminal transition to `refunded` where coverage is reversed; never reopen to `pending` / `partially_settled` |
| Split Payment / Tender | Refund Allocation may reverse prior Payment/Tender coverage under Check; stub `refundPayment` MUST collapse into Refund Platform authority |
| Multi Check Allocation | Allocation Reversal redistributes responsibility; it does **not** invent Refunds. Value leaving the restaurant requires Refund Platform |
| Register / Shift | Attribute refund Settlement Record; adjust cash custody when tender is cash; fail-open Attribution pattern preserved (ADR-030) |
| Reporting | Consume settlement + refund publications; derive Net Revenue from immutable facts |
| DRAP | Refund Settlement Records are Permanent (ADR-031) |

---

## 4. Decision Drivers

| Driver | Force |
|--------|-------|
| **Single monetary SSOT** | ADR-020 Zero Dual SSOT; Check remains sole monetary Aggregate Root |
| **Immutable publication** | ADR-026 SR-INV-02; tax/history forever |
| **Terminal lifecycle integrity** | ADR-022 I-OS-14; no reopen |
| **Named Refund ownership** | ADR-023 assigns Refund to FSP/Check; this ADR completes the constitution |
| **Operational accountability** | ADR-028/030 custody without money ownership |
| **Idempotent financial effects** | ADR-021 business claims; no duplicate generations |
| **Tenant isolation** | Every Refund identity and Settlement Record carries `restaurantId` |
| **Investigation verdict** | READY FOR ADR — Alternative A only |

---

## 5. Ownership Matrix

| Concern | Owner | Forbidden owners |
|---------|-------|------------------|
| Bill / grandTotal / Check outcome authority | Check | Order, Session, Settlement Ledger (as authority), Settlement Record, Register, Reporting, UI |
| Tender ledger | SettlementTransaction under Check | Order, Register |
| Per-Order settlement state | Order Settlement under Check | Order Aggregate |
| **Refund apply / refundable limits** | **Check / Refund Platform** | Order, Session, Register, Reporting, UI |
| **Refund publication document** | **Settlement Record (`refund`)** produced by Check | Register rewrite, UI rewrite, Reporting rewrite |
| **Unified Financial Entry Point** | **Settlement Ledger** (workspace) | Settlement Ledger as money owner |
| Custody / till accountability | Register + Financial Shift + Attribution | Check money fields as drawer SSOT |
| Order fulfilment lifecycle | Order | Check |
| Visit lifecycle | Session | Check |
| Reporting KPIs / Net Revenue presentation | Reporting reads publications | Writers inventing nets |
| Event transport ledger | ADR-014 platform | Business claim substitution |

---

## 6. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Business Ownership (non-money)                    │
│   Order (channel / fulfilment)     Session (visit / table / waiter)   │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ intents / façades only
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SETTLEMENT LEDGER — Unified Financial Entry Point                    │
│ Operational financial workspace (NOT monetary authority)             │
│ Begins: Settlement · Refund · Receipt · Audit · Future Compensation  │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ Check commands
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ FINANCIAL SETTLEMENT PLATFORM — Check Aggregate (sole money authority)│
│  Membership · Tender · Order Settlement · Payment · Allocation        │
│  ★ Refund Platform capability                                         │
│       Request → Apply → Allocate → Publish → Attribute → Complete     │
│  Atomic TX: Check/OS/tender facts + Settlement Record (refund)        │
└───────────────┬───────────────────────────────┬──────────────────────┘
                │                               │
                ▼                               ▼
   Settlement Record (immutable)     Register Platform (custody)
   settlement / refund / void / …    Attribution · Drawer · Shift
                │                               │
                └───────────────┬───────────────┘
                                ▼
                     Reporting Platform (read consumer)
                     Net Revenue from immutable publications
```

---

## 7. Financial Flow

```
Settled value (Check finalize)
  → Settlement Record (kind=settlement, generation=N)
  → Attribution (Register/Shift custody)
  → Reporting consumes publication

Refundable budget (derived under Check)
  = Settled collectible value − Sum(prior applied Refunds)
  (never negative; never exceeds settled value)

Refund apply (Check)
  → Refund Allocations (≤ Refund amount ≤ refundable budget)
  → Order Settlement → refunded (terminal; I-OS-14)
  → Settlement Record (kind=refund, generation=N+k, prior=SR_N…)
  → Attribution of refund document (custody)
  → Reporting consumes compensating publication
```

**Revenue law preserved:** Revenue remains defined by paid Check / Settlement publication rules (ADR-020 / 026). Tender sums and Refund sums are never Revenue. Net Revenue is a Reporting derivation over immutable publications.

---

## 8. Refund Flow

```
1. Preconditions
   - Prior financial finalization exists (paid|complimentary Settlement Record generation)
   - Refundable budget > 0 for requested scope
   - Tenant scope valid (restaurantId)

2. RequestRefund
   - Intent captured under Check / Refund Platform
   - Does not publish Settlement Record alone

3. ApplyRefund  (Check command — monetary authority)
   - Enforce Refund Budget Law
   - Create Refund Allocations
   - Transition affected Order Settlement(s) to terminal refunded where required
   - Update Check reverse facts under Check authority (never reopen Check to open unpaid)

4. PublishRefundSettlementRecord  (same financial TX)
   - Append Settlement Record recordKind=refund
   - priorSettlementRecordId required
   - recordGeneration monotonic
   - money copied from Check snapshot (SR-INV-01)

5. AttributeRefund  (CRMP adoption)
   - Correlate refund Settlement Record → Register + Financial Shift + Staff
   - Cash custody effects when tender is cash
   - Fail-open if Attribution context absent (ADR-030)

6. CompleteRefund
   - Terminal historical Refund fact
   - Further refunds limited by remaining refundable budget
```

Void-before-pay remains **`recordKind=void`** / Check void — **not** Refund.

---

## 9. Settlement Ledger Flow

```
Operator / Channel façade
        │
        ▼
Settlement Ledger (entry)
  ├── Settlement operation      → Check finalize → SR(settlement)
  ├── Refund operation          → Check Refund apply → SR(refund)
  ├── Receipt / Audit read      → consume Settlement Records
  ├── Future Reversal           → Check compensation → SR(reversal)
  ├── Future Chargeback         → Check compensation → SR(… typed)
  └── Future Adjustment         → Check compensation → SR(correction|adjustment)
        │
        ▼
Check Aggregate executes & decides money
        │
        ▼
Immutable Settlement Record publication
        │
        ▼
Register Attribution (custody) + Reporting consumption
```

**Settlement Ledger never owns money.** It is the named operational workspace that prevents financial operations from beginning inside Order, Session, Register, or Reporting.

**Compatibility with ADR-020 “No ledger”:** ADR-020 forbids ERP general ledger / journal / AR-AP as a second financial model. Settlement Ledger is **not** an accounting ledger. It is the **Unified Financial Entry Point** of FSP operations.

---

## 10. Architectural Principles

| # | Principle | Meaning |
|---|-----------|---------|
| P1 | **Check is sole financial authority** | Only Check mutates money, refundable budget, and Refund application |
| P2 | **Settlement Ledger is operational entry point** | All financial operations begin here; Ledger does not decide money |
| P3 | **Settlement Record is immutable** | No UPDATE of money fields; corrections = compensating records |
| P4 | **Refund never mutates financial history** | Original settlement publications remain forever |
| P5 | **Refund always creates compensating publication** | `recordKind=refund` with `priorSettlementRecordId` |
| P6 | **Register never owns money** | Custody, drawer, shift, attribution only |
| P7 | **Reporting never recalculates financial truth** | Reads publications; Check remains authority |
| P8 | **Zero Dual SSOT** | No second monetary Aggregate; no Order/Session/Register Refund SSOT |
| P9 | **Terminal lifecycles do not reopen** | I-OS-14; Check does not return to unpaid open via Refund |
| P10 | **Tenant isolation** | Every Refund identity and publication carries `restaurantId` |
| P11 | **Business ownership ≠ financial production** | Order/Session own ops; Check produces finance |
| P12 | **Idempotent financial generations** | Retries never duplicate Refund publication |

---

## 11. Architectural Laws

| Law ID | Law |
|--------|-----|
| **RF-LAW-01** | Refund Platform SHALL be an FSP capability under Check Aggregate. |
| **RF-LAW-02** | Settlement Ledger SHALL be the Unified Financial Entry Point for Settlement, Refund, Receipt, Audit, and future compensation operations. |
| **RF-LAW-03** | Settlement Ledger SHALL NOT be monetary authority, Aggregate Root, Revenue SSOT, or ERP ledger. |
| **RF-LAW-04** | Check Aggregate SHALL remain sole monetary authority for Refund application. |
| **RF-LAW-05** | Settlement Record SHALL remain immutable; Refund SHALL publish compensating records only. |
| **RF-LAW-06** | Refund SHALL NOT occur before financial finalization of the value being reversed. |
| **RF-LAW-07** | Refund SHALL NOT reopen Order Settlement to non-terminal states (I-OS-14). |
| **RF-LAW-08** | Refund SHALL NOT reopen Check from terminal paid/complimentary into unpaid open. |
| **RF-LAW-09** | Register SHALL NOT own Refund money, Revenue, Settlement, or financial truth. |
| **RF-LAW-10** | Reporting SHALL consume immutable Settlement publications and SHALL NOT invent Refund nets. |
| **RF-LAW-11** | Order Aggregate and Session Aggregate SHALL NOT own Refund. |
| **RF-LAW-12** | Successor programs MUST cite this ADR and MUST NOT redefine RF-INV / RF-LAW without a new ADR. |

---

## 12. Refund Invariants

### 12.1 Financial

| ID | Invariant |
|----|-----------|
| **RF-INV-F01** | Refund amount MUST be > 0 and denominated in the Check currency snapshot. |
| **RF-INV-F02** | Sum(Refund Allocations) ≤ Refund amount ≤ refundable budget (inherits I-FC-05). |
| **RF-INV-F03** | Refund MUST NEVER invent collectible value beyond approved reverse facts. |
| **RF-INV-F04** | Refund MUST NEVER redefine Revenue as tender sum or refund sum. |
| **RF-INV-F05** | Money decreases for Refund MUST be typed facts (I-FC-03) — never silent wipe. |

### 12.2 Lifecycle

| ID | Invariant |
|----|-----------|
| **RF-INV-L01** | Refund requires a prior finalized settlement generation for the reversed value. |
| **RF-INV-L02** | Order Settlement MAY transition `settled\|complimentary → refunded`; MUST NOT regress to `pending` / `partially_settled`. |
| **RF-INV-L03** | Closed Session MUST NOT be reopened to enable Refund. |
| **RF-INV-L04** | Operational Order fulfilment lifecycle MUST NOT be reopened to enable Refund. |
| **RF-INV-L05** | Complimentary coverage MAY refund to terminal `refunded` under the same laws as paid coverage. |

### 12.3 Publication

| ID | Invariant |
|----|-----------|
| **RF-INV-P01** | Every applied Refund generation that finalizes reverse value MUST publish Settlement Record `recordKind=refund`. |
| **RF-INV-P02** | Compensating refund Settlement Record MUST include `priorSettlementRecordId`. |
| **RF-INV-P03** | Refund Settlement Record money fields MUST be copied from Check reverse snapshot (SR-INV-01). |
| **RF-INV-P04** | Original Settlement Record MUST remain byte-stable for money fields after Refund. |
| **RF-INV-P05** | Refund Settlement Records are Permanent (ADR-031); ordinary retention MUST NOT purge them. |

### 12.4 Generation

| ID | Invariant |
|----|-----------|
| **RF-INV-G01** | `recordGeneration` is monotonic per Check settlement/compensation chain. |
| **RF-INV-G02** | A generation MUST NOT repeat for a distinct financial effect. |
| **RF-INV-G03** | A committed generation MUST NOT disappear. |
| **RF-INV-G04** | Exactly one Settlement Record per finalized Refund generation (SR-INV-05). |

### 12.5 Idempotency

| ID | Invariant |
|----|-----------|
| **RF-INV-I01** | Refund apply MUST be ADR-021 business-idempotent (`applied` \| `already_applied` or equivalent). |
| **RF-INV-I02** | Retry MUST NOT create a second Refund Settlement Record for the same generation. |
| **RF-INV-I03** | Transport ledger alone is insufficient; Refund is accumulating financial effect (Pattern B/D/E class). |
| **RF-INV-I04** | Business key SHALL include tenant + Check + recordKind + recordGeneration (or equivalent unique Refund generation identity). |

### 12.6 Transaction

| ID | Invariant |
|----|-----------|
| **RF-INV-T01** | Check reverse facts, Order Settlement transitions, Refund Allocations, and refund Settlement Record publish MUST commit in one financial transaction. |
| **RF-INV-T02** | Failed Refund transactions commit nothing (I-FC-15). |
| **RF-INV-T03** | Attribution MAY fail-open after successful financial commit (ADR-030); financial truth MUST NOT depend on Attribution success. |

### 12.7 Tenant Isolation

| ID | Invariant |
|----|-----------|
| **RF-INV-TEN01** | Every Refund identity MUST carry `restaurantId`. |
| **RF-INV-TEN02** | `priorSettlementRecordId` MUST resolve inside the same tenant. |
| **RF-INV-TEN03** | Cross-tenant Refund correlation is forbidden. |

### 12.8 Reporting

| ID | Invariant |
|----|-----------|
| **RF-INV-R01** | Reporting MUST NOT mutate Refund or Settlement Records. |
| **RF-INV-R02** | Net Revenue MUST derive from immutable Settlement publications (settlement + compensating refund generations) under Reporting adoption rules. |
| **RF-INV-R03** | Reporting MUST NOT invent a second Refund SSOT. |

### 12.9 Register

| ID | Invariant |
|----|-----------|
| **RF-INV-REG01** | Register MUST NOT authorize or apply Refund money rules. |
| **RF-INV-REG02** | Register MAY attribute refund Settlement Records and adjust cash custody for cash refunds. |
| **RF-INV-REG03** | Drawer variance MUST NOT redefine guest Refund financial truth. |

---

## 13. Refund Budget Law

| Law ID | Statement |
|--------|-----------|
| **RF-BUDGET-01** | Refunds MUST NEVER exceed settled value for the refund scope. |
| **RF-BUDGET-02** | Refundable balance MUST always be derivable from committed Check write facts + prior Refund facts (never UI-invented). |
| **RF-BUDGET-03** | Partial refunds MUST preserve financial consistency (allocations ≤ refund ≤ remaining budget). |
| **RF-BUDGET-04** | Multiple refunds MUST preserve invariants; each reduces remaining refundable budget. |
| **RF-BUDGET-05** | Refundable budget MUST be ≥ 0 at all times. |
| **RF-BUDGET-06** | Refund scope MAY be Check-level and/or Order Settlement / Tender targets via Refund Allocation — still under Check authority. |
| **RF-BUDGET-07** | Split Payment / Allocation stubs MUST NOT maintain a parallel refundable budget SSOT. |

Conceptual conservation (architecture only):

```
RefundableBudget(scope) =
  SettledCollectibleValue(scope) − Sum(AppliedRefunds(scope))
```

Exact algebraic formulas are domain-program detail; this law is constitutional.

---

## 14. Generation Law

| Law ID | Statement |
|--------|-----------|
| **RF-GEN-01** | Generation is monotonic within the Check settlement/compensation chain. |
| **RF-GEN-02** | Generation cannot repeat for a new financial effect. |
| **RF-GEN-03** | Generation cannot disappear after commit. |
| **RF-GEN-04** | Retry must never duplicate financial publication for the same generation. |
| **RF-GEN-05** | Settlement Record uniqueness for Refund is one document per finalized Refund generation. |
| **RF-GEN-06** | Compensating refund generations MUST link to a prior published generation via `priorSettlementRecordId`. |

---

## 15. Domain Commands

Domain commands only — no API, schema, or implementation.

| Command | Responsibility |
|---------|----------------|
| **RequestRefund** | Capture approved Refund intent under Check / Refund Platform (amount, scope, reason metadata, actor). Does not alone publish Settlement Record. |
| **ApplyRefund** | Check Aggregate applies reverse value: enforce Budget Law, create Refund Allocations, mutate Check/OS reverse facts. Sole monetary apply command. |
| **PublishRefundSettlementRecord** | Produce immutable compensating Settlement Record in the same financial TX as ApplyRefund finalization. Not a public client “create money” command. |
| **AttributeRefund** | Correlate published refund Settlement Record to Register + Financial Shift + Staff; apply cash custody effects when required. CRMP-owned attribution adoption under fail-open rules. |
| **CompleteRefund** | Mark Refund lifecycle terminal/historical for the applied generation; remaining budget governs further Requests. |

Command ownership:

- **RequestRefund / ApplyRefund / PublishRefundSettlementRecord / CompleteRefund** → Check Aggregate / Refund Platform  
- **AttributeRefund** → CRMP adoption referencing Check-published Settlement Record  

Forbidden command owners: Order Aggregate, Session Aggregate, Register as money authority, Reporting, UI.

---

## 16. Domain Events

### 16.1 Official events

| Event | Publisher | Meaning |
|-------|-----------|---------|
| `RefundRequested` | Check / Refund Platform | Intent accepted; not yet financial finalization |
| `RefundApplied` | Check / Refund Platform | Reverse value applied in write model |
| `RefundAllocationCreated` | Check / Refund Platform | Allocation fact committed |
| `SettlementRecordCreated` (refund generation) | Check Aggregate | Compensating document published (`recordKind=refund`) |
| `SettlementRecordRefunded` | Check Aggregate | Optional semantic alias / companion fact for refund publication (ADR-026 future compensating events) |
| `RefundAttributed` | CRMP (after financial commit) | Custody correlation recorded |
| `RefundCompleted` | Check / Refund Platform | Refund generation terminal |
| `OrderSettlementRefunded` | Check / Order Settlement | OS entered terminal `refunded` (ADR-022) |

### 16.2 Ordering

1. Financial write facts (`RefundApplied`, allocations, OS refunded) are ordered with the Check financial transaction commit.  
2. Settlement Record refund publication is co-committed (SR-INV-04 analog for refund finalize).  
3. Attribution events MAY follow and MUST tolerate absence (fail-open).  
4. Consumers MUST tolerate at-least-once delivery; authoritative state is Check write model.

### 16.3 Ownership

Only Check Aggregate (and CRMP for Attribution facts) may publish the events above. Projection/UI MUST NOT emit financial Refund commands or events as authority.

### 16.4 Publication

Settlement Record remains the Canonical Financial Document for Reporting/export consumers. Domain events support integration, claims, and timeline — they do not replace Settlement Record publication.

### 16.5 Idempotency (ADR-021 compatibility)

| Concern | Rule |
|---------|------|
| Transport | ADR-014 ledger mandatory for consumers |
| Business | Refund apply / publish MUST use durable business claim on Refund generation identity |
| Outcome | Deterministic `applied` \| `already_applied` (I-FC-12) |
| Replay | Re-applying same generation MUST NOT inflate refunded value or duplicate SR |

### 16.6 Transaction boundaries

| Boundary | Includes | Excludes |
|----------|----------|----------|
| **Financial TX** | ApplyRefund facts · Refund Allocations · OS `refunded` · PublishRefundSettlementRecord | Attribution success, notifications, printing, Reporting rebuild |
| **Attribution TX** | AttributeRefund / custody movements | Re-deciding Refund money |
| **Reporting** | Read after commit | Write of financial truth |

---

## 17. Settlement Ledger (official definition)

**Settlement Ledger** is the **operational financial workspace** of the Financial Settlement Platform and the **Unified Financial Entry Point** for MineuQR financial operations.

### 17.1 What begins at Settlement Ledger

| Operation | Begins at Settlement Ledger? | Executes under |
|-----------|------------------------------|----------------|
| Settlement | Yes | Check Aggregate |
| Refund | Yes | Check Aggregate / Refund Platform |
| Receipt | Yes (read/publish consumption path) | Settlement Record publication |
| Audit | Yes (read path) | Immutable publications |
| Future Reversal | Yes | Check Aggregate compensation |
| Future Chargeback | Yes | Check Aggregate compensation |
| Future Adjustment | Yes | Check Aggregate compensation |
| Future Store Credit issuance (financial effect) | Yes | Check Aggregate / approved FSP capability |

### 17.2 What Settlement Ledger never is

- Monetary Aggregate Root  
- Revenue SSOT  
- Settlement Record mutator  
- ERP general ledger / journal / AR-AP  
- Register drawer  
- Reporting calculator of financial truth  

### 17.3 Relationship summary

| Layer | Role |
|-------|------|
| Settlement Ledger | Entry / workspace |
| Check Aggregate | Authority |
| Settlement Record | Publication |
| Register | Custody |
| Reporting | Consumption |

---

## 18. Register Platform Rules

### 18.1 Register owns only

- Custody  
- Cash Drawer  
- Financial Shift  
- Attribution  

### 18.2 Explicitly forbidden

| Forbidden | Reason |
|-----------|--------|
| Register-owned Refund | Violates RF-LAW-09 / ADR-028 |
| Register-owned Revenue | Violates ADR-020 |
| Register-owned Settlement | Violates ADR-020 / 026 |
| Register-owned Financial Truth | Violates Zero Dual SSOT |

### 18.3 Allowed Register behaviors for Refund

- Attribute refund Settlement Record to Register + Shift + Staff  
- Decrease expected cash custody when cash is returned  
- Surface Refund tender totals in Shift operational summaries as **custody/tender presentation**, not Revenue authority  

---

## 19. Reporting Platform Rules

| Rule ID | Rule |
|---------|------|
| **RF-REP-01** | Reporting consumes immutable financial publications (Settlement Records including `refund` generations). |
| **RF-REP-02** | Reporting never becomes financial authority. |
| **RF-REP-03** | Net Revenue derives from Settlement publications under Reporting adoption programs — not from UI math. |
| **RF-REP-04** | Revenue law (paid Check / publication freeze) remains intact; Refund generations adjust nets without redefining Revenue ownership. |
| **RF-REP-05** | Dual-run → parity → cutover is mandatory when Reporting formulas change to include refund generations. |
| **RF-REP-06** | Order Sales (Order Read) remains dual-metric peer; Refund does not move Order Sales ownership. |

---

## 20. Architecture Fitness Rules

Mandatory. Violations are Architecture Impact STOP conditions for implementation programs.

| Fitness Rule | Statement |
|--------------|-----------|
| **RF-FIT-01** | No second Financial SSOT. |
| **RF-FIT-02** | No Settlement Record mutation for Refund. |
| **RF-FIT-03** | No Refund outside Financial Settlement Platform. |
| **RF-FIT-04** | No Refund from Order Aggregate. |
| **RF-FIT-05** | No Refund from Session Aggregate. |
| **RF-FIT-06** | No Refund from Register as money owner. |
| **RF-FIT-07** | No Aggregate violation (Refund is capability, not new monetary Aggregate Root). |
| **RF-FIT-08** | No lifecycle reopening (OS/Check/Session/Order) to enable Refund. |
| **RF-FIT-09** | No Refund before prior settlement finalization of reversed value. |
| **RF-FIT-10** | No parallel refundable budget outside Check / Refund Platform. |
| **RF-FIT-11** | No Reporting-invented Refund nets as write authority. |
| **RF-FIT-12** | No Settlement Ledger authority creep into money decisions. |
| **RF-FIT-13** | No bypass of ADR-021 business idempotency on Refund generations. |
| **RF-FIT-14** | No purge of refund Settlement Records under ordinary retention. |

---

## 21. Consequences

### 21.1 Positive consequences

- Unified Refund ownership ends stub-verb vocabulary collapse.  
- Immutable history preserved via compensating Settlement Records.  
- Register accountability preserved without Register money ownership.  
- Reporting gains a clean publication path for Net Revenue.  
- Settlement Ledger clarifies where financial operations begin without ERP creep.  
- Certified platforms (Check, OS, SR, CRMP) remain intact.

### 21.2 Accepted trade-offs

- Refund orchestration complexity concentrates in Check / Refund Platform (correct Aggregate).  
- Partial/multiple refund algebra must be designed carefully in domain successors.  
- Reporting adoption requires dual-run discipline when nets change.  
- Operators cannot “edit” a past receipt — they must issue compensating publications.

### 21.3 Future scalability

Architecture supports multi-tender reverse, multi-channel façades, complimentary refunds, and shift-attributed cash returns without new monetary roots.

### 21.4 Future Financial Compensation Platform readiness

Chargeback, payment reversal, financial adjustment, and store credit can extend the **same** pattern:

> Settlement Ledger entry → Check authority → compensating Settlement Record publication → Register custody (when needed) → Reporting consumption  

A future named “Financial Compensation Platform” is a **capability package under FSP/Check**, not a second Aggregate Root.

---

## 22. Future Extension Points

| Extension | How architecture supports it without redesign |
|-----------|-----------------------------------------------|
| **Partial Refund** | Refund Budget Law + Refund Allocations; OS may remain settled for untouched coverage or move to `refunded` per domain legality under I-OS-14 |
| **Multiple Refund** | Monotonic generations; remaining budget after each apply |
| **Split Refund** | Refund Allocations across Order Settlements / Tender instruments under Check |
| **Chargeback** | Typed compensating Settlement Record + Check compensation facts; same Ledger entry |
| **Payment Reversal** | Compensating publication linked to prior Payment/Settlement Reference |
| **Financial Adjustment** | `correction` / adjustment record kinds already reserved by ADR-026 |
| **Store Credit** | Future FSP instrument under Check; published as compensating/credit facts — not Order-owned wallet Aggregate |

---

## 23. Successor Programs

Recommended after this ADR (Architecture Authority sequencing required; this ADR alone authorizes none):

| Program | Purpose |
|---------|---------|
| **REFUND-DOMAIN-IMPLEMENTATION-1** | Pure domain model: commands, invariants, refundable budget derivation, Refund Reference/Allocation — no persistence/API unless sequenced |
| **REFUND-SETTLEMENT-RECORD-ADOPTION-1** | Atomic compensating Settlement Record publish on Refund apply; collapse stub refund publishers |
| **REFUND-REGISTER-ADOPTION-1** | AttributeRefund + cash custody effects under ADR-028/030 fail-open |
| **REFUND-REPORTING-ADOPTION-1** | Dual-run / parity / cutover for Net Revenue and refund metrics from Settlement publications |
| **REFUND-PRESENTATION-ADOPTION-1** | Operator façades via Settlement Ledger entry — presentation only |

Optional later (only if justified by product demand):

| Program | Purpose |
|---------|---------|
| FINANCIAL-COMPENSATION-PLATFORM-1 | Package Chargeback / Reversal / Adjustment under same laws |
| FINANCIAL-TIMELINE-ARCHITECTURE-1 | Append-only chronology including Refund facts (ADR-023 successor) |

---

## 24. Alternatives considered

| Alternative | Verdict | Why |
|-------------|---------|-----|
| A. Refund as FSP capability under Check + compensating SR | **Accepted** | Matches ADR-023/022/026; investigation Alternative A |
| B. Refund owned by Settlement Record | **Rejected** | SR is publication, not authority (SR-INV-01/03) |
| C. Refund owned by Register | **Rejected** | Custody ≠ money (ADR-028) |
| D. New monetary Compensation Aggregate Root | **Rejected** | Dual SSOT / ERP creep (ADR-020 R5) |
| E. Refund owned by Order Aggregate | **Rejected** | I-FIN-12 / ADR-023 R2 |
| F. Mutate original Settlement Record in place | **Rejected** | SR-INV-02 / ADR-026 R7 |
| G. Settlement Ledger as monetary authority | **Rejected** | Violates RF-LAW-03 / ADR-020 |

---

## 25. Compatibility

This ADR is fully compatible with:

- ADR-ARCH-020 (Check sole monetary root; “No ERP ledger” preserved — Settlement Ledger ≠ accounting ledger)  
- ADR-ARCH-021 / 014 (transport + business idempotency)  
- ADR-ARCH-022 (terminal `refunded`; I-OS-14)  
- ADR-ARCH-023 (Refund under FSP/Check; I-FC-05)  
- ADR-ARCH-024 / 025 (Payment/Allocation remain Check capabilities; Refund unified authority)  
- ADR-ARCH-026 (compensating Settlement Records)  
- ADR-ARCH-028 / 030 (custody + Attribution fail-open)  
- ADR-ARCH-031 (Settlement Records Permanent)

Any conflict is resolved in favor of ADR-020 / 022 / 026 money and immutability rules unless Architecture Authority issues a superseding ADR.

---

## 26. Official glossary

| Term | Definition |
|------|------------|
| **Refund** | Approved FSP operation that returns previously settled/collected value within refundable limits. |
| **Refund Platform** | Check-owned FSP capability governing Refund commands, budget, allocations, and completion. |
| **Refund Allocation** | Assignment of refunded value to prior Payment / Order Settlement / Tender targets. |
| **Refund Reference** | Immutable link from a Refund to the Settlement/Payment facts it reverses. |
| **Refundable Budget** | Derivable remaining value that may still be refunded for a scope under Check authority. |
| **Settlement Ledger** | Unified Financial Entry Point / operational financial workspace of FSP. Not monetary authority. Not ERP ledger. |
| **Settlement Record** | Immutable Canonical Financial Document published by Check. |
| **Compensating Settlement Record** | Append-only Settlement Record (`refund` / `void` / `reversal` / `correction`) linked to a prior record. |
| **Financial Authority** | Check Aggregate. |
| **Financial Publication** | Act of producing Settlement Records for consumption. |
| **Custody** | Register/Shift accountability for cash and attributed settlements — not guest financial truth. |

---

## 27. Final decision

### Evidence for acceptance

- Investigation **READY FOR ADR** with Alternative A only.  
- Ownership already mandated by ADR-023; publication by ADR-026; lifecycle by ADR-022.  
- This ADR closes command, budget, generation, Ledger entry, Register/Reporting, and fitness constitution without redesigning certified platforms.

### Authorization

This ADR authorizes **architecture publication only**.

Implementation MAY begin only via successor programs in §23 under Architecture Authority sequencing, without violating RF-LAW-*, RF-INV-*, RF-BUDGET-*, RF-GEN-*, RF-FIT-*, or inherited I-FIN / I-OS / I-FC / SR-INV laws.

---

# ACCEPTED — CONSTITUTIONAL

Refund Platform is now part of the MineuQR Architecture Constitution as ADR-ARCH-032.
