# MULTI-CHECK-ALLOCATION-ARCHITECTURE-1 — Architecture

| Field | Value |
|---|---|
| **Status** | Published |
| **Date** | 2026-07-23 |
| **Revision** | **1.0** |
| **Type** | Architecture Design (no implementation) |
| **Constitutional ADR** | [ADR-ARCH-025](../../../architecture/adrs/ADR-ARCH-025-multi-check-allocation-platform.md) |
| **Preserves** | ADR-ARCH-020 · ADR-ARCH-021 · ADR-ARCH-022 · ADR-ARCH-023 · ADR-ARCH-024 |
| **Certified baseline** | Check · Order Settlement · FSP · Split Payment · Projection · Read API · Presentation |
| **Successor** | MULTI-CHECK-ALLOCATION-DOMAIN-1 |

---

## 1. Purpose

Design the **canonical Multi Check Allocation Platform**: redistribute financial value and Check responsibility across Checks while preserving Financial Conservation and Check Aggregate ownership.

Architecture only — no code, schema, migrations, services, repositories, APIs, projections, or UI.

---

## 2. Problem statement

The Financial Settlement Platform must support scenarios where:

| Scenario | Requirement |
|----------|-------------|
| One Payment funds multiple Checks | Value received once; responsibility coverage applied across Checks |
| One Check receives value from multiple Payments | Multiple funding sources toward one Check’s Outstanding |
| Orders move between Checks | Membership transfer + responsibility redistribution |
| Checks merge | Composition consolidates; Outstanding/Payment relationships redistribute |
| Checks split | Composition partitions; responsibility portions redistribute |
| Outstanding spans multiple allocation operations | Remaining obligation remains Check-owned and deterministic |
| Financial reporting remains deterministic | Revenue and dual-metric law unchanged |

Without Multi Check Allocation constitution, teams risk inventing an Allocation Aggregate, dual composition SSOTs, or money inflation across Checks.

---

## 3. Architectural decision (summary)

```
Check Aggregate
        │
        ▼
Financial Settlement Platform
        │
        ▼
Multi Check Allocation
```

| Ruling | Statement |
|--------|-----------|
| **Capability** | Multi Check Allocation is an FSP capability |
| **Not a root** | Allocation is **not** an Aggregate Root |
| **Not Payment** | Allocation is **not** a Payment |
| **Not Check** | Allocation is **not** a Check |
| **Nature** | Allocation records the **relationship** between financial value and Check responsibility |
| **Mutation** | Check Aggregate is the sole mutation authority |
| **Commands** | Allocation create / reserve / apply / adjust / reverse / complete / cancel only via Check commands |
| **External mutation** | Forbidden |

---

## 4. Distinction from related capabilities

| Capability | Scope | Owner | Relationship to Multi Check Allocation |
|------------|-------|-------|----------------------------------------|
| **Payment Allocation** (ADR-023/024) | Within-Check assignment of Payment → Order Settlement / Guest Responsibility | Check Aggregate | Complementary; may be produced as an effect of applying Multi Check Allocation Portions **inside** a target Check |
| **Split Payment** (ADR-024) | Multiple Payments/Tenders against **one** Check | Check Aggregate | Independent; Payment Completion ≠ Allocation Completion |
| **Multi Check Allocation** (this ADR) | Relationship of financial value ↔ Check responsibility **across Checks** | Check Aggregate (commanded) | Subject of this constitution |
| **Membership** | Order↔Check composition discovery | Check Aggregate | Sole composition SSOT; Allocation never replaces it |
| **Order Settlement** | Per-Order settlement state | Check Aggregate (OS Entity) | May receive coverage influence; never owned by Allocation |
| **Outstanding Balance** | Remaining Check obligation | Check Aggregate | May be redistributed; ownership never leaves Check |

**Hard rule:** Multi Check Allocation MUST NOT redefine Payment Allocation, Split Payment Finality, Membership, Order Settlement, or Revenue.

---

## 5. Ownership Model

### 5.1 Sole ownership

| Concern | Sole Owner | Forbidden owners |
|---------|------------|------------------|
| Allocation create / mutate / finalize | **Check Aggregate** (via Check commands) | Allocation “service” as root · Projection · API · UI · Order · Session · Reporting |
| Allocation Source facts | Source Check Aggregate commands | Target-only mutation of source facts |
| Allocation Target / Portion apply | Target Check Aggregate commands | Source inventing target Outstanding without target command |
| Outstanding Balance | **Each affected Check Aggregate** | Allocation · Projection · UI |
| Order Settlement | **Check Aggregate** (OS Entity) | Allocation |
| Payment / Tender | **Check Aggregate** (Split Payment) | Allocation owning Payments |
| Membership / Order move | **Check Aggregate** | Allocation as composition authority |
| Check merge / split composition | **Check Aggregate** | Allocation Aggregate |
| Revenue | Reporting reads paid Check `grandTotal` | Allocation totals · tender sums |
| Traceability of redistribution | Allocation facts + Financial Events | Revenue redefinition |

### 5.2 Ownership chain

```
Check Aggregate
  └── Financial Settlement Platform
        ├── Split Payment (Payments / Tenders / Payment Allocations)
        ├── Order Settlement
        ├── Outstanding Balance
        └── Multi Check Allocation  ← relationship facts commanded by Checks
```

**No shared ownership. No mutation outside Check Aggregate commands.**

### 5.3 Cross-Check coordination (constitutional)

Because Allocation is not a root, cross-Check redistribution is effected by **coordinated Check Aggregate commands** on each participating Check, sharing one canonical `AllocationId` / `AllocationReference`.

| Side | Authority |
|------|-----------|
| Source Check | Issues / reserves Allocation Source; releases responsibility / value designation |
| Target Check | Accepts / applies Allocation Target Portions; updates its Outstanding / OS via its own commands |
| Coordination envelope | Domain program defines transactional/saga mechanics — **not** a new Aggregate Root |

A Multi Check Allocation set is **not committed** unless conservation holds across all participating Checks (I-MCA atomicity).

---

## 6. Canonical Identities

All identities are **restaurant-scoped**. Business Identity (day/display/scope) MUST NOT key Allocation identities (I-FIN-11 / I-OS-12).

**Persistence identifiers MUST NEVER replace canonical identities.**

| Identity | Ownership | Uniqueness | Creation | Stability / relationship rules |
|----------|-----------|------------|----------|--------------------------------|
| **AllocationId** | Issued under Check Aggregate / FSP governance | Unique per restaurant | On Allocation create | Immutable; parent of Portions |
| **AllocationReference** | Check Aggregate / FSP | Stable opaque reference tuple | With AllocationId | External/correlation reference; never BI |
| **FinancialReference** | Check Aggregate / FSP | Unique per restaurant (or opaque global) | On funded financial fact linkage | Links Allocation to Payment/Tender/Financial Transaction facts without transferring ownership |
| **SourcePaymentId** | Check Aggregate (Payment) | Per ADR-024 PaymentId | Existing Payment | Optional; Allocation references Payment — Payment does not own Allocation |
| **SourceCheckId** | Source Check Aggregate | Check identity | Existing Check | Check that designates / releases value or responsibility |
| **TargetCheckId** | Target Check Aggregate | Check identity | Existing Check | Check that receives responsibility / coverage |
| **AllocationSequence** | Allocation | Unique per AllocationId | On Portion / step create | Deterministic ordering within an Allocation; immutable once assigned |
| **AllocationPortionId** | Check Aggregate | Unique per restaurant | On Portion create | Child of AllocationId; immutable identity |
| **AllocationAdjustmentId** | Check Aggregate | Unique per restaurant | On adjust | Compensating fact identity; does not reuse AllocationId |
| **AllocationReversalId** | Check Aggregate | Unique per restaurant | On reverse | Compensating fact identity |

### 6.1 Identity rules

1. Identities remain stable throughout the Allocation lifecycle.  
2. Terminal Allocations retain identity forever (historical preservation).  
3. Compensations create **new** Adjustment/Reversal identities — never rewrite AllocationId meaning.  
4. Surrogate DB keys are persistence-only and MUST NOT appear as business authority in Domain/API contracts.  
5. Cross-tenant identity references are **Forbidden**.

---

## 7. Allocation Model

### 7.1 Canonical concepts

Each concept: **Purpose · Owner · Lifecycle · Relationships · Non-goals**.

#### 7.1.1 Allocation

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Canonical relationship unit linking financial value to Check responsibility across participating Checks |
| **Owner** | Check Aggregate (commanded; not a root) |
| **Lifecycle** | §8 |
| **Relationships** | Has Portions; references Source/Target Checks; may reference Source Payment(s) via FinancialReference |
| **Non-goals** | Not Aggregate Root · Not Payment · Not Check · Not Revenue |

#### 7.1.2 Allocation Portion

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Discrete amount of value/responsibility assigned to one Target (Check and/or responsibility slice) within an Allocation |
| **Owner** | Check Aggregate |
| **Lifecycle** | Created under Allocation · Applied / Adjusted / Reversed with parent rules |
| **Relationships** | Child of Allocation; carries AllocationSequence; targets TargetCheckId |
| **Non-goals** | Not independent monetary root |

#### 7.1.3 Allocation Source

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Designates where value / responsibility is drawn from (SourceCheckId and optional SourcePaymentId / FinancialReference) |
| **Owner** | Source Check Aggregate commands |
| **Lifecycle** | Bound at create/reserve · Immutable identity of source linkage |
| **Relationships** | Constrains max allocatable value by source remaining responsibility / payment value |
| **Non-goals** | Source Payment does not gain ownership of Allocation |

#### 7.1.4 Allocation Target

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Designates receiving Check responsibility (TargetCheckId; may further map to OS / Guest Responsibility via Payment Allocation inside that Check) |
| **Owner** | Target Check Aggregate commands |
| **Lifecycle** | Bound at create/reserve · Applied on apply |
| **Relationships** | Receives Portion amounts; may update Outstanding / OS only via Check commands |
| **Non-goals** | Target does not own source Payment |

#### 7.1.5 Allocation Responsibility

| Aspect | Specification |
|--------|---------------|
| **Purpose** | The obligation amount subject to redistribution for a Check (Check Responsibility slice participating in the Allocation) |
| **Owner** | Check Aggregate |
| **Lifecycle** | Open while Check open; frozen with terminal Check rules |
| **Relationships** | Conservation operand: Allocated + Remaining = Responsibility |
| **Non-goals** | Not a person ledger · Not CRM AR |

#### 7.1.6 Allocation Remaining

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Unallocated remainder of Allocation Responsibility (and/or unallocated remainder of a Source Payment designated for Multi Check Allocation) |
| **Owner** | Check Aggregate |
| **Lifecycle** | Decreases on apply; may increase only via Adjustment/Reversal facts |
| **Relationships** | Always ≥ 0 |
| **Non-goals** | Not UI-invented |

#### 7.1.7 Allocation Completion

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Allocation lifecycle reached successful terminal redistribution for its declared scope |
| **Owner** | Check Aggregate (Allocation lifecycle) |
| **Lifecycle** | Terminal success of Allocation — **does not** imply Check Financial Completion |
| **Relationships** | Independent of Payment Completion and Check settle |
| **Non-goals** | Must not auto-set Check `outcome = paid` |

#### 7.1.8 Allocation Adjustment

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Compensating fact that revises Portion amounts while preserving conservation and audit |
| **Owner** | Check Aggregate |
| **Lifecycle** | Created as new fact; prior Applied facts remain historical |
| **Relationships** | References AllocationId; new AllocationAdjustmentId |
| **Non-goals** | Not silent edit of history |

#### 7.1.9 Allocation Reversal

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Compensating fact that reverses a prior Applied Allocation (or Portion set) |
| **Owner** | Check Aggregate |
| **Lifecycle** | Terminal reverse path for that Allocation identity (or Portion set per domain) |
| **Relationships** | May restore Allocation Remaining / Outstanding via typed facts; may interact with Refund Platform when value return is required |
| **Non-goals** | Not reopen terminal OS to unpaid (I-OS-14) |

### 7.2 Supported cardinalities

| Pattern | Meaning | Realization |
|---------|---------|-------------|
| **One-to-One** | One Source → one Target | Single Allocation Portion |
| **One-to-Many** | One Source (Payment or Check) → many Target Checks | Multiple Portions / Sequences under one AllocationId |
| **Many-to-One** | Many Sources → one Target Check | Multiple Allocations or multi-source Portions targeting one Check |
| **Many-to-Many** | Many Sources ↔ many Targets | Allocation sets with multiple Sources and Portions; conservation across the set |

All patterns remain Check-commanded relationship facts — never a graph Aggregate Root.

### 7.3 Scenario mappings (constitutional)

| Scenario | Membership | Allocation | Outstanding | Order Settlement |
|----------|------------|------------|-------------|------------------|
| One Payment → many Checks | Unchanged unless Orders also move | Portions to each TargetCheckId from SourcePaymentId | Each Target Outstanding decreases only via its Check apply | Coverage applied per target Check OS commands |
| Many Payments → one Check | Unchanged | Multiple Allocations/Portions to one TargetCheckId | Target Outstanding reflects applied sum | OS updated by target Check only |
| Order moves Check A → B | **Membership transfer** (sole composition authority) | Responsibility Allocation A→B for that Order’s obligation | A/B Outstanding redistribute | OS entity migrates under target Check authority per domain; I-OS-14 respected |
| Checks merge | Membership consolidates into surviving Check | Allocations transfer responsibility/funding relationships to survivor | Survivor owns remaining Outstanding | OS under surviving Check |
| Checks split | Membership partitions | Allocations create responsibility Portions to new Checks | Each resulting Check owns its Outstanding | OS under each resulting Check |

---

## 8. Lifecycle

### 8.1 States

| State | Meaning | Terminal? |
|-------|---------|-----------|
| `Pending` | Allocation created; not yet reserved against source capacity | No |
| `Reserved` | Source capacity reserved; not yet applied to targets | No |
| `Applied` | Portions applied to target Check responsibility / coverage | No* |
| `Adjusted` | Compensating adjustment facts applied after prior apply | No* |
| `Reversed` | Allocation reversed via typed reversal facts | **Yes** (reverse terminal) |
| `Completed` | Allocation scope fully redistributed successfully | **Yes** (success terminal) |
| `Cancelled` | Abandoned before apply / completion | **Yes** (failure terminal) |

\* `Applied` / `Adjusted` are non-terminal relative to Completion; domain may treat a fully applied single-shot Allocation as transitioning directly `Applied → Completed`.

### 8.2 Canonical lifecycle graph

```
Pending → Reserved → Applied → Completed
                 │        │
                 │        ├── Adjusted → Completed
                 │        └── Reversed
                 └── Cancelled

Pending → Cancelled
Reserved → Cancelled
```

### 8.3 Entry rules

- Only Check Aggregate commands create Allocations.  
- Create requires valid SourceCheckId, at least one TargetCheckId (or declared same-Check redistribution scope if domain allows), tenant isolation, and positive Portion amounts.  
- Source remaining responsibility / payment value must cover reserved amounts.

### 8.4 Forbidden transitions

- Any terminal → non-terminal reopen of the **same** AllocationId  
- `Completed` → `Pending` / `Reserved` / `Applied`  
- `Cancelled` → `Applied` / `Completed` without a **new** AllocationId  
- `Reversed` → `Applied` on the same identity  
- Any transition that invents Check `outcome = paid`  
- Any transition that mutates Order Aggregate  
- Any transition that bypasses Membership for Order composition  

**Terminal states MUST NOT transition backwards.**

### 8.5 Reversal / adjustment behavior

- Corrections use **Allocation Adjustment** or **Allocation Reversal** facts (new identities).  
- History is append-only (ADR-023 Timeline law).  
- Refund of guest value remains Refund Platform authority when money must leave the restaurant; Allocation Reversal alone redistributes responsibility — it does not invent Refunds.

---

## 9. Financial Conservation Rules

Preserves ADR-023 / I-FC-* and ADR-024 I-SP-* within single-Check scope; extends conservation across Multi Check Allocation sets.

### 9.1 Primary conservation identity

```
Allocated Value + Remaining Value = Financial Responsibility
```

Where, for a participating Check / Allocation scope:

| Term | Meaning |
|------|---------|
| **Financial Responsibility** | Check Responsibility (or designated slice) subject to the Allocation |
| **Allocated Value** | Sum of Applied (net of Adjustments/Reversals) Portions for that scope |
| **Remaining Value** | Allocation Remaining / Check Outstanding component still unallocated |

### 9.2 Cross-Check set conservation

For an Allocation set with Sources S and Targets T:

```
Sum(value designated from Sources) = Sum(Portions to Targets) + Sum(unallocated Remaining of the set)
```

No Source may designate more than its remaining responsibility / payment value.  
No Target may receive Portions that produce negative Outstanding / responsibility.

### 9.3 Absolute prohibitions

Allocation MUST NEVER:

| Prohibition | Rationale |
|-------------|-----------|
| Create value | I-FC-02 / inflation |
| Destroy value silently | I-FC-03 — typed reverse facts only |
| Duplicate value across Targets | Double coverage |
| Allocate beyond responsibility | Over-obligation |
| Allocate beyond payment value | When SourcePaymentId is bound |
| Produce negative responsibility / Outstanding | I-FC-06 |

### 9.4 Multi Check Allocation invariant table

| ID | Invariant | Owner | Validation point | Failure |
|----|-----------|-------|------------------|---------|
| **I-MCA-01** | Allocated Value + Remaining Value = Financial Responsibility (scope) | Check Aggregate | Reserve/Apply/Adjust | Reject; no partial commit |
| **I-MCA-02** | Allocation never exceeds remaining responsibility | Check Aggregate | Reserve/Apply | Reject |
| **I-MCA-03** | Allocation never exceeds bound Source Payment value | Check Aggregate | Reserve/Apply | Reject |
| **I-MCA-04** | Money never duplicated across Portions/Checks/Revenue | Check Aggregate | Apply set | Reject |
| **I-MCA-05** | Money never destroyed without typed Adjustment/Reversal/Refund/Void fact | Check Aggregate | Command | Reject undocumented wipe |
| **I-MCA-06** | Outstanding ≥ 0 on every participating Check | Each Check Aggregate | Apply/Adjust/Reverse | Reject |
| **I-MCA-07** | Allocation identity immutable; compensations are new facts | Check Aggregate | All commands | Reject rewrite |
| **I-MCA-08** | Checks never lose financial identity via Allocation | Check Aggregate | Merge/split/move | Reject identity collapse |
| **I-MCA-09** | Allocation Completion ≠ Check Financial Settlement | Check Aggregate | Complete | No auto-settle |
| **I-MCA-10** | Payment Completion ≠ Allocation Completion | Check Aggregate | Payment/Allocation commands | Independent lifecycles |
| **I-MCA-11** | Membership remains sole Order↔Check composition discovery | Check Aggregate | Order move / merge / split | Reject dual SSOT |
| **I-MCA-12** | Allocation is not an Aggregate Root / does not own Payment, Check, OS, Outstanding, Revenue | Architecture Authority | Design review | Program rejection |
| **I-MCA-13** | Tenant isolation on all Allocation identities | Check Aggregate | Ingress | Reject |
| **I-MCA-14** | ADR-021: duplicate Allocation commands are deterministic (`applied` \| `already_in_state` or equivalent) | Emitting domain | Command handler | No double mutation |
| **I-MCA-15** | I-OS-14 preserved: terminal OS must not regress to non-terminal via Allocation | Order Settlement / Check | OS-affecting apply | Domain error |
| **I-MCA-16** | Cross-Check Allocation sets commit atomically w.r.t. conservation (no half-applied money) | Check Aggregate tx / coordination | Unit of work | Full rollback |

Inherited **I-FIN-01…12**, **I-OS-01…12, I-OS-14**, **I-FC-01…15**, and **I-SP-01…08** remain binding.

---

## 10. Aggregate Boundaries

### 10.1 Boundary diagram

```
+----------------------------------------------------------------------+
|                 Check Aggregate (sole financial mutator)             |
|----------------------------------------------------------------------|
| Check (responsibility, outcome, snapshots, Outstanding)              |
| Membership[]                                                         |
| OrderSettlement[]                                                    |
| SettlementTransaction[] / Tender                                     |
| Payment[] / PaymentAllocation[]          ← Split Payment (ADR-024)   |
| MultiCheckAllocation[] / Portions[]      ← relationship facts        |
| Allocation Source / Target linkages                                  |
| Guest Responsibility* (optional)                                     |
+----------------------------------------------------------------------+
        │ coordinated commands share AllocationId
        ▼
+----------------------------------------------------------------------+
|                 Peer Check Aggregate(s)                              |
|   accept/apply Target Portions · update own Outstanding / OS         |
+----------------------------------------------------------------------+
        │
        ▼
  Financial Events → Timeline / Projections / API / Presentation (read)

Allocation is INSIDE Check command authority — NOT a new Aggregate Root.
Order Aggregate remains operational only (no Allocation mutation).
```

### 10.2 Responsibility clarification

| Concern | Owner |
|---------|-------|
| **Mutation** | Check Aggregate commands only |
| **Calculation** (conservation algebra) | Domain under Check / FSP write model |
| **Lifecycle** | Allocation lifecycle under Check commands |
| **Identity issuance** | Check Aggregate / FSP governance |
| **Composition (Order↔Check)** | Membership only |
| **Projection / API / Presentation / Reporting** | Read consumers |

### 10.3 Forbidden overlaps

- Allocation Aggregate Root  
- Payment owning Allocation lifecycle  
- Allocation owning Outstanding, Order Settlement, or Revenue  
- Projection/UI inventing Allocation Remaining  
- Order Aggregate applying Allocations  
- Dual membership via Allocation edges  

---

## 11. Domain Relationships

### 11.1 Canonical graph

```
Financial Responsibility (Check)
  ├── Outstanding Balance (Check-owned)
  ├── Payment (Split Payment; optional SourcePaymentId)
  │     └── Payment Allocation → Order Settlement / Guest Responsibility (within Check)
  ├── Multi Check Allocation
  │     ├── Allocation Source ──► SourceCheckId [, SourcePaymentId / FinancialReference]
  │     ├── Allocation Portion[] (AllocationSequence)
  │     │     └── Allocation Target ──► TargetCheckId
  │     ├── Allocation Remaining
  │     ├── Allocation Adjustment / Reversal (compensating facts)
  │     └── Allocation Completion (lifecycle — not Check settle)
  ├── Membership → Order  (sole composition)
  └── Order Settlement (per Order; Check-owned)
```

### 11.2 Payment relationship

| Rule | Statement |
|------|-----------|
| Allocation **references** Payments | Via SourcePaymentId / FinancialReference |
| Payments **do not own** Allocations | Ownership remains Check-commanded Allocation facts |
| Split Payment remains independent | Multi-tender / incremental Payment laws unchanged |
| Payment Completion ≠ Allocation Completion | Independent terminal conditions |
| Unbound Allocations | May redistribute responsibility without a Payment (e.g. Order move / Check split) |

### 11.3 Check relationship

| Rule | Statement |
|------|-----------|
| Checks own financial responsibility | Always |
| Allocations only redistribute responsibility | Never replace Check identity |
| Checks remain sole owners of Outstanding, Settlement completion, Financial completion | Allocation Completion is orthogonal |

### 11.4 Order Settlement relationship

| Rule | Statement |
|------|-----------|
| Order Settlement unchanged as SSOT | Per-Order settlement state |
| Allocation MAY influence which Check is responsible | Via Membership + Target apply |
| Allocation MUST NEVER own Order Settlement | Coverage still applied through Check → OS commands |
| I-OS-14 preserved | No terminal → non-terminal regression |

### 11.5 Outstanding Balance relationship

| Rule | Statement |
|------|-----------|
| Outstanding owned by Check Aggregate | Always |
| Allocation changes MAY redistribute Outstanding | Across Source/Target Checks |
| Outstanding ownership never leaves Check Aggregate | Projection/UI never authoritative |

### 11.6 Communication matrix

| From → To | Write allowed? | Notes |
|-----------|----------------|-------|
| Check → Allocation facts | **Yes** | Sole mutation path |
| Check → peer Check (coordinated apply) | **Yes** (via peer Check commands) | Shared AllocationId; conservation across set |
| Payment → Allocation | **No** (own) | Reference only |
| Allocation → Order Settlement | **No** (direct) | Only via Check OS commands as effect of apply |
| Order → Allocation | **No** | I-FIN-12 |
| Projection / API / UI → Allocation write model | **No** | Read only |
| Reporting → Allocation | **No** (mutate) | Traceability reads only |

---

## 12. Reporting

| Topic | Specification |
|-------|---------------|
| **Revenue** | Unchanged — paid Check `grandTotal` (I-FIN-02) |
| **Order Sales** | Unchanged — Order Read dual-metric law |
| **Payment Method Analytics** | Unchanged — Tender / SettlementTransaction SSOT |
| **Allocation role** | Traceability of redistribution / multi-Check funding paths |
| **Forbidden** | Allocation totals as Revenue · Allocation as settlement completion metric that replaces Check outcome |

Reporting remains derived from:

1. Paid Checks  
2. Order Settlement  
3. Financial Allocation (trace / diagnostics / future allocation reports)  

Allocation provides **traceability, not revenue ownership**.

---

## 13. Domain Events (names only)

Compatible with ADR-ARCH-021 (transport + business idempotency).

| Event | When |
|-------|------|
| `AllocationCreated` | Allocation enters `Pending` |
| `AllocationReserved` | Source capacity reserved |
| `AllocationApplied` | Portions applied to targets |
| `AllocationAdjusted` | Adjustment fact committed |
| `AllocationReversed` | Reversal fact committed |
| `AllocationCompleted` | Allocation success terminal |
| `AllocationCancelled` | Allocation cancelled terminal |

### 13.1 Event governance

| Rule | Statement |
|------|-----------|
| Emission | Only after successful Check Aggregate command commit |
| Idempotency | Duplicate commands → deterministic `applied` \| `already_in_state` (or equivalent) |
| Replay | Must not inflate Allocated Value or reduce Outstanding twice |
| Ordering | Write Model authoritative; consumers tolerate at-least-once |
| Correlation | Events carry AllocationId, AllocationReference, SourceCheckId, TargetCheckId(s), AllocationSequence as applicable |
| Non-goals | Event Bus / Outbox / Inbox topology not designed here |

`AllocationCompleted` MUST NOT be interpreted as `CheckFinanciallyCompleted`.  
`PaymentCaptured` / `PaymentCompleted` MUST NOT be interpreted as `AllocationCompleted`.

---

## 14. Global Invariants (summary)

1. Allocation never exceeds remaining responsibility.  
2. Allocation never exceeds payment value (when bound to a Payment).  
3. Checks never lose financial identity.  
4. Allocation identity is immutable.  
5. Allocation completion does not imply Check settlement.  
6. Payment completion does not imply Allocation completion.  
7. Financial conservation always holds.  
8. Membership remains sole Order↔Check composition discovery.  
9. Outstanding ownership never leaves the Check Aggregate.  
10. Order Settlement ownership never moves to Allocation.  
11. Revenue semantics unchanged.  
12. No new Aggregate Roots.  
13. Persistence ids never replace canonical identities.  
14. Terminal Allocation states do not transition backwards.  
15. I-OS-14 and ADR-021 remain binding.

---

## 15. Architecture Rules (MUST NOT)

Multi Check Allocation MUST NOT:

1. Become an Aggregate Root.  
2. Own Payments.  
3. Own Checks.  
4. Own Order Settlement.  
5. Own Outstanding Balance.  
6. Calculate Revenue.  
7. Modify Reporting Revenue semantics.  
8. Violate Financial Conservation.  
9. Replace Membership as composition SSOT.  
10. Auto-settle Checks on Allocation Completion.  
11. Reopen terminal Order Settlement to non-terminal.  
12. Allow Projection / API / Presentation mutation authority.

---

## 16. Read Model / API / Presentation Impact (architecture only)

| Surface | Direction |
|---------|-----------|
| **Projection** | Additive allocation views (AllocationId, states, Portions, Source/Target Checks, Remaining, revision) — read-only; no redesign of certified OS / Split Payment projection contracts required for domain start |
| **API** | Future read: allocation by Check / by AllocationId; future mutation: Check-scoped allocate/reserve/apply/adjust/reverse/cancel/complete — never Allocation-root APIs |
| **Presentation** | Pure consumer; show redistribution progress; never invent Remaining; never treat Allocation Complete as Check Settled |

**No Projection / API / Presentation implementation in this program.**

---

## 17. Architecture constraints (confirmed)

Do **not** redesign: Check Aggregate · Order Settlement · FSP · Split Payment · Projection · API · Presentation.

Maintain: ADR-020 · ADR-021 · ADR-022 · ADR-023 · ADR-024.

---

## 18. Successor readiness — MULTI-CHECK-ALLOCATION-DOMAIN-1

Domain program may implement:

- Allocation / Portion state machine under Check Aggregate commands  
- Reserve / apply / adjust / reverse / complete / cancel commands  
- Cross-Check coordination envelope (without Allocation Root)  
- Conservation invariants I-MCA-*  
- Membership-coupled Order move / Check merge / Check split allocation effects  
- Integration with Split Payment references and Order Settlement coverage commands  

Without architectural redesign.

---

## 19. Success criteria checklist

- [x] Multi Check Allocation defined as FSP capability  
- [x] Check Aggregate ownership preserved; no new Aggregate Roots  
- [x] Canonical Allocation identities defined  
- [x] Allocation model (Portion/Source/Target/Responsibility/Remaining/Completion/Adjustment/Reversal) defined  
- [x] Cardinalities 1:1 / 1:N / N:1 / N:N supported constitutionally  
- [x] Lifecycle with non-regressible terminals defined  
- [x] Financial Conservation preserved and extended (I-MCA-*)  
- [x] Payment / Check / OS / Outstanding / Reporting relationships defined  
- [x] Domain events named; ADR-021 compatible  
- [x] Compatible with ADR-020/021/022/023/024  
- [x] Ready for MULTI-CHECK-ALLOCATION-DOMAIN-1  

**Certification statement:**  
*Multi Check Allocation Architecture is published. Allocation is a Check-commanded relationship capability under the Financial Settlement Platform — not an Aggregate Root. Financial Conservation and Check ownership are preserved. MULTI-CHECK-ALLOCATION-DOMAIN-1 may proceed.*
