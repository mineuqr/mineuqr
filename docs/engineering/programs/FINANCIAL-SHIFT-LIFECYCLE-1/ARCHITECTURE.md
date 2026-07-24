# FINANCIAL-SHIFT-LIFECYCLE-1 — Architecture & Domain Design

| Field | Value |
|---|---|
| **Program** | FINANCIAL-SHIFT-LIFECYCLE-1 |
| **Date** | 2026-07-24 |
| **Mode** | Architecture & Domain Design only |
| **Implementation** | **Not authorized** |
| **Migration / Schema / UI** | **Not authorized** |
| **Constitution** | ADR-ARCH-020 · 022 · 026 · **028** · CRMP-DOMAIN-DESIGN-1 · CRMP-IMPLEMENTATION-1 · Migration 0077 · REGISTER-OPERATIONS-PLATFORM-1 |
| **STOP conditions** | **Not triggered** |
| **Verdict** | **FINANCIAL SHIFT LIFECYCLE ARCHITECTURE CERTIFIED** |

---

## 1. Executive Summary

**Financial Shift** is the CRMP Aggregate Root that owns a **time-bound operational accountability period** on exactly one Register.

| Owns money? | Owns settlement? | Owns accountability period? |
|-------------|------------------|-----------------------------|
| **No — Check** | **No — Check** | **Yes — Financial Shift (CRMP)** |

Financial Shift:

- Never owns money  
- Never performs settlement  
- Never becomes a financial source of truth  
- Never mutates Settlement Record  
- Provides the operational period to which Settlement Attribution later attaches  

This program completes the lifecycle that Register Operations deferred:

```
REGISTER-OPERATIONS-PLATFORM-1 ✅
        ↓
FINANCIAL-SHIFT-LIFECYCLE-1     ← this program (architecture)
        ↓
SETTLEMENT-CONTEXT-ADOPTION-1
        ↓
SETTLEMENT-ATTRIBUTION-ADOPTION-1
```

**Decision:** Financial Shift **remains** the CRMP Aggregate Root (ADR-ARCH-028). No ownership moves. No certified platform redesign.

**State refinement (architecture):** Canonical statuses are elaborated beyond the current domain foundation (`open | handover_pending | closed`) to include `suspended`, `closing`, and `archived`, while preserving `handover_pending` and rejecting persisted `pending`. Successor implementation may adopt these statuses additively; this program authorizes architecture only.

---

## 2. Domain Discovery

### 2.1 What is a Financial Shift?

A **Financial Shift** is a restaurant-scoped, Register-bound **operational accountability aggregate**: the period during which a Staff User is responsible for drawer custody facts and is the target of Settlement Attribution for settlements that already occurred through the Check Platform.

It is **not**:

- A Check, Settlement, or Settlement Record  
- A Dining / Operational Session  
- A Register (parent station)  
- A Device / Screen  
- A Cashier domain / Employee aggregate  
- A Revenue ledger or ERP cash book  

### 2.2 Why does it exist?

Without Financial Shift, MineuQR can settle Checks and publish Settlement Records, but cannot answer:

- Which accountability period owns this settlement operationally?  
- Who held the drawer?  
- What was expected vs counted cash for that period?  
- Was there variance?  
- Who handed over to whom?

Settlement Attribution is blocked until this lifecycle is canonical.

### 2.3 Business problem solved

| Problem | Shift answer |
|---------|--------------|
| Multi-staff day on one till | Sequential shifts (Ahmed → Ammar) with handover |
| Cash variance accountability | Expected vs actual at close / handover |
| Attribution target | Active Shift on Register + operator |
| Register close safety | Register cannot close duty while Shift active |
| Audit without rewriting money | Custody + attribution references; Check/SR untouched |

### 2.4 Who opens it?

Staff **User** with restaurant access + future `register_operations` (or settle-station) capability, executed via Operational Screens.

**Preconditions (from REGISTER-OPERATIONS-PLATFORM-1):**

- Register Catalog = `active`  
- Register Duty = `open` (default; Duty=`suspended` does **not** allow new Shift open)  
- No other active Shift on that Register  
- Opening Float declared  
- Operator User assigned (Shift `operatorUserId`; preferably matches Register assignment)

### 2.5 Who closes it?

| Path | Actor |
|------|-------|
| Direct close | Current Shift `operatorUserId` (or elevated ops policy) via `BeginClose` → final count → `CloseFinancialShift` |
| Handover accept | Receiver User accepts → outgoing Shift closes; successor opens |
| Recovery close | Authorized ops after abandoned Shift (same close contract + audit) |

### 2.6 Relationships

| Peer | Relationship |
|------|----------------|
| **Register** | Required parent station. Shift cannot exist without Register. Register may exist without Shift. Exactly one **active** Shift per Register. Many Shifts per Register over time. |
| **Drawer** | Entity owned by Shift (singleton). Not owned by Register. |
| **Operator (User)** | Reference. Opening/current operator; handover parties; count/movement actors. Not owned by CRMP. |
| **Settlement Attribution** | Association owned by CRMP, written in Shift context. References Settlement Record + Register + Shift + User. Does not own money. |
| **Register Operations** | Guard plane for Duty/Catalog; does not own Shift lifecycle. |
| **Check / SR** | External. Shift never settles or publishes. Attribution references SR after publication. |

---

## 3. Aggregate Design

### 3.1 Decision: Financial Shift remains Aggregate Root

**Confirmed.** Per ADR-ARCH-028 and CRMP-DOMAIN-DESIGN-1:

```
Register (CRMP AR)  ← ROP duty / catalog
  └── Financial Shift (CRMP AR)  [0..1 active]
        ├── Drawer (Entity)
        │     ├── DrawerMovement[] (append-only)
        │     └── DrawerCount[] → DrawerVariance (derived VO)
        ├── ShiftHandover? (Entity)
        └── SettlementAttribution[] (Association → Settlement Record)
```

No parallel Shift AR. No move of Drawer under Register. No Cashier AR.

### 3.2 Aggregate boundary

| Inside Shift TX / consistency boundary | Outside (references / guards only) |
|----------------------------------------|-------------------------------------|
| Shift status, version, timestamps | Register catalog/duty (loaded for guards) |
| Operator User id (reference value) | User aggregate |
| Drawer + movements + counts | Device / Screen |
| Handover entity | Check / SettlementTransaction |
| Attribution associations (SR id + custody copy fields) | Settlement Record money document |
| Opening float + currency | Order / Session / Kitchen |

### 3.3 Concurrency model

| Resource | Mechanism |
|----------|-----------|
| Financial Shift | Optimistic concurrency on `version` |
| Active Shift per Register | Unique active constraint / conflict on second open (CR-INV-01 / D-INV-02 / FS-INV-01) |
| Close / BeginClose | Version check; idempotent terminal predicates |
| Attribution | Unique by `settlementRecordId` (D-INV-13) |
| Handover accept | Single TX: close A + open B; conflict if A not `handover_pending` |

### 3.4 Identity

| Field | Role |
|-------|------|
| `financialShiftId` | Opaque stable id (`fsh_…`) — primary identity |
| `restaurantId` | Tenant isolation |
| `registerId` | Parent Register reference (immutable after open) |
| `version` | Optimistic concurrency |

Display labels are presentation, not identity.

---

## 4. Entity Model

| Entity | Kind | Owner | Notes |
|--------|------|-------|-------|
| **Financial Shift** | Aggregate Root | CRMP | Accountability period |
| **Drawer** | Entity | Shift | Exactly one per Shift; created at open |
| **Drawer Movement** | Entity | Drawer/Shift | Append-only custody posting |
| **Drawer Count** | Entity | Drawer/Shift | Declared actual; expected/variance derived at record time |
| **Shift Handover** | Entity | Shift | Transfer offer/outcome |
| **Settlement Attribution** | Association | CRMP / Shift collection | References SR; never money owner |

**Not entities of this aggregate:** Register, User, Device, Check, Settlement Record, Order, Session.

---

## 5. Value Object Model

| VO | Definition |
|----|------------|
| **FinancialShiftId** | Opaque `fsh_…` |
| **ShiftStatus** | See §6 canonical states |
| **OpeningFloat** | `{ amount, currencyCode }` at open; amount ≥ 0 |
| **MoneyAmount** | `{ amount, currencyCode }` for movements/counts |
| **MovementType** | `opening_float \| paid_in \| paid_out \| safe_drop \| manual_adjustment` |
| **CountKind** | `interim \| final` |
| **DrawerVariance** | `{ expected, actual, variance, currencyCode }` — always derived |
| **HandoverOutcome** | `pending \| accepted \| rejected` |
| **CloseReason** | `normal \| handover \| cancelled_empty \| recovery` |
| **ArchiveMarker** | `{ archivedAt, archivedByUserId? }` when status=`archived` |

Expected cash is a **derived read** (formula §11), not a stored monetary authority that competes with Check.

---

## 6. Financial Shift State Machine

### 6.1 State evaluation (program-required set)

| Candidate | Decision | Rationale |
|-----------|----------|-----------|
| **Pending** | **Rejected as persisted status** | Open is atomic (float + Drawer + `open` in one command). Client “pending” UX is pre-commit only. Avoids orphan reserved Shifts. |
| **Open** | **Accepted** | Operating accountability; attributions & movements allowed |
| **Suspended** | **Accepted (new)** | Shift-level pause distinct from Register Duty suspend. Blocks new attributions & non-close mutations; custody facts retained |
| **Closing** | **Accepted (new)** | Crash-safe close corridor after `BeginClose`; final count recording allowed |
| **Closed** | **Accepted** | Immutable custody + attribution membership |
| **Archived** | **Accepted (new)** | Post-closed retention / cold state; no operational mutation |
| **handover_pending** | **Preserved** | Already certified in CRMP domain/implementation; not redesigned away |

### 6.2 Canonical statuses

```
[*] ──OpenFinancialShift──► open
                              │
                              ├─Suspend──────────────► suspended ──Resume──► open
                              │                            │
                              │                            └─BeginClose──► closing
                              │
                              ├─BeginClose───────────► closing ──Close──► closed ──Archive──► archived
                              │                            │
                              │                            └─(abort close policy)──► open
                              │
                              ├─InitiateHandover─────► handover_pending
                              │                            ├─Reject──► open
                              │                            └─Accept──► closed (+ successor open)
                              │
                              └─CancelOpen*──────────► closed (reason=cancelled_empty)

* CancelOpen only when empty (see §7)
```

### 6.3 Active vs terminal

| Class | Statuses |
|-------|----------|
| **Active** (blocks second open; blocks Register close) | `open`, `suspended`, `closing`, `handover_pending` |
| **Terminal custody** | `closed` |
| **Terminal retention** | `archived` (always after `closed`) |

`isActiveShift` = status ∈ `{ open, suspended, closing, handover_pending }`.

### 6.4 Valid transitions

| From | To | Command | Guards |
|------|----|---------|--------|
| (none) | `open` | `OpenFinancialShift` | Register Catalog=active; Duty=open; no active Shift; float; operator |
| `open` | `suspended` | `SuspendFinancialShift` | — |
| `suspended` | `open` | `ResumeFinancialShift` | Register still Catalog=active; Duty preferably open |
| `open` | `closing` | `BeginCloseFinancialShift` | — |
| `suspended` | `closing` | `BeginCloseFinancialShift` | Allowed (force close path) |
| `closing` | `closed` | `CloseFinancialShift` | Final Drawer Count present |
| `closing` | `open` | `AbortCloseFinancialShift` | Policy; no final count committed **or** final count voided by compensating policy (default: only if no final count yet) |
| `open` | `handover_pending` | `InitiateHandover` | Receiver ≠ initiator; initiator = operator |
| `handover_pending` | `open` | `RejectHandover` | Pending handover |
| `handover_pending` | `closed` | `AcceptHandover` | Final count; receiver accepts; successor Shift opened |
| `open` | `closed` | `CancelOpen` | Empty shift only (see FS-INV-20) |
| `closed` | `archived` | `ArchiveFinancialShift` | Already closed; retention policy |

**Direct `open → closed` via `CloseFinancialShift`:** Allowed as **shortcut** only when a final count already exists (compat with CRMP-IMPLEMENTATION-1). Semantically equivalent to BeginClose (implicit) + Close. Preferred explicit path for new clients: BeginClose → count → Close.

### 6.5 Invalid transitions

| Forbidden | Why |
|-----------|-----|
| Any → reopen `closed` / `archived` | Immutability (CR-INV-02 / D-INV-03) |
| Second concurrent active Shift on Register | CR-INV-01 |
| Attribute while `suspended`, `closing`, `handover_pending`, `closed`, `archived` | Attribution only on `open` (default policy) |
| Movements while not `open` | Custody append only when operating |
| `archived` → any other | Terminal retention |
| Open without Register Duty open | RO-INV-05 |
| Close without final count (except CancelOpen empty path) | D-INV-15 |

### 6.6 Recovery rules

| Situation | Recovery |
|-----------|----------|
| Crash after Open committed | Shift is `open`; resume ops |
| Crash during BeginClose | Status `closing`; retry Close after ensuring final count, or AbortClose if no final count |
| Crash during AcceptHandover mid-TX | TX atomic: either A closed + B open, or neither; retry Accept |
| Abandoned `open` / `suspended` | Ops: Resume if needed → BeginClose → count → Close; or CancelOpen if empty |
| Stuck `handover_pending` | RejectHandover (timeout policy) → `open`, then close or re-offer |
| Process restart | `ResolveActiveShift` / `ResolveShiftByRegister` rebuilds context; no invented Shift |

---

## 7. Command Model

Ownership: **Financial Shift AR / CRMP application services** (future implementation). Register Operations owns Register commands only. Check owns settle.

All mutating commands are **idempotent** where noted. Prefer client `commandId` (future) + state predicates + `version`.

### 7.1 Lifecycle commands

| Command | Owner | Purpose | Idempotency |
|---------|-------|---------|-------------|
| `OpenFinancialShift` | Shift / CRMP | Create Shift `open` + Drawer + opening_float | Same `financialShiftId` → return existing; conflict if different open on Register |
| `SuspendFinancialShift` | Shift / CRMP | `open` → `suspended` | Yes if already `suspended` |
| `ResumeFinancialShift` | Shift / CRMP | `suspended` → `open` | Yes if already `open` |
| `BeginCloseFinancialShift` | Shift / CRMP | → `closing` | Yes if already `closing` |
| `AbortCloseFinancialShift` | Shift / CRMP | `closing` → `open` if no final count | Yes if already `open` |
| `CloseFinancialShift` | Shift / CRMP | → `closed` with final count | Yes if already `closed` |
| `CancelOpen` | Shift / CRMP | Empty `open` → `closed` (`cancelled_empty`) | Yes if already closed with that reason |
| `ArchiveFinancialShift` | Shift / CRMP | `closed` → `archived` | Yes if already `archived` |

### 7.2 Custody commands (unchanged ownership)

| Command | Owner | Allowed when |
|---------|-------|--------------|
| `RecordDrawerMovement` | Shift | `open` only |
| `RecordDrawerCount` | Shift | `open` (interim/final); `closing` / `handover_pending` (final only) |
| `InitiateHandover` / `AcceptHandover` / `RejectHandover` | Shift | Per §6 |

### 7.3 Attribution command (association — adoption later)

| Command | Owner | Notes |
|---------|-------|-------|
| `CreateSettlementAttribution` | CRMP / Shift collection | Requires Shift `open`; SR id exists; unique by SR; **caller supplies** `cashTenderAmount` from SR/ST — Shift does not calculate settlement totals |

### 7.4 Resolution commands (read / policy)

| Command | Owner | Rule |
|---------|-------|------|
| `ResolveActiveShift` | Shift / CRMP | Input: `restaurantId` + `registerId` (required) → at most one active Shift. Zero → not found. Never invent. |
| `ResolveShiftByRegister` | Shift / CRMP | Same as active for ops; optional `includeClosed` for history |
| `ResolveShiftByOperator` | Shift / CRMP | Active Shift where `operatorUserId` matches; at most one per restaurant policy (operator should not run two active Shifts). Ambiguity → conflict |

**Settlement context must never invent a Financial Shift.**

### 7.5 CancelOpen contract

Allowed only when **all** hold:

1. Status = `open`  
2. Zero Settlement Attributions  
3. Movements = exactly one `opening_float`  
4. Zero counts  
5. No handover entity  

Effect: status → `closed`, `closeReason = cancelled_empty`, `closedAt` set. Opening float remains as historical custody fact (physical cash return is an ops procedure outside domain money ownership).

### 7.6 Forbidden commands (constitutional)

`SettleCheck`, `FinalizeSettlement`, `CreateSettlementRecord`, `UpdateSettlementMoney`, `RecalculateRevenue`, `OpenCashierSession`, `CreateEmployee`.

---

## 8. Event Model

**Publisher:** Financial Shift / CRMP command handler (future).  
**Consumers:** audit, ops UI, settle-context cache, future shift ops reporting.  
**Not** Check finalize. Events are **not** financial publication.

| Event | Meaning | TX boundary |
|-------|---------|-------------|
| `FinancialShiftOpened` | Accountability started; float recorded | Shift insert TX |
| `FinancialShiftSuspended` | Pause | Shift write TX |
| `FinancialShiftResumed` | Resume | Shift write TX |
| `FinancialShiftClosingStarted` | Entered `closing` | Shift write TX |
| `FinancialShiftCloseAborted` | Returned to `open` from `closing` | Shift write TX |
| `FinancialShiftClosed` | Terminal custody | Shift write TX |
| `FinancialShiftCancelled` | CancelOpen path | Shift write TX |
| `FinancialShiftArchived` | Retention | Shift write TX |
| `FinancialShiftResolved` | Optional audit of resolution query | Query-side; no write |
| `DrawerMovementRecorded` | Custody append | Shift write TX |
| `DrawerCountRecorded` | Count + derived variance | Shift write TX |
| `SettlementAttributed` | SR linked (association) | Shift write TX |
| `HandoverInitiated` / `Accepted` / `Rejected` | Transfer lifecycle | Shift write TX (Accept: A+B atomic) |

**Idempotency:** consumers key on `(financialShiftId, eventId)` or `(financialShiftId, version)`.  
**Ordering:** per-`financialShiftId` monotonic `version`.  
**No saga with Check** required for Shift lifecycle.

---

## 9. Register Integration

### 9.1 Relationship

| Rule | Statement |
|------|-----------|
| Cardinality | Register 1 — ∗ Financial Shift (history); 0..1 **active** |
| Existence | Shift **requires** Register; Register **may** exist without Shift |
| Identity parent | `registerId` immutable on Shift after open |
| Ownership | Register AR ≠ Shift AR; both CRMP |

### 9.2 Opening sequence

```
Register Catalog active
  → OpenRegister (Duty) + AssignOperator          [ROP]
  → OpenFinancialShift (float, operator)          [this]
  → (optional) settlements → Attribution          [later programs]
```

### 9.3 Closing sequence

```
BeginCloseFinancialShift → RecordDrawerCount(final) → CloseFinancialShift
  → optional ReleaseOperator / CloseRegister      [ROP]
  → optional ArchiveFinancialShift                [retention]
```

Handover path:

```
InitiateHandover → RecordDrawerCount(final) → AcceptHandover
  → outgoing closed; successor open on same Register
```

### 9.4 Guards

| Guard | Direction |
|-------|-----------|
| `OpenFinancialShift` | Requires Register Catalog=`active` ∧ Duty=`open` ∧ no active Shift |
| `CloseRegister` / Deactivate | Requires **no** active Shift (RO-INV-04 / CR-INV-04) |
| Suspend Register | Does **not** auto Suspend/Close Shift (RO-INV-06); Shift may remain `open` until Shift Suspend/Close |
| Reassignment of Register display/device | Reference only; never rewrites Shift history (D-INV-18) |

### 9.5 Exactly one active Shift

Enforced at open and maintained for `open|suspended|closing|handover_pending`. Historical closed/archived Shifts unlimited per Register.

### 9.6 Register reassignment rules

| Change | Effect on Shift |
|--------|-----------------|
| Rename Register | None (display) |
| Bind/Unbind Device | None on Shift history |
| Assign/Release Operator on Register | Does not silently change Shift `operatorUserId`; use Handover or explicit ops |
| Move “station” conceptually | New Register identity if needed; never migrate closed Shift to another Register |

---

## 10. Drawer Integration

### 10.1 Ownership boundaries

| Concern | Owner |
|---------|-------|
| Opening Float | Financial Shift (VO + `opening_float` movement) |
| Drawer Movements | Financial Shift |
| Expected Cash | **Derived** by Shift formula (not Settlement recalculation) |
| Cash Count | Financial Shift (`DrawerCount`) |
| Variance | Derived VO on count |
| Settlement totals / tenders authority | **Check / Settlement Record** |
| Copied cash tender for custody | Attribution association field supplied by adopter from SR/ST |

### 10.2 Expected cash formula (unchanged law)

```
expectedCash =
    OpeningFloat.amount
  + Σ paid_in
  − Σ paid_out
  − Σ safe_drop
  + Σ manual_adjustment          // signed
  + Σ cashTenderAmounts(attributed Settlement Records)
```

**Financial Shift MUST NOT** independently calculate settlement totals, Order totals, or unpaid Check balances to derive expected cash (P10 / D-INV-14 / FS-INV-14).

### 10.3 State permissions for drawer ops

| Status | Movements | Interim count | Final count |
|--------|-----------|---------------|-------------|
| `open` | Yes | Yes | Yes |
| `suspended` | No | No | No (must Resume or BeginClose) |
| `closing` | No | No | Yes |
| `handover_pending` | No | No | Yes |
| `closed` / `archived` | No | No | No |

---

## 11. Settlement Integration (design only)

### 11.1 Attachment model (future SETTLEMENT-ATTRIBUTION-ADOPTION-1)

```
Channel settle → Check finalize → Settlement Record publish
       → ResolveActiveShift(registerId)
       → CreateSettlementAttribution({
            settlementRecordId,
            registerId, financialShiftId,
            operatorUserId,
            cashTenderAmount  // copied from SR/ST cash tenders
         })
```

### 11.2 Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| Shift never owns settlement | No settle commands on Shift |
| Check remains financial owner | ADR-020 unchanged |
| Settlement Record remains immutable | Attribution references only (ADR-026) |
| Attribution does not duplicate financial SSOT | Stores SR id + **custody copy** of cash tender amount for expected-cash formula only — not a competing Revenue ledger |
| Settle succeeds without attribution | Fail-open for money (ADR-028 / D-INV-19); missing attribution = ops gap + retry |

### 11.3 Fail-open vs fail-closed (constitutional binding for next programs)

| Layer | Policy |
|-------|--------|
| **Check settle / SR publish** | **Fail-open w.r.t. attribution** — never roll back money because Shift missing |
| **Attribution create** | Fail if Shift not `open` or resolve ambiguous — record ops gap; retry idempotent |
| **Settlement Context adoption** | Must pass explicit `registerId` when restaurant has >1 Duty-open Register; resolve Shift from that Register |

This closes the Authority policy gap noted by REGISTER-OPERATIONS-PLATFORM-1 for Attribution adoption **at the architecture layer**.

### 11.4 What Shift stores vs what it must not

| May store | Must not store |
|-----------|----------------|
| `settlementRecordId` | Full SR payment snapshot as SSOT |
| `cashTenderAmount` (caller-copied custody fact) | Recalculated grand totals from Orders |
| `operatorUserId`, `attributedAt` | Channel-specific attribution forks |

---

## 12. Failure Analysis

| Scenario | Handling |
|----------|----------|
| **Duplicate open** | Conflict if active exists; idempotent if same `financialShiftId` |
| **Duplicate close** | Idempotent success if already `closed` |
| **Crash during close** | Remain `closing`; retry Close with final count; or AbortClose if no final count |
| **Operator logout** | Register may `ReleaseOperator`; Shift remains until Suspend/Close/Handover |
| **Register offline / device loss** | Shift unaffected; resolve by `registerId`; device unbind optional |
| **Concurrent operators** | One Shift operator; second operator requires Handover or conflict on open |
| **Concurrent close attempts** | Version wins; loser sees closed / conflict; Close idempotent |
| **Shift abandoned** | Recovery close or CancelOpen (if empty); Register cannot close Duty until Shift inactive |
| **Recovery after restart** | ResolveByRegister / ResolveActiveShift; no invented Shift |
| **Duplicate attribution** | Return existing by `settlementRecordId` |
| **Suspend then settle** | Attribution rejected until Resume (ops gap); settle money still committed |
| **Handover timeout** | RejectHandover → `open` |

**Consistency:** Shift writes never participate in Check money TX. Attribution TX is Shift-local after SR exists.

---

## 13. Concurrency Rules

| ID | Rule |
|----|------|
| **FS-CON-01** | Optimistic `version` on every Shift mutation |
| **FS-CON-02** | At most one active Shift per `registerId` (DB unique preferred in future implementation) |
| **FS-CON-03** | AcceptHandover is atomic (close A + open B) |
| **FS-CON-04** | Attribution uniqueness per `settlementRecordId` restaurant-scoped |
| **FS-CON-05** | Resolve ambiguity (>1 active for operator) → conflict, never pick silently |
| **FS-CON-06** | Register Duty/Catalog checks are read-before-write guards, not distributed sagas |

---

## 14. Domain Invariants

| ID | Invariant |
|----|-----------|
| **FS-INV-01** | At most one active Financial Shift (`open\|suspended\|closing\|handover_pending`) per Register |
| **FS-INV-02** | Financial Shift cannot exist without Register |
| **FS-INV-03** | Closed/Archived Shift is immutable for custody and attribution membership |
| **FS-INV-04** | Financial Shift never owns money, never settles, never publishes SR |
| **FS-INV-05** | Financial Shift never changes Check / ST / SR monetary values |
| **FS-INV-06** | Exactly one Drawer per Shift; exactly one `opening_float` |
| **FS-INV-07** | Expected cash uses float + movements + attributed **cash** tenders only — never Orders/open Checks |
| **FS-INV-08** | Variance is derived (`actual − expected`) |
| **FS-INV-09** | Final count required to Close (except CancelOpen empty path) |
| **FS-INV-10** | Attribution requires existing Settlement Record reference |
| **FS-INV-11** | At most one Attribution per `settlementRecordId` |
| **FS-INV-12** | Attribution create allowed only when Shift status = `open` |
| **FS-INV-13** | Handover requires two distinct Users |
| **FS-INV-14** | Open requires Register Catalog=active and Duty=open |
| **FS-INV-15** | Tenant isolation on every Shift command |
| **FS-INV-16** | No Cashier / Employee aggregate |
| **FS-INV-17** | Dining Session ≠ Financial Shift |
| **FS-INV-18** | Fulfilment Station ≠ Register/Shift |
| **FS-INV-19** | Resolution never invents Shift |
| **FS-INV-20** | CancelOpen only on empty open Shift |
| **FS-INV-21** | Archive only from `closed` |
| **FS-INV-22** | Shift does not span multiple Registers |

Aligns with ADR-028 CR-INV-* and CRMP D-INV-* (FS-INV-* are lifecycle elaborations).

---

## 15. ADR Recommendations

| Recommendation | Status |
|----------------|--------|
| **ADR-ARCH-030 — Financial Shift Operational Lifecycle Governance** | **Accepted** — `docs/architecture/adrs/ADR-ARCH-030-financial-shift-operational-lifecycle.md` |
| **ADR-028 addendum (optional)** | Not required; ADR-030 refines 028 without modifying ownership |
| **Do not amend** | ADR-020 / 022 / 026 / 028 money or publication ownership |

Register Operations ADR-029 (if published later) MUST NOT contradict ADR-030; Duty plane is already constitutional under ADR-030.

---

## 16. Platform Integration Review

| Platform | Interaction | Ownership violation? | Circular dependency? |
|----------|-------------|----------------------|----------------------|
| **Order** | None for Shift lifecycle | No | No |
| **Operational Session** | Orthogonal visit lifecycle | No | No |
| **Check** | Settle may later consume resolved `financialShiftId` for attribution only | No | No — Check must not depend on Shift to finalize |
| **Settlement Platform** | None owned by Shift | No | No |
| **Settlement Record** | Attribution references SR id + cash tender copy | No | No |
| **Reporting** | Revenue unchanged; future ops reports from Shift+attribution | No | No |
| **CRMP** | Hosts Shift AR | No — this is lifecycle authority on same AR | No |
| **Register Operations** | Bidirectional guards only | No | No — guard-based, not saga |
| **Operational Device** | Via Register bind; Shift unaffected | No | No |
| **Waiter** | Place unchanged; settle uses resolve | No | No |
| **Kitchen** | None | No | No |
| **Self Ordering / QR** | Place unchanged; staff settle at Register-backed station | No | No |

**Duplicate responsibilities:** None. Custody ≠ Revenue. Attribution ≠ Settlement.

---

## 17. Preparation for Next Programs

| Next program | Completely enabled by this architecture? | Notes |
|--------------|------------------------------------------|-------|
| **SETTLEMENT-CONTEXT-ADOPTION-1** | **Yes** | ResolveActive/ByRegister/ByOperator + explicit registerId + never invent Shift/Register |
| **SETTLEMENT-ATTRIBUTION-ADOPTION-1** | **Yes (architecture prerequisites)** | Attachment contract, open-only attribution, fail-open settle, idempotent SR uniqueness, cash tender copy rule |

### Implementation prerequisites (not architecture gaps)

These do **not** trigger STOP; they are successor **implementation** work:

1. Persist Register Duty / operator assignment (ROP implementation)  
2. Adopt refined Shift statuses in runtime (additive evolution of CRMP Shift status)  
3. Wire settle façade → resolve → `CreateSettlementAttribution`  
4. Ops UI for open/count/close/handover (unauthorized here)

### Architecture Gap Report

**Not required.** No missing constitutional prerequisite for Settlement Context or Attribution adoption remains after this program’s fail-open policy binding and resolution model.

```
REGISTER-OPERATIONS-PLATFORM-1 ✅
FINANCIAL-SHIFT-LIFECYCLE-1    ✅ (this)
        ↓
SETTLEMENT-CONTEXT-ADOPTION-1     ← authorized as next architecture/implementation sequence
        ↓
SETTLEMENT-ATTRIBUTION-ADOPTION-1
```

---

## 18. Production Readiness (Architecture)

| Item | Status |
|------|--------|
| Financial Shift lifecycle defined | **Complete** |
| Remains operational aggregate (not monetary) | **Yes** |
| Never owns money / never settles | **Yes** |
| Register integration fully specified | **Yes** |
| Drawer integration fully specified | **Yes** |
| Settlement Attribution prerequisites (Shift side) | **Satisfied** |
| Ownership boundaries unchanged | **Yes** |
| Certified platforms redesigned | **No** |
| Implementation / migration / UI | **Not authorized** |
| Schema change for new statuses | **Future implementation only** |

Current production foundation (`0077_crmp` + CRMP-IMPLEMENTATION-1) supports `open | handover_pending | closed`. Architecture statuses `suspended | closing | archived` are **additive refinements** for a successor implementation program — not authorized here.

---

## 19. Mapping to Current CRMP Foundation

| Current runtime status | Architecture status | Migration note (future) |
|------------------------|---------------------|-------------------------|
| `open` | `open` | Identity preserve |
| `handover_pending` | `handover_pending` | Preserve |
| `closed` | `closed` | Preserve |
| — | `suspended` | Additive |
| — | `closing` | Additive; until then Close may shortcut `open→closed` with final count |
| — | `archived` | Additive; until then `closed` is retention terminal |

**No production migration authorized by this document.**

---

## 20. Final Certification

| Success criterion | Status |
|-------------------|--------|
| Financial Shift lifecycle completely defined | **Met** |
| Financial Shift remains operational aggregate | **Met** |
| Never owns money | **Met** |
| Never performs settlement | **Met** |
| Register integration fully specified | **Met** |
| Drawer integration fully specified | **Met** |
| Settlement Attribution prerequisites satisfied | **Met** |
| No ownership boundary changes | **Met** |
| No redesign of certified platforms | **Met** |
| Architecture production-ready for successors | **Met** |
| Architecture Impact STOP | **Not triggered** |

### Verdict

**FINANCIAL-SHIFT-LIFECYCLE-1 — ARCHITECTURE CERTIFIED**

Authorized next (separate programs): Financial Shift Lifecycle Implementation (status refinement + ROP duty guards) → SETTLEMENT-CONTEXT-ADOPTION-1 → SETTLEMENT-ATTRIBUTION-ADOPTION-1.  
**ADR-ARCH-030:** Accepted (governance publication complete).

**Explicitly unauthorized by this program:** implementation, schema changes, production migration, UI development, redesign of Check / Settlement Record / Register ownership.
