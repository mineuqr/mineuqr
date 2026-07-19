# CHECK-GENERALIZATION-M2-BACKFILL-VALIDATION-1 — Backfill & Validation Report

**Status:** Complete — Consistency **PASS**  
**Date:** 2026-07-19  
**Target:** Production TiDB `gateway01` / `mineuqr`  
**Authority:** ADR-ARCH-020 · CHECK-GENERALIZATION-IMPLEMENTATION-DESIGN-1 · M1 certified  

**Forbidden in this program:** Cutover · Membership-authoritative reads · Session optionality · Settlement/API/UI/Reporting changes  

---

## 1. Backfill Execution Report

| Item | Value |
|------|--------|
| Tool | `scripts/check-order-membership-backfill-execute.ts` |
| Scope | `full` |
| Confirm gate | `CHECK_MEMBERSHIP_BACKFILL_CONFIRM=YES` |
| Manual SQL | **Not used** |
| Dry-run | `checks=18`, `sessionOrders=19` |
| Execute result | **Success** — `errors: []` |

### Execute statistics

| Metric | Count |
|--------|------:|
| Restaurants processed | 1 |
| Eligible checks processed (open/paid/comp) | 18 |
| Memberships newly enrolled | 17 |
| Memberships already present (idempotent) | 2 |
| Errors | 0 |

The 2 “already” rows were dual-write `session_attach` enrollments present before backfill.

---

## 2. Membership Population Statistics

| Metric | Count |
|--------|------:|
| Eligible checks (open/paid/complimentary) | 18 |
| Voided checks (excluded from enroll by M1 design) | 1 |
| Total membership rows | 19 |
| Active membership rows | 19 |
| `enrolledReason=backfill` | 17 |
| `enrolledReason=session_attach` (dual-write) | 2 |
| Cross-tenant drift | 0 |
| Eligible checks missing membership despite Session orders | 0 |

---

## 3. Validation Report

| Check | Result |
|-------|--------|
| Every eligible Check ↔ Session Orders mirrored in active Membership | **PASS** (18/18) |
| Membership → existing Check | **PASS** (0 orphans) |
| Membership → existing Order | **PASS** (0 orphans) |
| One Order → at most one active non-void Check | **PASS** (0 duplicates) |
| No orphan Membership | **PASS** |
| Unique `(checkId, orderId)` respected | **PASS** (no insert errors) |
| Voided Checks have no active Membership | **PASS** (1 voided, 0 active membership, 0 session orders) |

Validator: `scripts/check-order-membership-backfill-validate.ts` → **verdict: PASS**

---

## 4. Consistency Report

Session discovery (`orders WHERE sessionId = check.sessionId`) vs active Membership order sets:

| Outcome | Checks | Exact match |
|---------|-------:|------------:|
| paid | 18 | 18 |
| open | 0 | n/a (none in fleet) |
| complimentary | 0 | n/a (none in fleet) |
| voided | 1 | N/A (not enrolled; 0 active membership) |

| Aggregate | Value |
|-----------|------:|
| Checks compared | 18 |
| Exact matches | 18 |
| Mismatches | **0** |

Session order total on eligible checks: **19**  
Active memberships: **19**

---

## 5. Mismatch Report

**None.** `mismatches: []` — no silent repairs performed.

---

## 6. Mandatory Validation Matrix

| Scenario | Fleet evidence | Status |
|----------|----------------|--------|
| Historical paid Sessions | 18 paid checks; 18/18 match | **PASS** |
| Historical open Sessions | 0 open checks present | **N/A — no sample** |
| Multi-order Checks | 1 multi-order check; match | **PASS** |
| Single-order Checks | 17; match | **PASS** |
| Voided Checks | 1 voided; 0 active membership | **PASS** (by design) |
| Complimentary Checks | 0 present | **N/A — no sample** |
| Orders with modifiers | 0 among membership orders | **N/A — no sample** |
| Orders without modifiers | All current membership orders | **PASS** |
| Orders with notes | 0 item/order notes among membership | **N/A — no sample** |
| Mixed / settlement present | 14 checks with settlement txs | **PASS** (membership intact) |
| Split tender (multi settlement rows) | 0 multi-tender checks | **N/A — no sample** |

Absence of open/comp/modifier/notes samples is a **data inventory** fact, not a consistency failure. Dual-write remains ON for future open Checks.

---

## 7. Performance Summary

| Step | Observation |
|------|-------------|
| Dry-run (18 checks / 19 orders) | Seconds-scale |
| Full execute | ~35s wall (incl. TLS/connect) |
| Validate (full compare) | ~40s wall |
| Scale risk | Low at current fleet size; re-run validate after growth |

---

## 8. Operational Safety Report

| Surface | Evidence | Status |
|---------|----------|--------|
| Session discovery money path | `CheckService.loadOrdersSubtotal` still uses `getOrdersBySessionId` | **Unchanged** |
| Membership-authoritative reads | Not introduced | **PASS** |
| Waiter / Dining Session / Settlement / Reporting / Kitchen / Kiosk / APIs | No code changes in M2 | **Unchanged** |
| Dual-write flag | `CHECK_MEMBERSHIP_DUAL_WRITE` unset → effective **ON** | **PASS** |
| Dual-write live evidence | 2 `session_attach` rows before backfill | **PASS** |
| Production behavior | Membership mirror only; no cutover | **PASS** |

---

## 9. Rollback Status

| Mechanism | Available |
|-----------|-----------|
| Stop new dual-writes | `CHECK_MEMBERSHIP_DUAL_WRITE=false` |
| Money / settle / reporting | Unaffected (Session discovery) |
| Membership rows | May remain; inert for money until M3 |
| Cutover flag | **Does not exist yet** — nothing to flip back |

---

## 10. Production Readiness Assessment

| Criterion | Met |
|-----------|-----|
| Historical Membership populated | Yes |
| Membership matches Session discovery | Yes (18/18) |
| Zero duplicates / orphans | Yes |
| Zero production regressions from backfill | Yes |
| Dual-write operational | Yes |
| Session discovery authoritative | Yes |
| Backward compatible | Yes |

**Verdict: GO for M2 completion.** Fleet is a perfect mirror for all current eligible Checks.

---

## 11. Recommendation for M3 Cutover

**Conditional GO to charter M3** (membership-authoritative read cutover design/execution), subject to:

1. Keep dual-write **ON** through cutover (design rule).
2. Re-run `check-order-membership-backfill-validate.ts` immediately before cutover (must remain PASS).
3. Prefer a tenant canary when open Checks exist (current fleet has only paid history).
4. Do **not** cut over until open-Check dual-write is observed in production soak (0 open Checks at M2 validation time).
5. M3 must not remove Session discovery until soak + rollback drill complete.

**M3 is not started by this program.**

---

## Files Added (tooling only)

| File | Purpose |
|------|---------|
| `scripts/check-order-membership-backfill-validate.ts` | Read-only Session ↔ Membership consistency validator |

No business logic, API, UI, reporting, or settlement code modified.
