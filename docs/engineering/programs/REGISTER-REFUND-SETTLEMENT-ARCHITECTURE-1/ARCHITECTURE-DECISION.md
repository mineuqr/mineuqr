# REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 — Architecture Decision

| Field | Value |
|---|---|
| **Program** | REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 |
| **Phase** | Financial Settlement Platform |
| **Mode** | Architectural Design (no implementation) |
| **Date** | 2026-07-26 |
| **Authority** | ADR-ARCH-020 · 026 · 028 · 030 · 032 · 027 |
| **Predecessor** | REFUND-REGISTER-ADOPTION-1 (PRODUCTION CERTIFIED) |
| **Verdict** | **ARCHITECTURE CERTIFIED** |

---

## 1. Decision (Constitutional)

**Register Refund Settlement** is the CRMP-owned **custody execution plane** for a published Refund Document (RF / compensating Settlement Record `recordKind=refund`).

It is **not**:

- A second monetary Aggregate  
- A mutation of the Refund Document  
- Automatic proof that cash physically left the drawer  

### Separation of planes

```
Financial Decision          →  Check Aggregate (ApplyRefund)
Immutable Financial Document →  Settlement Record + RF-###### identity
Cash / Custody Execution    →  Register Refund Settlement (CRMP Attribution)
```

**Law:** A Refund Document SHALL NOT automatically imply that cash has physically left the register. Cash impact occurs only when Register Refund Settlement successfully attributes a cash tender under an open Financial Shift.

This decision **refines and names** behavior already mandated by ADR-ARCH-032 (AttributeRefund, RF-INV-REG01…03, RF-INV-T03) and certified by REFUND-REGISTER-ADOPTION-1. It does **not** redefine Check money ownership.

---

## 2. Ownership

| Concern | Owner | Kind |
|---------|-------|------|
| Refund money decision / budget / allocations | **Check Aggregate** | Monetary SSOT |
| Compensating Settlement Record (`recordKind=refund`) | **Check Aggregate** (Financial Producer) | Immutable Financial Document |
| RF operational identity (`RF-######`) | **Operational Document Identity** (Settlement owner in registry) | Identity plane only |
| **Register Refund Settlement** (custody correlation + expected cash) | **CRMP — Financial Shift / Settlement Attribution** | Custody plane |
| Cash Drawer physical movements (`paid_in` / `paid_out` / …) | **CRMP — Drawer** | Optional future explicit movement; **not required** for refund custody today |
| Settlement Ledger | Presentation / Unified Financial Entry Point | Not authority |
| Reporting Net / Gross | **Reporting Platform** | Consumer of publications |

### Forbidden ownership

| Actor | Must not |
|-------|----------|
| Register / Drawer / Shift | Authorize refund amount, mutate RF/SR money, invent refund truth from variance |
| Settlement Ledger | Decide money or custody |
| Reporting | Invent refund nets outside Settlement publications |
| RF number allocator | Participate in custody or money |

---

## 3. Lifecycle (Register Refund Settlement)

Operational custody lifecycle for a published RF:

```
RF_CREATED
   │  (Check TX committed; RF identity allocated)
   ▼
AWAITING_REGISTER_SETTLEMENT
   │  (Attribution eligible OR deferred — fail-open)
   ├─► REGISTER_SETTLEMENT_EXECUTED  (Attribution created / already_applied)
   │         │
   │         ▼
   │      COMPLETED
   │
   └─► REGISTER_SETTLEMENT_SKIPPED / FAILED  (ops control gap; money+RF remain valid)
              │
              └─► may retry → EXECUTED → COMPLETED
```

### Tender modes

| Tender | Custody effect at Register Settlement |
|--------|----------------------------------------|
| Cash | Expected Cash ↓ by cash refund amount (signed negative attribution) |
| Card / network / electronic | Attribution with `cashTenderAmount = 0.00` (association only) |
| Mixed | Cash portion only affects Expected Cash |
| Future methods | Extend tender classification map; never change Check money rules |

### Explicit non-implication

| Fact | Implies cash left drawer? |
|------|---------------------------|
| RF created | **No** |
| Card RF attributed | **No** |
| Cash RF attributed | **Expected Cash** decreased (custody model); not a separate `paid_out` Drawer Movement under current certified design |
| Attribution skipped | **No** custody change; RF still valid |

---

## 4. Register responsibilities

| Responsibility | Definition |
|----------------|------------|
| Cash outflow (custody) | Signed negative cash tender on Attribution when refund tender is cash |
| Drawer / Expected Cash | Shift Expected Cash formula includes Σ attribution cash (signed) |
| Shift association | Open Financial Shift required for Attribution create |
| Cashier attribution | Operator from Settlement Context (never invented) |
| Timestamp | Attribution createdAt / event time |
| Audit trail | Append-only Attribution + `SettlementAttributed` (by SR id) |
| Register ownership | Attribution bound to resolved Register id |

Register MUST NOT re-decide refund amount or eligibility.

---

## 5. Invariants (Register Refund Settlement)

| ID | Invariant |
|----|-----------|
| **RRS-INV-01** | Register Settlement requires a committed RF Settlement Record (`recordKind=refund`) |
| **RRS-INV-02** | At most one successful Attribution per refund Settlement Record id (idempotent) |
| **RRS-INV-03** | Cancelled / non-completed Refund domain status MUST NOT receive new Attribution (if cancel model exists; today completed-only path) |
| **RRS-INV-04** | Settlement amount for custody MUST derive from published SR payment snapshot — never UI-invented |
| **RRS-INV-05** | Cash custody delta applies only to cash tender portions |
| **RRS-INV-06** | Attribution MUST NOT roll back Check refund commit (fail-open — RF-INV-T03) |
| **RRS-INV-07** | Incomplete Register / Shift / operator context → skip/defer — never fabricate context (ADR-030) |
| **RRS-INV-08** | Drawer variance MUST NOT redefine guest Refund financial truth (RF-INV-REG03) |
| **RRS-INV-09** | Attribution facts are immutable after create (append-only correction via new ops process if needed) |
| **RRS-INV-10** | RF operational number is identity-only; never keys custody math |

---

## 6. Event model

| Event | Owner | Meaning |
|-------|-------|---------|
| Refund / SR domain events (`RefundApplied`, SR created) | Check / Settlement Record | Financial publication |
| **`SettlementAttributed`** (reuse) | CRMP | Register Refund Settlement executed (custody linked) |
| Implicit skip / fail outcomes | Adoption façade | AWAITING → SKIPPED/FAILED (logged; not money events) |

### Not introduced (by this design)

| Proposed event | Decision |
|----------------|----------|
| `RefundSettlementStarted` | Optional future telemetry only — not monetary |
| `RefundSettlementCompleted` | **Alias semantically** to `SettlementAttributed` for refund SR — do not invent parallel SSOT |
| `RefundSettlementVoided` | Forbidden as silent money reverse; would require compensating financial + custody design under new ADR |

---

## 7. Accounting impact

| Case | Financial (Check/SR) | Custody (Register) | Reporting |
|------|----------------------|--------------------|-----------|
| Cash refund | Compensating SR published | Expected Cash ↓ | Net from refund publications |
| Card refund | Compensating SR published | No cash delta | Same |
| Electronic | Compensating SR published | No cash delta | Same |
| Attribution skipped | SR still published | No custody delta | Reporting still sees RF |

---

## 8. Multi-register / multi-shift

| Rule | Decision |
|------|----------|
| Scope | Restaurant-scoped Registers and Shifts |
| Settlement Register | The **resolved** Register in Settlement Context at AttributeRefund time (typically active duty register) |
| Cross-register | **Allowed only** if that Register has an **open** Financial Shift and operator context; never invent Shift |
| Cross-restaurant | **Forbidden** |
| Multiple cashiers | Operator id from context; Shift holds accountability window |
| RF settled twice | Forbidden (RRS-INV-02) |

---

## 9. Audit trail (immutable)

Every successful Register Refund Settlement records:

| Field | Source |
|-------|--------|
| Operator | Settlement Context / Attribution |
| Register | Resolved registerId |
| Shift | Open financialShiftId |
| Settlement method (tender) | SR payment snapshot |
| Amount | SR money facts (cash portion for custody) |
| Reason | Refund reason on domain / apply (financial plane) |
| Time | Attribution timestamp |
| Device / channel | Optional context hints — never money authority |
| Document refs | `settlementRecordId` + RF number (display) |

---

## 10. Reporting impact

| Report class | Impact |
|--------------|--------|
| Refund / Settlement analytics | Consume RF Settlement Records (unchanged ownership) |
| Register / cash movement | Expected Cash + Attribution tender presentation |
| Financial analytics Net | Already from compensating publications (REFUND-REPORTING-ADOPTION-1) |
| Numbering | Identity only — no reporting formulas |

---

## 11. Integration compatibility

| Platform | Compatibility |
|----------|---------------|
| Settlement Ledger | Entry for ApplyRefund; may display Attribution status fail-open |
| Refund Platform | Check owns money; RRS is post-commit custody |
| Register / CRMP | Owns RRS Attribution |
| Reporting | Publication consumer |
| Sessions / Checks / Order Settlement | Unchanged boundaries |

**No duplicate ownership** of refund money or RF identity.

---

## 12. ADR recommendations

1. **Keep ADR-ARCH-032 / 028 / 030 as constitutional base** — do not fork money ownership.  
2. **Optional ADR refinement (recommended):** short amendment or successor note **ADR-ARCH-033 — Register Refund Settlement (Custody Plane)** that:
   - Names RRS lifecycle states  
   - Codifies RRS-INV-01…10  
   - Affirms `SettlementAttributed` as completion event  
   - Affirms RF ≠ cash left drawer  
3. **Do not** introduce a Register-owned Refund Aggregate or Drawer `paid_out` as monetary SSOT without a new ADR.

---

## 13. Implementation roadmap (future programs — not this design)

| Phase | Program intent |
|-------|----------------|
| **A** | Presentation: surface AWAITING / ATTRIBUTED / SKIPPED on Ledger/Detail (read-only) |
| **B** | Ops repair: re-attempt AttributeRefund when context becomes available |
| **C** | Optional explicit cashier “confirm cash handed out” UX (still CRMP custody; no money re-decision) |
| **D** | Optional ADR-033 ratification |
| **E** | Multi-register policy UI (which Register may attribute) |

This program **does not implement** any phase.

---

## Final Certification

**ARCHITECTURE CERTIFIED**
