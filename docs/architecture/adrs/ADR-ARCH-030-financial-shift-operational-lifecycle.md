# ADR-ARCH-030: Financial Shift Operational Lifecycle Governance

> [← ADR-ARCH-028](./ADR-ARCH-028-cash-register-management-platform.md) · [← ADR-ARCH-026](./ADR-ARCH-026-settlement-record-platform.md) · [← ADR-ARCH-022](./ADR-ARCH-022-order-settlement-platform.md) · [← ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [ADR-ARCH-033 →](./ADR-ARCH-033-financial-custody-plane.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Architecture Authority |
| **Program** | ADR-ARCH-030 · FINANCIAL-SHIFT-LIFECYCLE-1 · REGISTER-OPERATIONS-PLATFORM-1 |
| **Date** | 2026-07-24 |
| **Revision** | **1.0** |
| **Supersedes** | — |
| **Refines** | [ADR-ARCH-028](./ADR-ARCH-028-cash-register-management-platform.md) (operational lifecycle governance for Register Duty plane, Financial Shift states, Settlement Attribution prerequisites — **without** moving money ownership or redesigning CRMP aggregate classification) |
| **Does not modify** | ADR-ARCH-020 · 022 · 026 · **028** money / publication / CRMP aggregate ownership (governance elaboration only) |
| **Related programs** | REGISTER-OPERATIONS-PLATFORM-1 · FINANCIAL-SHIFT-LIFECYCLE-1 · CRMP-DOMAIN-DESIGN-1 · CRMP-IMPLEMENTATION-1 · SETTLEMENT-CONTEXT-ADOPTION-1 (successor) · SETTLEMENT-ATTRIBUTION-ADOPTION-1 (successor) |
| **Implementation status** | **Not implemented** — constitutional governance only; no schema / API / runtime / UI authorized by this ADR alone |

---

## 1. Executive Summary

MineuQR constitutionalizes **Financial Shift Operational Lifecycle Governance** as the permanent architectural reference for:

- Register lifecycle (Catalog + Duty)  
- Financial Shift lifecycle  
- Register ↔ Financial Shift relationship  
- Settlement Attribution operational prerequisites  
- Operational accountability boundaries  

**CRMP** remains the sole owner of Register and Financial Shift aggregates (ADR-ARCH-028).  
**Check** remains the sole Monetary Aggregate Root (ADR-ARCH-020 / 022).  
**Settlement Record** remains the immutable Check-published financial document (ADR-ARCH-026).  
**Settlement Attribution** remains an operational association — never a financial source of truth.

This ADR authorizes **architecture governance publication only**. Runtime work requires successor implementation programs under Architecture Authority sequencing.

**STOP conditions:** Not triggered — no certified platform redesign; no ownership movement; no new Aggregate Roots; ADR-022 and ADR-028 unmodified.

---

## 2. Context

### 2.1 Certified baseline

| Concern | Authority | ADR / Program |
|---------|-----------|---------------|
| Monetary Aggregate Root / settle | **Check** | ADR-ARCH-020 · 022 |
| Canonical financial publication | **Settlement Record** | ADR-ARCH-026 |
| Register / Financial Shift / Drawer / Attribution ownership | **CRMP** | ADR-ARCH-028 |
| Register Duty + resolution architecture | Register Operations | REGISTER-OPERATIONS-PLATFORM-1 |
| Financial Shift lifecycle architecture | Financial Shift | FINANCIAL-SHIFT-LIFECYCLE-1 |
| CRMP domain foundation + `0077_crmp` | CRMP | CRMP-IMPLEMENTATION-1 |

### 2.2 Gap this ADR closes

ADR-ARCH-028 constitutionalized CRMP aggregates and high-level lifecycles. Successor architecture programs defined:

- Dual Register planes (Catalog vs Duty)  
- Refined Financial Shift statuses (`suspended`, `closing`, `archived`)  
- Resolution and Settlement Attribution fail-open policy  

Without a governing ADR, implementation programs risk reintroducing ambiguity: conflating Open Register with Open Shift, inventing operational context at settle time, or treating Attribution as financial authority.

### 2.3 Explicit non-goals

- Implementing schema, APIs, services, projections, or UI  
- Creating new Aggregate Roots  
- Creating a Cashier / Employee domain  
- Modifying ADR-ARCH-020 / 022 / 026 / 028 ownership  
- Authorizing Settlement Context or Attribution runtime adoption  

---

## 3. Decision

**MineuQR SHALL govern Register lifecycle, Financial Shift lifecycle, their relationship, and Settlement Attribution operational prerequisites under this ADR — without altering Check monetary ownership, Settlement Record immutability, or CRMP aggregate classification.**

### Constitutional one-liners

1. Register provides **operational context**.  
2. Financial Shift provides **operational accountability**.  
3. Settlement Attribution **references** Financial Shift after Check publishes Settlement Record.  
4. Check settle is **fail-open** with respect to Attribution.  
5. The system **never fabricates** Register or Financial Shift context.  
6. Opening a Register **never** implies opening a Financial Shift.

---

## 4. Aggregate Ownership

### 4.1 Ownership matrix (immutable)

| Concern | Owner | Never |
|---------|-------|-------|
| Operational availability (Catalog) | **Register (CRMP)** | Money, settle, SR |
| Operator assignment / Duty activation | **Register Operations on Register AR** | Money, settle, SR |
| Operational accountability period | **Financial Shift (CRMP)** | Payment lifecycle, settlement totals, SR |
| Drawer accountability / counts / variance | **Financial Shift** | Settlement recalculation as SSOT |
| Attribution window (when attributions may attach) | **Financial Shift status** | Inventing Shift / Register |
| Settlement Attribution association | **CRMP** | Calculating money; owning settle; replacing SR |
| Financial settlement / payment outcome / ST | **Check** | Delegating money ownership to CRMP |
| Immutable financial publication | **Settlement Record** | Mutation by CRMP / Attribution |
| Device credential / pairing | **Operational Device Platform** | Being Register |
| Staff identity | **User** (Identity / Access) | Cashier aggregate inside CRMP |

### 4.2 Aggregate classification (unchanged from ADR-028)

| Candidate | Kind | Owner |
|-----------|------|-------|
| **Register** | Aggregate Root | CRMP |
| **Financial Shift** | Aggregate Root | CRMP |
| **Drawer** | Entity under Financial Shift | CRMP |
| **Settlement Attribution** | Association | CRMP |
| **Check** | Monetary Aggregate Root | Financial Settlement Platform |
| **Settlement Record** | Immutable financial document | Check-published |

**No new Aggregate Roots** are introduced by this ADR.

### 4.3 Ownership vs reference

```
Register (context) ──hosts──► Financial Shift (accountability)
                                    │
                                    ├── Drawer (custody facts)
                                    └── Settlement Attribution ──references──► Settlement Record
                                                                                    ▲
Check ──publishes──────────────────────────────────────────────────────────────────┘
```

Check remains **completely independent** of Shift for finalize success. No circular ownership.

---

## 5. Lifecycle Governance

### 5.1 Register — Catalog plane

| Status | Meaning |
|--------|---------|
| `provisioned` | Created; cannot host Duty open or Financial Shift open |
| `active` | May enter Duty open and host Financial Shifts |
| `inactive` | Must not open Duty or new Shifts; must have zero active Shifts |

```
provisioned → active ⇄ inactive
```

### 5.2 Register — Duty plane

| Status | Meaning |
|--------|---------|
| `closed` | Not in accountability duty cycle |
| `open` | Operationally on duty; may open Financial Shift |
| `suspended` | Duty paused; does **not** auto-close or auto-suspend Shift |

```
closed → open ⇄ suspended
         ↓
       closed
```

**Rules:**

- Duty transitions require Catalog = `active`  
- Catalog `inactive` requires Duty = `closed` and **no active Financial Shift**  
- **`OpenRegister` never opens a Financial Shift**  
- **`CloseRegister` is blocked** while an active Financial Shift exists  

One active Duty cycle per Register (single Duty status; no concurrent open duties).

### 5.3 Financial Shift — canonical states

| Status | Class | Meaning |
|--------|-------|---------|
| `open` | **Active** | Operating; attributions and drawer movements allowed |
| `suspended` | **Active** | Pause; no new attributions / non-close mutations |
| `closing` | **Active** | Close corridor; final count allowed |
| `handover_pending` | **Active** | Transfer offered; limited mutations |
| `closed` | **Terminal custody** | Immutable custody + attribution membership |
| `archived` | **Terminal retention** | Post-closed cold/immutable retention |

**Persisted `pending` status is prohibited.** Open is atomic (float + Drawer + `open`).

```
[*] → open ⇄ suspended
       │
       ├→ closing → closed → archived
       ├→ handover_pending → open | closed (+ successor open on accept)
       └→ closed (CancelOpen empty path only)
```

**Active states** (exactly one active Shift per Register; blocks Register close):

`open` · `suspended` · `closing` · `handover_pending`

**Terminal:** `closed`, `archived`. Closed/Archived **never** return to active.

### 5.4 Relationship sequencing

**Open day (happy path)**

```
Activate Register (catalog)
  → OpenRegister (duty) + AssignOperator
  → OpenFinancialShift (float)
  → Settlements → Settlement Attribution (when context valid)
```

**Close day (happy path)**

```
BeginCloseFinancialShift → final Drawer Count → CloseFinancialShift
  → optional CloseRegister (duty)
  → optional ArchiveFinancialShift
```

Handover: Initiate → final count → Accept closes outgoing Shift and opens successor on the **same** Register.

### 5.5 Resolution governance

| Resolver | Rule |
|----------|------|
| Active Shift by Register | At most one active Shift for `registerId`; never invent |
| Shift by Operator | At most one active Shift per operator policy; ambiguity → conflict |
| Active Register (settle context) | Explicit `registerId` or exactly one Duty-open Register; ambiguity → conflict |

**Settlement Context and Attribution MUST NOT fabricate Register or Financial Shift.**

---

## 6. Operational Invariants

| ID | Invariant |
|----|-----------|
| **OL-INV-01** | One active Register Duty cycle per Register (`closed` \| `open` \| `suspended` — single status). |
| **OL-INV-02** | Exactly one active Financial Shift per Register (`open` \| `suspended` \| `closing` \| `handover_pending`). |
| **OL-INV-03** | Financial Shift cannot exist without Register. |
| **OL-INV-04** | Register may exist without Financial Shift. |
| **OL-INV-05** | Settlement Attribution never invents a Financial Shift or Register. |
| **OL-INV-06** | Register close / catalog deactivate is blocked while an active Shift exists. |
| **OL-INV-07** | Closed Financial Shift never returns to an active status. |
| **OL-INV-08** | Archived Financial Shift is immutable and reachable only from `closed`. |
| **OL-INV-09** | Register never owns money, payment, settlement, or Settlement Record. |
| **OL-INV-10** | Financial Shift never owns settlement, payment lifecycle, settlement totals, or Settlement Record. |
| **OL-INV-11** | Settlement Record remains immutable; Attribution never mutates it. |
| **OL-INV-12** | Opening Register never implies opening Financial Shift. |
| **OL-INV-13** | Persisted Financial Shift status `pending` is forbidden. |
| **OL-INV-14** | Attribution create allowed only when Shift status = `open` and canonical Register context exists. |
| **OL-INV-15** | Expected drawer cash MUST NOT be derived from Order totals or unpaid Checks. |
| **OL-INV-16** | No Cashier / Employee Aggregate inside CRMP or Register Operations. |
| **OL-INV-17** | Dining Session ≠ Financial Shift; Fulfilment Station ≠ Register. |
| **OL-INV-18** | Tenant isolation: all Register / Shift / Attribution commands carry `restaurantId`. |

Aligns with ADR-028 CR-INV-* and program FS-INV-* / RO-INV-* (OL-INV-* are lifecycle governance IDs).

---

## 7. Failure Policy

| Scenario | Governance |
|----------|------------|
| **Duplicate Open** (Register or Shift) | Idempotent success if already in target state for same identity; conflict if competing active Shift / duty violation |
| **Duplicate Close** | Idempotent success if already closed |
| **Crash recovery** | Persist intermediate Shift `closing`; retry Close after final count, or abort close if policy allows and no final count; AcceptHandover atomic |
| **Operator logout** | May release Register operator assignment; Shift remains until Suspend / Close / Handover |
| **Register offline / device loss** | Register Duty and Shift unaffected; resolve by `registerId`; device unbind optional; history preserved |
| **Concurrent operators** | One Shift operator; second operator requires Handover (or conflict on second open) |
| **Concurrent close** | Optimistic concurrency on Shift `version`; loser observes closed / conflict; Close idempotent |
| **Shift abandonment** | Recovery close or empty CancelOpen path; Register cannot close Duty until Shift inactive |
| **Retry behaviour** | All mutating lifecycle commands retry-safe via state predicates + version (+ future `commandId`) |
| **Idempotency** | Attribution unique by `settlementRecordId`; close/open/suspend/resume idempotent on terminal predicates |

---

## 8. Settlement Policy

### 8.1 Fail-open (constitutional)

**Check settlement and Settlement Record publication are fail-open with respect to Settlement Attribution.**

Settlement completion **MUST NEVER** fail solely because Attribution cannot be created.

Missing Attribution is an **operational control gap**, remediated by CRMP retry / correction — never by rolling back money or rewriting Settlement Record.

### 8.2 Attribution creation gates

Settlement Attribution MAY be created only when **all** hold:

1. Settlement Record already exists  
2. Register operational context exists (resolved — never invented)  
3. Active Financial Shift exists on that Register with status = `open`  
4. Canonical operator context is available (`operatorUserId`)  

Otherwise: settle succeeds; Attribution deferred / ops gap; retries are idempotent.

### 8.3 What Attribution may and must not do

| MAY | MUST NOT |
|-----|----------|
| Reference `settlementRecordId`, `registerId`, `financialShiftId`, `operatorUserId` | Calculate or redefine settlement totals |
| Copy caller-supplied cash tender amount for **custody expected-cash** only | Own settlement or replace Settlement Record |
| Attach after successful settle | Become Revenue SSOT or second monetary root |

---

## 9. Platform Impact

### 9.1 Affected (governance consumers)

| Platform | Impact |
|----------|--------|
| **CRMP** | Lifecycle governance for Register + Financial Shift + Attribution prerequisites |
| **Register Operations** | Duty / Catalog / resolution rules constitutionalized |
| **Financial Shift** | Canonical statuses + active/terminal classification constitutionalized |
| **Settlement Attribution** | Creation gates + fail-open settle policy constitutionalized |
| **Operational Devices** | Remain references via Register bind; never Register / Shift |

### 9.2 Unaffected (ownership preserved)

| Platform | Impact |
|----------|--------|
| **Order** | None |
| **Operational Session** | None (orthogonal visit lifecycle) |
| **Check** | Remains sole financial settle owner |
| **Settlement** (Check-owned) | Unchanged |
| **Settlement Record** | Remains immutable publication |
| **Reporting** | Revenue law unchanged; future ops reports additive only |

### 9.3 Implementation constraints (mandatory for successors)

Future implementations MUST:

- Preserve aggregate boundaries and ownership in §4  
- Remain idempotent and retry-safe per §7  
- Avoid duplicated financial calculations and new financial sources of truth  
- Adopt refined Shift statuses additively relative to CRMP foundation (`open \| handover_pending \| closed`)  
- Never require ADR-022 or ADR-028 redesign  

---

## 10. Alternatives Considered

| Alternative | Rejection |
|-------------|-----------|
| **A. Open Register implies Open Shift** | Violates OL-INV-12; couples duty to custody float; blocks Register without till open |
| **B. Persisted Shift `pending`** | Orphan reserved Shifts; Open must be atomic |
| **C. Fail-closed settle when no Shift** | Violates money finality; would couple Check to CRMP availability |
| **D. Move Attribution under Settlement Record** | Violates SR immutability / publication model (ADR-026) |
| **E. New Cashier Aggregate** | Forbidden by ADR-028; Staff = User + Screen capability |
| **F. Session as Financial Shift** | Violates P12 / OL-INV-17 |
| **G. Redesign ADR-028 aggregates** | Unnecessary; this ADR refines lifecycle governance only |

---

## 11. Consequences

### Positive

- Unambiguous dual-plane Register model before implementation  
- Canonical Shift states including crash-safe `closing` and retention `archived`  
- Clear Attribution prerequisites without inventing context  
- Preserves certified financial constitution (020 / 022 / 026 / 028)  
- Unblocks SETTLEMENT-CONTEXT-ADOPTION-1 and SETTLEMENT-ATTRIBUTION-ADOPTION-1 sequencing  

### Trade-offs

- Runtime status set must evolve additively from CRMP foundation statuses  
- Register Duty persistence may require additive fields in a future implementation program  
- Attribution can lag settle (operational gap by design)  

### Neutral

- ADR-029 (Register Operations Platform), if published later, MUST NOT contradict this ADR; Duty plane here is already constitutional  

---

## 12. ADR Registry Update

| Field | Value |
|-------|-------|
| **ADR** | ADR-ARCH-030 |
| **Title** | Financial Shift Operational Lifecycle Governance |
| **Status** | **Accepted** |
| **Implementation Status** | Not implemented (governance only) |
| **Refines** | ADR-ARCH-028 |
| **Does not modify** | ADR-ARCH-020 · 022 · 026 · 028 ownership |

Registry row and document index updated in `docs/architecture/constitution/ADR-Registry.md`.

---

## 13. Publication

| Artifact | Path |
|----------|------|
| **ADR** | `docs/architecture/adrs/ADR-ARCH-030-financial-shift-operational-lifecycle.md` |
| **Registry** | `docs/architecture/constitution/ADR-Registry.md` |
| **Source architectures** | `docs/engineering/programs/REGISTER-OPERATIONS-PLATFORM-1/ARCHITECTURE.md` · `docs/engineering/programs/FINANCIAL-SHIFT-LIFECYCLE-1/ARCHITECTURE.md` |
| **Publication record** | `docs/engineering/programs/FINANCIAL-SHIFT-LIFECYCLE-1/ADR-ARCH-030-PUBLICATION.md` |

### Migration / runtime

| Stage | Authorized by this ADR? |
|-------|-------------------------|
| Governance publication | **Yes** |
| Schema / migration | **No** |
| Implementation / UI / production | **No** |

Successor sequencing (unauthorized here): Financial Shift Lifecycle Implementation → SETTLEMENT-CONTEXT-ADOPTION-1 → SETTLEMENT-ATTRIBUTION-ADOPTION-1.

---

## 14. Final Certification

| Success criterion | Status |
|-------------------|--------|
| Ownership boundaries preserved | **Met** |
| Register lifecycle governed (Catalog + Duty) | **Met** |
| Financial Shift lifecycle governed | **Met** |
| Settlement Attribution prerequisites governed | **Met** |
| Check remains sole financial owner | **Met** |
| No new financial source of truth | **Met** |
| No new Aggregate Roots | **Met** |
| ADR-022 unmodified | **Met** |
| ADR-028 unmodified (refined only) | **Met** |
| Future implementation unblocked without ambiguity | **Met** |
| Architecture Impact STOP | **Not triggered** |
| Implementation / migration / production authorized | **No** |

### ADR Verdict

**ADR-ARCH-030 ACCEPTED — Financial Shift Operational Lifecycle Governance constitutionalized.**

Implementation remains unauthorized until Architecture Authority sequences and certifies successor programs.
