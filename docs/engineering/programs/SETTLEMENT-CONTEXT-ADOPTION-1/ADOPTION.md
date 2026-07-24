# SETTLEMENT-CONTEXT-ADOPTION-1 — Adoption Certification

| Field | Value |
|---|---|
| **Program** | SETTLEMENT-CONTEXT-ADOPTION-1 |
| **Date** | 2026-07-24 |
| **Constitution** | ADR-ARCH-022 · 028 · **030** · SHIFT-LIFECYCLE-IMPLEMENTATION-1 · Production Migration 0078 |
| **Verdict** | **SETTLEMENT CONTEXT ADOPTION CERTIFIED** |

---

## 1. Executive Summary

Canonical **Settlement Context** is adopted into the Check settle pipeline.

Every finalize path through `finalizeOpenCheckById` attaches an explicit `SettlementContext` (resolved / partial / unavailable). Context is resolved deterministically from CRMP facts + caller hints. **Register and Financial Shift are never fabricated.** Settlement remains **fail-open** when context is missing (ADR-ARCH-030).

**No Settlement Attribution. No UI. No schema migration. No financial ownership change.**

---

## 2. Adoption Audit

| # | Entry | Invokes | Context adoption |
|---|-------|---------|------------------|
| 1 | `session.markPaid` | → `markPaid` → `settleCheckPaidByIdDetailed` | Hints: `actorUserId` + optional `registerId`/`deviceId`/`operationalScreenId` |
| 2 | `session.markComplimentary` | → complimentary settle | Same |
| 3 | `session.close` (void) | → `voidCheckByIdDetailed` | Operator + optional station hints |
| 4 | `order.settlePaid` | → `settleOrderPaid` → paid settle | Optional station/operator hints |
| 5 | Lifecycle façades | Thin wraps of markPaid/comp | Same as staff |

**Canonical interception:** `finalizeOpenCheckById` (sole Check finalize + Settlement Record publication site).

---

## 3. Context Model

| Field | Required? | Notes |
|-------|-----------|-------|
| `restaurantId` | **Yes** | Tenant |
| `resolvedAt` | **Yes** | Timestamp |
| `status` | **Yes** | `resolved` \| `partial` \| `unavailable` |
| `gaps` | **Yes** | Explicit reason codes |
| `registerId` | Optional | Null if unresolved |
| `financialShiftId` | Optional | Null if unresolved |
| `operatorUserId` | Optional | Null if unresolved |
| `deviceId` | Optional | Hint / register bind |
| `operationalScreenId` | Optional | Reference only |

**Ownership:** Context is an operational carrier. Check owns settle/money. CRMP owns Register/Shift facts. Context never owns money.

---

## 4. Resolution Flow

```
Caller hints (registerId | deviceId | operatorUserId | screenId)
  → SettlementContextResolver (CRMP UoW)
       1. explicit registerId
       2. else deviceId → unique Register
       3. else operatorUserId → unique active Shift → Register
       4. active Shift on Register
  → SettlementContext { status, gaps, ids }
  → finalizeOpenCheckById (money TX unchanged)
       → SR actor slots when operatorUserId present
       → result.settlementContext always set
```

**Rules:** Never invent Register/Shift. Ambiguity → gap, not guess. CRMP errors → `unavailable` (fail-open).

---

## 5. API Changes

| Surface | Change |
|---------|--------|
| `settleCheck*ByIdDetailed` / void | Optional `settlementContext` / `settlementContextHints`; result includes `settlementContext` |
| `markPaid` / `markComplimentary` / `closeSession` | Optional `registerId`, `deviceId`, `operationalScreenId` |
| `session.markPaid` / `markComplimentary` tRPC | Optional same fields (backward compatible) |
| `settleOrderPaid` / `order.settlePaid` | Optional station/operator hints; result includes `settlementContext` |
| Settlement Record | Optional `createdByActorType/Id` filled from operator when present (existing slots; not Attribution) |

No new financial APIs. Existing callers without hints continue to work (context `unavailable` / `partial`).

---

## 6. Failure Analysis

| Scenario | Behavior |
|----------|----------|
| Missing register | `partial`/`unavailable` + gap; settle proceeds |
| Missing shift | `partial` + `no_active_shift`; settle proceeds |
| Ambiguous device/operator | gap; no invent; settle proceeds |
| CRMP/DB error | `unavailable` + `crmp_resolution_error`; settle proceeds |
| Duplicate / concurrent settle | Existing CheckTransitionError / SR idempotency unchanged |
| Retry | Context re-resolved; money path unchanged |

---

## 7. Regression Results

| Platform | Impact |
|----------|--------|
| Order | Façade optional hints only |
| Operational Session | Metadata enriched; visit lifecycle unchanged |
| Check | Money path unchanged; context sidecar |
| Settlement / ST | Unchanged |
| Settlement Record | Optional actor slots; money snapshots unchanged |
| Reporting | Unchanged |
| CRMP | Read-only resolution; no Attribution create |
| Register Operations | Resolution rules aligned with ADR-030 |

---

## 8. Test Results

```
shared/crmp + server/crmp + SettleOrderPaidService + CheckService.orderSettlementIntegration
Test Files  10 passed (10)
Tests       69 passed (69)
```

Includes: successful resolution, missing register/shift, device/operator paths, ambiguity, fail-open unavailable, settle façade injects hints, architecture no-fabricate guards.

---

## 9. Production Readiness

| Item | Status |
|------|--------|
| Context on every finalize | **Yes** |
| Deterministic / no fabricate | **Yes** |
| Fail-open settle | **Yes** |
| No Attribution | **Yes** |
| No UI / migration | **Yes** |
| Ownership preserved | **Yes** |
| Tests pass | **Yes** |

---

## 10. Final Certification

| Success criterion | Status |
|-------------------|--------|
| Every settlement execution receives canonical operational context | **Met** |
| Context resolved deterministically | **Met** |
| No Register/Shift fabricated | **Met** |
| Settlement / financial / Reporting behavior unchanged | **Met** |
| Check remains sole financial owner | **Met** |
| All tests pass | **Met** |
| Production readiness certified | **Met** |
| Architecture Impact STOP | **Not triggered** |

### Verdict

**SETTLEMENT-CONTEXT-ADOPTION-1 — ADOPTION CERTIFIED**

Authorized next: **SETTLEMENT-ATTRIBUTION-ADOPTION-1** (uses `settlementContext` + Settlement Record id; still fail-open for money).
