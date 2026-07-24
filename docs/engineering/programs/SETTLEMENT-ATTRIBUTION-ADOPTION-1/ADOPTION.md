# SETTLEMENT-ATTRIBUTION-ADOPTION-1 — Adoption Certification

| Field | Value |
|---|---|
| **Program** | SETTLEMENT-ATTRIBUTION-ADOPTION-1 |
| **Date** | 2026-07-24 |
| **Constitution** | ADR-ARCH-022 · 028 · **030** · SETTLEMENT-CONTEXT-ADOPTION-1 · SHIFT-LIFECYCLE-IMPLEMENTATION-1 |
| **Audit** | `ADOPTION-AUDIT.md` |
| **Verdict** | **SETTLEMENT ATTRIBUTION ADOPTION CERTIFIED** |

---

## 1. Executive Summary

Settlement Attribution is adopted into the settlement **completion** sequence: after the Check-owned financial TX commits (money + Settlement Record), the platform attempts CRMP Attribution using the already-resolved Settlement Context.

Attribution is operational only. It never owns money, never mutates Settlement Record, never blocks settle (ADR-ARCH-030 fail-open).

**No UI. No Reporting changes. No schema migration.**

---

## 2. Adoption Point

| Item | Decision |
|------|----------|
| Function | `finalizeOpenCheckById` completion sequence |
| Timing | **Post-commit** of Check-owned TX |
| Module | `server/operational-session/check/checkSettlementAttributionAdoption.ts` |
| Why not in-TX | Fail-open + CRMP Aggregate ownership — Attribution must not roll back Check/SR |

---

## 3. Transaction Boundary

```
[Check-owned TX] finalize + ST + OS + Settlement Record  → COMMIT
        ↓
[CRMP write] CreateSettlementAttribution (best-effort)
        ↓
Return CheckFinancialMutationResult + settlementAttribution (+ collected SettlementAttributed)
```

Money and SR succeed independently of Attribution outcome.

---

## 4. Settlement Context Consumption

| Field | Use |
|-------|-----|
| `registerId` | Required for attempt; must match attribution register |
| `financialShiftId` | Target open Shift |
| `operatorUserId` | Attribution operator |
| `deviceId` / `operationalScreenId` | Context only (not stored on attribution association) |
| `settlementRecordId` | From published SR (required) |
| `restaurantId` | Tenant |

`cashTenderAmount` = **sum of cash lines** from SR `paymentSnapshot` (or settle lines) — custody copy only; never recomputes Check `grandTotal`.

Missing context → `skipped` with gaps; no fabricate.

---

## 5. Idempotency Validation

| Guarantee | Mechanism |
|-----------|-----------|
| One Attribution per Settlement Record | Domain + DB unique `settlementRecordId` |
| Duplicate settle / retry | `already_applied` returns existing |
| Concurrent create | Unique constraint / domain duplicate detect |
| Claim key | `${settlementRecordId}:SettlementAttributed` |

---

## 6. Failure Analysis

| Scenario | Outcome |
|----------|---------|
| Cash settle + resolved context | `created` |
| Card settle | `created` with cash `0.00` |
| Complimentary | `created` with cash `0.00` |
| Missing register/shift/operator | `skipped` — settle preserved |
| Void | `skipped` (`outcome_not_attributable`) |
| Shift not open / CRMP error | `failed` — settle preserved |
| Duplicate attribution | `already_applied` |

---

## 7. Regression Results

| Platform | Impact |
|----------|--------|
| Order / Session / Check | Money paths unchanged |
| Settlement / ST / SR | Unchanged publication; SR not mutated by Attribution |
| Reporting | Unchanged |
| CRMP / Shift | Attribution association append only |
| Register Operations | Unchanged |

Ownership matrix preserved.

---

## 8. Test Results

```
Test Files  12 passed (12)
Tests       83 passed (83)
```

Coverage: cash/card/complimentary attribution, missing register/shift, void skip, idempotent retry, SR/Shift/Register references, architecture no-recalc guards.

---

## 9. Performance Impact

| Aspect | Assessment |
|--------|------------|
| Critical path | +1 post-commit CRMP write when eligible |
| Fail-open skip | No CRMP write when context incomplete |
| Settle latency | Negligible vs Check TX; attribution errors do not retry money |

---

## 10. Production Readiness

| Item | Status |
|------|--------|
| Eligible settles attempt Attribution | **Yes** |
| References SR / Register / Shift | **Yes** |
| No financial duplication | **Yes** |
| Fail-open | **Yes** |
| No UI / Reporting / migration | **Yes** |
| Tests pass | **Yes** |

---

## 11. Final Certification

| Success criterion | Status |
|-------------------|--------|
| Every eligible successful settlement attempts Attribution | **Met** |
| Attribution references SR / Register / Shift when available | **Met** |
| No financial calculation duplication | **Met** |
| No ownership boundary changes | **Met** |
| Settle fail-open w.r.t. Attribution | **Met** |
| Reporting unchanged | **Met** |
| Automated tests pass | **Met** |
| Production readiness certified | **Met** |
| Architecture Impact STOP | **Not triggered** |

### Verdict

**SETTLEMENT-ATTRIBUTION-ADOPTION-1 — ADOPTION CERTIFIED**

Operational accountability chain is now complete for settle paths that supply resolved Settlement Context (Register + open Financial Shift + operator).
