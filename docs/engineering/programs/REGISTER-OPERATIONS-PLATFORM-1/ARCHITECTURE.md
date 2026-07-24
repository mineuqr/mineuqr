# REGISTER-OPERATIONS-PLATFORM-1 — Architecture & Domain Design

| Field | Value |
|---|---|
| **Program** | REGISTER-OPERATIONS-PLATFORM-1 |
| **Date** | 2026-07-24 |
| **Mode** | Architecture & Domain Design only |
| **Implementation** | **Not authorized** |
| **Migration / UI** | **Not authorized** |
| **Constitution** | ADR-ARCH-020 · 022 · 026 · **028** · CRMP-DOMAIN-DESIGN-1 · CRMP-IMPLEMENTATION-1 · Migration 0077 |
| **Verdict** | **REGISTER OPERATIONS ARCHITECTURE CERTIFIED** |

---

## 1. Executive Summary

**Register Operations Platform (ROP)** is the operational lifecycle and resolution authority for the **Register** Aggregate Root that already lives in CRMP (ADR-ARCH-028).

ROP does **not** create a second Register aggregate. It defines:

- Dual lifecycle (catalog availability + duty cycle)  
- Operator assignment  
- Device binding / resolution policies  
- Integration contracts with Financial Shift and Settlement Attribution  
- Failure, concurrency, and event models  

**Register never owns money, never settles, never publishes Settlement Records.**

This architecture closes the gap that stopped `SETTLEMENT-ATTRIBUTION-ADOPTION-1`: absence of canonical Register operational context.

| Owns money? | Owns Register duty cycle? |
|-------------|---------------------------|
| **Check** | **Register Operations (commands/policies) on CRMP Register AR** |

**STOP conditions:** Not triggered — no certified platform redesign required.

---

## 2. Domain Discovery

### 2.1 What is a Register?

A **Register** is a restaurant-scoped **operational accountability station**: a named point of custody and settlement *context* (e.g. “Front Counter”, “Drive-Thru Window”).

It is **not**:

- A Device / Screen  
- A Staff User / Cashier domain  
- A Dining Session  
- An Order fulfilment Station  
- A Check / Settlement / Settlement Record  

### 2.2 Why does it exist?

To answer, for every attributed settlement and drawer period:

- Which operational station was accountable?  
- Which operator was assigned?  
- Which device (if any) was bound?  
- Which Financial Shift (drawer period) ran on that station?  

Without Register, Financial Shift and Settlement Attribution have no stable operational parent.

### 2.3 Who owns it?

| Concern | Owner |
|---------|-------|
| Register Aggregate Root (identity, persisted state) | **CRMP** (ADR-028) |
| Register **operational lifecycle policies & commands** | **Register Operations Platform** (this program) |
| Device credential / pairing | **Operational Device Platform** |
| Staff identity | **User** (Identity / Access) |
| Money / settle / SR | **Check / Settlement Record** |

### 2.4 Who operates it?

Staff **Users** with restaurant access + future `register_operations` capability (executed via Operational Screens — **no Cashier domain**).

### 2.5 Relationships

| Peer | Relationship |
|------|----------------|
| **Business (Restaurant)** | Tenant owner — every Register carries `restaurantId` |
| **Device** | Optional **binding reference** (`deviceId`); Device ≠ Register |
| **Operator** | Optional **assignment reference** (`assignedOperatorUserId`) while on duty |
| **Financial Shift** | Child accountability period AR — **requires** Register; Register may exist without Shift |
| **Drawer** | Owned by Financial Shift, not Register |

---

## 3. Aggregate Design

### 3.1 Decision: Register remains the Aggregate Root

**Register stays the CRMP Aggregate Root** (ADR-028).  
ROP does **not** introduce a parallel AR.

```
Register (CRMP AR)  ← ROP defines duty lifecycle + resolution commands
  └── Financial Shift (CRMP AR)  [0..1 active]
        └── Drawer / Movements / Counts / Handover / Attributions
```

### 3.2 Owned vs referenced

| Kind | Type |
|------|------|
| **Aggregate Root** | Register |
| **Entities (on Register)** | none required beyond root; optional `RegisterOperatorAssignment` as entity/VO history |
| **Value Objects** | RegisterCatalogStatus, RegisterDutyStatus, RegisterIdentity, DeviceBinding, OperatorAssignment |
| **References** | `restaurantId`, `deviceId?`, `assignedOperatorUserId?` |
| **Policies** | ResolveActiveRegister, ResolveByDevice, ResolveByOperator, OneActiveShiftPerRegister (enforced with Shift AR) |

---

## 4. Entity & Value Object Model

### 4.1 Value Objects

| VO | Definition |
|----|------------|
| **RegisterId** | Opaque stable id (`reg_…`) |
| **RegisterCatalogStatus** | `provisioned` \| `active` \| `inactive` — *already in CRMP implementation* |
| **RegisterDutyStatus** | `closed` \| `open` \| `suspended` — *operational duty cycle (this architecture)* |
| **DeviceBinding** | `{ deviceId } \| null` |
| **OperatorAssignment** | `{ operatorUserId, assignedAt } \| null` |
| **RegisterDisplayName** | Human label (not identity) |

### 4.2 Dual-status model (critical)

| Plane | Status | Meaning |
|-------|--------|---------|
| **Catalog** | provisioned / active / inactive | Exists in restaurant catalog; allowed to be used |
| **Duty** | closed / open / suspended | Currently in an accountability duty cycle |

**Rules:**

- Duty transitions allowed only when Catalog = `active`  
- Catalog `inactive` requires Duty = `closed` and **no active Financial Shift**  
- `provisioned` cannot enter Duty `open` until Catalog `active`  

This refines ADR-028 without moving money ownership. Implementation may persist duty status as an additive field in a future program (not authorized here).

### 4.3 Mapping to current CRMP statuses

| Current CRMP `status` | Catalog | Duty (default interpretation) |
|----------------------|---------|-------------------------------|
| `provisioned` | provisioned | closed |
| `active` | active | closed *(until Open Register)* |
| `inactive` | inactive | closed |

ROP commands **Open/Close/Suspend/Resume** operate on the **Duty** plane once Catalog is `active`.

---

## 5. Register State Machine

### 5.1 Catalog

```
[*] → provisioned → active ⇄ inactive
```

(Unchanged from CRMP-DOMAIN-DESIGN / implementation.)

### 5.2 Duty (Register Operations)

```
closed → open ⇄ suspended
         ↓
       closed
```

| From | To | Command | Guards |
|------|----|---------|--------|
| closed | open | `OpenRegister` | Catalog=active; no conflicting open duty; operator assign policy |
| open | suspended | `SuspendRegister` | Catalog=active |
| suspended | open | `ResumeRegister` | Catalog=active |
| open | closed | `CloseRegister` | **No active Financial Shift**; operator released or released as part of close |
| suspended | closed | `CloseRegister` | Same as open→closed |

**Forbidden:**

- Open when Catalog ≠ active  
- Close while Financial Shift is `open` or `handover_pending`  
- Duty open on inactive catalog  
- Two concurrent Duty=`open` for same Register (single duty cycle)

---

## 6. Command Model

All commands are **idempotent** where noted. Ownership: ROP application services mutating CRMP Register AR (future implementation).

| Command | Purpose | Idempotency | Notes |
|---------|---------|-------------|-------|
| `ProvisionRegister` | Create catalog entry | By `registerId` | Existing CRMP |
| `ActivateRegister` | Catalog → active | Yes if already active | Existing CRMP |
| `DeactivateRegister` | Catalog → inactive | Yes if already inactive | Requires Duty closed + no active Shift |
| `OpenRegister` | Duty closed→open; optional AssignOperator | Yes if already open for same operator policy | Does **not** open Financial Shift |
| `CloseRegister` | Duty → closed; ReleaseOperator | Yes if already closed | Blocked if active Shift |
| `SuspendRegister` | open→suspended | Yes if suspended | Shift may remain open (custody continues) — policy: **Shift stays**; settle attribution still allowed unless Shift closed |
| `ResumeRegister` | suspended→open | Yes if open | |
| `AssignOperator` | Set assigned operator | Last-write with version / reject if different operator without Release | Two distinct users for handover of Shift remain Shift’s concern |
| `ReleaseOperator` | Clear assignment | Yes if already null | |
| `BindDevice` / `UnbindDevice` | Device reference | Yes | Existing CRMP |
| `ResolveActiveRegister` | Query: restaurant + optional filters → open Duty register(s) | Read | Policy below |
| `ResolveRegisterByDevice` | Query by bound `deviceId` | Read | |
| `ResolveRegisterByOperator` | Query by `assignedOperatorUserId` where Duty=open | Read | |

### 6.1 Resolution policies (canonical)

| Resolver | Rule |
|----------|------|
| **ByDevice** | Exactly one Register with `deviceId` match and Catalog=active; prefer Duty=open, else return catalog hit with duty status |
| **ByOperator** | At most one Duty=open Register with that assigned operator per restaurant; if zero → not found; if >1 → conflict (invariant violation) |
| **ActiveRegister** | For settle context: require **exactly one** Duty=open Register for the restaurant **or** explicit `registerId` supplied by client. Ambiguity → conflict (do not guess) |

**Settlement context must never invent a Register.**

---

## 7. Event Model (conceptual)

Publisher: Register Operations / CRMP Register command handler (future).  
Consumers: audit, ops UI, settle-context cache (read models).  
**Not** Check finalize. Events are **not** financial.

| Event | Meaning | TX boundary |
|-------|---------|-------------|
| `RegisterProvisioned` | Catalog created | Register write TX |
| `RegisterActivated` / `RegisterDeactivated` | Catalog availability | Register write TX |
| `RegisterOpened` / `RegisterClosed` | Duty cycle | Register write TX |
| `RegisterSuspended` / `RegisterResumed` | Duty pause | Register write TX |
| `OperatorAssigned` / `OperatorReleased` | Operator reference | Register write TX |
| `DeviceBoundToRegister` / `DeviceUnboundFromRegister` | Device reference | Register write TX |
| `RegisterResolved` | Read-model/audit of resolution (optional) | Query-side; no write |

**Idempotency:** consumers key on `(registerId, eventId)` or `(registerId, version)`.  
**Ordering:** per-`registerId` monotonic `version`.  
**No cross-aggregate saga** with Check required.

---

## 8. Device Integration Matrix

| Device / channel | Requires Register? | Typical binding | Notes |
|------------------|--------------------|-----------------|-------|
| **Settlement Station / Counter POS screen** | **Yes** (for attributed settle) | 1 device ↔ 1 Register (usual) | Primary ROP host |
| **Drive-Thru / Counter** | **Yes** | Same | |
| **Waiter Display** | **No** for place; **Yes context** when waiter performs settle | Optional shared counter Register resolve | Place uses Session/Order only |
| **Kitchen Display** | **Never** | — | Kitchen Platform unchanged |
| **Expo Display** | **Never** | — | |
| **Pickup Display** | **Never** | — | |
| **Customer Display** | **Never** | — | |
| **Print Monitor** | **Never** | — | |
| **Self Ordering Kiosk** | **Never** for place | — | Customer does not settle; cashier uses Settlement Station Register |
| **QR Ordering** | **Never** | — | |

### Device rules

| Rule | Decision |
|------|----------|
| Multiple devices share one Register? | **Allowed** (e.g. two tablets → one counter Register) via shared `registerId` resolve — binding is optional; prefer explicit settle `registerId` |
| One Register move between devices? | **Yes** via Unbind + Bind (reference only); history untouched |
| Register without device? | **Yes** — dashboard/staff settle with explicit Register selection |

**No new device role “cashier”.** Use capability `register_operations` on an appropriate settlement-facing screen role (future Screen Catalog program).

---

## 9. Financial Shift Integration

### 9.1 Ownership

| Lifecycle | Owner |
|-----------|-------|
| Register catalog + duty | Register / ROP |
| Financial Shift open/close/handover/drawer | **Financial Shift AR (CRMP)** — detailed in FINANCIAL-SHIFT-LIFECYCLE-1 |
| Settlement Attribution | CRMP association on Shift |

### 9.2 Sequencing

**Opening day (happy path)**

```
Provision/Activate Register (catalog)
  → OpenRegister (duty) + AssignOperator
  → OpenFinancialShift (float)     [Shift program]
  → Settlements → Attribution      [Attribution program]
```

**Closing day**

```
CloseFinancialShift (final count)  [Shift program]
  → ReleaseOperator (optional)
  → CloseRegister (duty)
  → optional DeactivateRegister (catalog)
```

### 9.3 Invariants

| ID | Rule |
|----|------|
| **RO-INV-01** | Exactly **one active Financial Shift** (`open`\|`handover_pending`) per Register |
| **RO-INV-02** | Financial Shift **cannot** exist without Register |
| **RO-INV-03** | Register **may** exist without Financial Shift |
| **RO-INV-04** | `CloseRegister` forbidden while active Shift exists |
| **RO-INV-05** | `OpenFinancialShift` requires Register Catalog=`active` and Duty=`open` (or `suspended` only if policy allows — **default: Duty must be `open`**) |
| **RO-INV-06** | Suspend Register does **not** auto-close Shift |
| **RO-INV-07** | Attribution targets open Shift on a Register; never writes Check money |

### 9.4 State synchronization

No distributed saga. Synchronization is **guard-based**:

- Shift commands load Register and assert guards  
- Register close loads active Shift query and rejects if present  

---

## 10. Failure Analysis

| Scenario | Handling |
|----------|----------|
| Duplicate OpenRegister | Idempotent success if already open (same register) |
| Duplicate CloseRegister | Idempotent success if already closed |
| Operator logout | `ReleaseOperator`; Duty may remain open; Shift remains until closed/handed over |
| Operator crash | Same — recovery via ResolveByRegister + re-Assign or Handover |
| Device crash | Device unbind optional; Register Duty unaffected; settle via explicit registerId |
| Network interruption | Command retries; optimistic `version` on Register |
| Register abandoned (Duty open, no operator) | Ops: AssignOperator or CloseRegister after Shift closed |
| Shift abandoned | FINANCIAL-SHIFT-LIFECYCLE recovery (count/close); Register cannot close until then |
| Concurrent operators Assign | Reject second Assign unless prior Release (or forced take-over with audit — policy) |
| Concurrent devices Bind | Last bind wins with version; or reject if bound to other device (policy: **reject steal without Unbind**) |
| Resolve ambiguity (>1 open Register) | Conflict error — client must pass explicit `registerId` |

**Retry / idempotency:** all mutating commands accept client `commandId` (future) or rely on state predicates + Register `version`.

---

## 11. Concurrency Rules

| Resource | Mechanism |
|----------|-----------|
| Register | Optimistic concurrency on `version` |
| Active Shift per Register | Domain conflict if second open (CRMP D-INV-02) |
| Operator assignment | Single assigned operator per open Duty Register |
| Device bind | Unique binding preference: one primary deviceId per Register; many devices may *resolve* same registerId without bind |

---

## 12. Domain Invariants (Register Operations)

| ID | Invariant |
|----|-----------|
| **RO-INV-10** | Register never owns money, tenders, or Settlement Records |
| **RO-INV-11** | Register never calls Check finalize / settle |
| **RO-INV-12** | No Cashier Aggregate / Employee Aggregate inside ROP |
| **RO-INV-13** | Tenant isolation on every Register command |
| **RO-INV-14** | Fulfilment Station ≠ Register |
| **RO-INV-15** | Dining Session ≠ Register Duty |
| **RO-INV-16** | Resolution never invents Register or Shift |
| **RO-INV-17** | Catalog inactive ⇒ Duty closed ∧ no active Shift |

---

## 13. Platform Integration Review

| Platform | Interaction | Ownership violation? |
|----------|-------------|----------------------|
| Order | None for Register lifecycle | No |
| Operational Session | Orthogonal visit lifecycle | No |
| Check | Settle may **consume** resolved registerId (future context) — Check still settles | No |
| Settlement / ST | None | No |
| Settlement Record | Attribution references SR | No |
| Reporting | Unchanged Revenue; optional ops reports later | No |
| CRMP | Hosts Register AR | No — ROP is lifecycle authority on same AR |
| Operational Device | Optional bind / resolve | No |
| Waiter | Place unchanged; settle uses resolve | No |
| Kitchen / Expo / Pickup | No Register required | No |
| Self Ordering / QR | Place unchanged; pay at Register-backed station | No |

**Circular dependencies:** None. Check does not depend on ROP at compile time until SETTLEMENT-CONTEXT adopts an optional port; ROP never depends on Check.

**No new financial ownership.**

---

## 14. Preparation for Next Programs

| Next program | Enabled by this architecture? | Remaining gap |
|--------------|-------------------------------|---------------|
| **FINANCIAL-SHIFT-LIFECYCLE-1** | **Yes** — Register Duty + RO-INV open guards + sequencing defined | Implement Shift open/close/count UX & services (Shift AR already in CRMP) |
| **SETTLEMENT-CONTEXT-ADOPTION-1** | **Yes** — ResolveActive/ByDevice/ByOperator + explicit registerId policy | Wire façade inputs (`registerId`, `operatorUserId`, active Shift lookup) |
| **SETTLEMENT-ATTRIBUTION-ADOPTION-1** | **Partially** — Register context path defined | Still requires: (1) open Financial Shift in prod, (2) settle context wiring, (3) Authority policy on fail-open vs fail-closed attribution |

### Architecture Gap (Attribution only — not a ROP failure)

```
REGISTER-OPERATIONS-PLATFORM-1 (this) ✅
        ↓
FINANCIAL-SHIFT-LIFECYCLE-1     ← required for open Shift + float
        ↓
SETTLEMENT-CONTEXT-ADOPTION-1   ← required for registerId/shiftId/operator on settle
        ↓
SETTLEMENT-ATTRIBUTION-ADOPTION-1
```

**Phase 9 decision:** ROP architecture **fully enables** Shift Lifecycle and Settle Context programs.  
Attribution remains blocked on those successors — documented gap, **not** a reason to redesign ROP or certified financial platforms.

**No Architecture Impact STOP** for ROP itself.

---

## 15. ADR Recommendations

| Recommendation | Status |
|----------------|--------|
| **ADR-ARCH-030 — Financial Shift Operational Lifecycle Governance** | **Accepted** — constitutionalizes Register Catalog/Duty, Shift lifecycle, Attribution fail-open; OpenRegister ≠ OpenFinancialShift |
| **ADR-ARCH-029 — Register Operations Platform** | Optional later; MUST NOT contradict ADR-030 (device matrix may still be elaborated) |

Do **not** amend ADR-020/022/026/028 money or publication ownership.

---

## 16. Production Readiness (Architecture)

| Item | Status |
|------|--------|
| Register lifecycle defined | **Complete** |
| Register remains operational AR in CRMP | **Yes** |
| Never owns money / settle | **Yes** |
| Financial Shift integration specified | **Yes** |
| Device matrix complete | **Yes** |
| Attribution Register-side prerequisites | **Specified** |
| Implementation / migration / UI | **Not authorized** |
| Schema change for duty/operator fields | **Future implementation program only** |

Current production schema (`crmp_registers`) supports identity + catalog status + device bind. Duty status + operator assignment may require additive columns in a future **implementation** program — **not** this architecture program.

---

## 17. Final Certification

| Success criterion | Status |
|-------------------|--------|
| Register lifecycle completely defined | **Met** |
| Register remains operational aggregate | **Met** |
| Never owns money | **Met** |
| Never performs settlement | **Met** |
| Financial Shift integration fully specified | **Met** |
| Settlement Attribution Register prerequisites specified | **Met** |
| No ownership boundary changes | **Met** |
| No redesign of certified platforms | **Met** |
| Architecture production-ready (for successor programs) | **Met** |

### Verdict

**REGISTER-OPERATIONS-PLATFORM-1 — ARCHITECTURE CERTIFIED**

Authorized next (separate programs): Register Operations Implementation (duty/operator persistence) → Financial Shift Lifecycle Implementation → SETTLEMENT-CONTEXT-ADOPTION-1 → SETTLEMENT-ATTRIBUTION-ADOPTION-1.  
**ADR-ARCH-030:** Accepted (governs Register Duty + Financial Shift lifecycle). **FINANCIAL-SHIFT-LIFECYCLE-1:** Architecture certified.
