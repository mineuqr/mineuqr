# REGISTER-OPERATIONS-IMPLEMENTATION-1 — Implementation Certification

| Field | Value |
|---|---|
| **Program** | REGISTER-OPERATIONS-IMPLEMENTATION-1 |
| **Date** | 2026-07-24 |
| **Constitution** | ADR-ARCH-022 · 028 · **030** · REGISTER-OPERATIONS-PLATFORM-1 · SHIFT-LIFECYCLE-IMPLEMENTATION-1 |
| **Gap analysis** | [`GAP-ANALYSIS.md`](./GAP-ANALYSIS.md) |
| **Verdict** | **REGISTER OPERATIONS IMPLEMENTATION CERTIFIED** |

---

## 1. Executive Summary

Register Duty operational lifecycle is implemented inside the existing Register Aggregate Root per ADR-ARCH-030 and REGISTER-OPERATIONS-PLATFORM-1:

- Duty states: `closed` · `open` · `suspended`
- Operator assignment: Assign / Release / Reassign (exactly one active operator per Register)
- Device association: Attach / Detach / Replace (exactly one active device)
- Canonical commands + collected domain events
- Invariants: Duty-gated Shift open; Close blocked by active Shift; closed Duty cannot accept settlement context
- Additive persistence **0079** authored (production deploy **not** authorized by this program)

**No UI. No Reporting. No Settlement redesign. No API surface** (→ CRMP-OPERATIONS-API-1).

Ownership unchanged: Check settles money; Settlement Record immutable; Financial Shift remains separate AR.

---

## 2. Gap Analysis

See [`GAP-ANALYSIS.md`](./GAP-ANALYSIS.md).

| Area | Before | After |
|------|--------|-------|
| Duty plane | Architecture only | Implemented on Register AR |
| Operator | Absent | `assignedOperatorUserId` + commands |
| Device events | Bind/unbind only | Attach/Detach/Replace + events |
| Resolve | Absent | Active / by device / by operator |
| Persistence | Catalog + deviceId | + Duty + operator (0079) |

---

## 3. Aggregate Changes

| Aspect | Implementation |
|--------|----------------|
| Aggregate Root | `CashRegister` (`shared/crmp/register/registerContract.ts`) |
| New fields | `dutyStatus`, `assignedOperatorUserId`, `operatorAssignedAt` |
| Catalog plane | Unchanged (`provisioned` \| `active` \| `inactive`) |
| Duty plane | `registerLifecycle.ts` — ADR-030 transitions |
| Boundaries | Unchanged — no money ownership |

---

## 4. Duty Lifecycle

```
closed → open ⇄ suspended
         ↓
       closed
```

| From | To | Command | Guards |
|------|----|---------|--------|
| closed | open | `OpenRegister` | Catalog=active; optional AssignOperator |
| open | suspended | `SuspendRegister` | Catalog=active |
| suspended | open | `ResumeRegister` | Catalog=active |
| open/suspended | closed | `CloseRegister` | No active Financial Shift; releases operator |

**OpenRegister never opens a Financial Shift.**

---

## 5. Operator Ownership

| Command | Behavior |
|---------|----------|
| `AssignOperator` | Set when null; idempotent same; reject if different (use Reassign) |
| `ReleaseOperator` | Clear; idempotent if null |
| `ReassignOperator` | Replace assigned operator while Duty open/suspended |
| Restaurant uniqueness | Same operator cannot be assigned on two Duty-active Registers |

Assignment belongs to Register only (reference to User id).

---

## 6. Device Association

| Command | Behavior |
|---------|----------|
| `AttachDevice` | Set device; idempotent same id; reject if device on another Register |
| `DetachDevice` | Clear; idempotent if null |
| `ReplaceDevice` | Attach semantics (swap) |
| `BindDevice` / `UnbindDevice` | Aliases retained for compatibility |

No historical rewrite of prior bindings; audit via domain events.

---

## 7. Event Matrix

| Event | When |
|-------|------|
| `RegisterOpened` | Duty → open |
| `RegisterClosed` | Duty → closed |
| `RegisterSuspended` | Duty → suspended |
| `RegisterResumed` | Duty → open from suspended |
| `OperatorAssigned` | Operator set / open-with-operator / reassign |
| `OperatorReleased` | Release / close / reassign previous |
| `DeviceAttached` | Attach / replace |
| `DeviceDetached` | Detach / replace previous |
| `RegisterResolved` | Resolve queries (read-side fact; no version bump) |

**claimKey:** `${registerId}:${eventType}:v${version}` (+ occurredAt suffix for Resolve).  
**No outbox / bus** in this program.

---

## 8. Invariant Validation

| ID | Invariant | Enforcement |
|----|-----------|-------------|
| OL-INV-01 | One Duty status per Register | Single `dutyStatus` field + transitions |
| — | Exactly one active operator | Field + Assign/Reassign rules |
| — | Exactly one active device | Field + attach conflict |
| — | Closed Register cannot open Shift | `assertRegisterCanOpenShift` requires Duty=open |
| — | Closed Register cannot accept settlements | Settlement context gap `register_duty_closed` |
| — | Active Shift blocks Close/Deactivate | `hasActiveShift` guards |
| — | Inactive cannot resume | `resumeRegister` catalog check |
| OL-INV-02+ | Shift ownership unchanged | No Shift AR changes beyond handover register load |

Handover accept now loads the **canonical Register** (no fabricated stub) so Duty gates apply to successor open.

---

## 9. Regression Results

| Platform | Ownership / behavior change? |
|----------|------------------------------|
| CRMP | Extended Register Duty only |
| Financial Shift | Open requires Duty=open; handover uses real Register |
| Settlement Context | Gap when Duty closed; fail-open preserved |
| Settlement Attribution | Unchanged (uses context) |
| Settlement Record / Check / Order / OSP / Reporting | **None** |

---

## 10. Test Results

| Suite | Result |
|-------|--------|
| `shared/crmp/__tests__/registerDutyLifecycle.test.ts` | PASS (15) |
| `server/crmp/__tests__/RegisterDomainService.test.ts` | PASS (8) |
| Other shared/crmp + server/crmp + attribution + governance | PASS |
| **Total targeted run** | **106 passed / 0 failed** |

Coverage includes: open/close/suspend/resume, assign/release/reassign, attach/detach/replace, resolve, illegal transitions, idempotency, version conflict, Duty-gated Shift open, settlement duty gap.

---

## 11. Production Readiness

| Item | Status |
|------|--------|
| Domain implementation | **Complete** |
| Additive migration `0079_crmp_register_duty` | **Authored + journalized** |
| Governance terminus advanced to 0079 | **Yes** (journal gate; DB apply separate) |
| Production `pnpm db:migrate` for 0079 | **Not authorized / not executed** |
| API exposure | **Out of scope** → CRMP-OPERATIONS-API-1 |
| UI adoption | **Blocked until API** → REGISTER-OPERATIONS-UI-1 retry |

---

## 12. Final Certification

| Success criterion | Status |
|-------------------|--------|
| Register Duty lifecycle fully implemented | **Met** |
| Operator ownership implemented | **Met** |
| Active device association implemented | **Met** |
| Aggregate invariants enforced | **Met** |
| Canonical events published (collected facts) | **Met** |
| Financial Shift / Settlement ownership unchanged | **Met** |
| No financial calculations introduced | **Met** |
| No reporting behavior changes | **Met** |
| Automated tests pass | **Met** |
| Production readiness certified (domain) | **Met** — DB migrate deferred |

### Verdict

**REGISTER-OPERATIONS-IMPLEMENTATION-1 — CERTIFIED**

Authorized next: `CRMP-OPERATIONS-API-1` → re-open `REGISTER-OPERATIONS-UI-1`.  
Optional: `CRMP-PRODUCTION-MIGRATION-0079` for production schema apply.
