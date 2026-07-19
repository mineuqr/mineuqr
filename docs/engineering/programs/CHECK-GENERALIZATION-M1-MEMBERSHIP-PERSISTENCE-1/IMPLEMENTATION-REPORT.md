# CHECK-GENERALIZATION-M1-MEMBERSHIP-PERSISTENCE-1 — Implementation Report

**Status:** Implemented (persistence foundation only)  
**Date:** 2026-07-19  
**Governs:** ADR-ARCH-020 · CHECK-GENERALIZATION-IMPLEMENTATION-DESIGN-1  
**Forbidden in this program:** Cutover, session optionality, Order settle façade, kiosk settlement, reporting/API/UI changes  

---

## Implementation Summary

M1 ships **Check-owned Order membership persistence** with **dual-write** from Session Order attach / Check ensure paths. Session order discovery remains the money authority (`loadOrdersSubtotal` → `getOrdersBySessionId`). No user-visible, settlement, or reporting behavior changes.

| Capability | Status |
|------------|--------|
| `check_order_membership` table + Drizzle schema | Done |
| Check-owned enroll / deactivate (not an aggregate) | Done |
| Dual-write on Session order attach + Check ensure | Done |
| Best-effort failure (ops-logged; no waiter regression) | Done |
| Flag rollback (`CHECK_MEMBERSHIP_DUAL_WRITE=false`) | Done |
| Confirm-gated backfill CLI (prepare only; not executed in prod) | Done |
| Membership-authoritative subtotal / cutover | **Refused** (M3+) |
| Sessionless EnsureCheckForOrder / kiosk settle | **Refused** (later phases) |

---

## Architecture Compliance Report

| ADR-ARCH-020 / Design rule | Compliance |
|----------------------------|------------|
| Membership belongs to Check | Yes — table keyed by `checkId`; service under Check module |
| Membership is NOT an aggregate | Yes — no aggregate root, no separate domain module ownership |
| Order NEVER owns Membership | Yes — no Order-side membership owner |
| Session NEVER owns Membership | Yes — Session only triggers dual-write enroll |
| One Order → at most one non-void Check | Yes — `findBlockingMembershipForOrder` + app invariant |
| One Check → many Orders | Yes — unique `(checkId, orderId)` only |
| Financial ownership Check → SettlementTransaction only | Unchanged — membership does not write settlements |
| Dual-write; legacy discovery operational | Yes — Session scan still loads subtotal |
| No cutover in M1 | Yes — `listActiveOrderIdsForCheck` unused for money |
| Rollback possible | Yes — disable dual-write flag; table can remain inert |

**Out-of-scope refusals (documented, not implemented):**

| Request | Reason |
|---------|--------|
| Session optionality / `sessionId` null Checks | M4+ per design |
| Order settlement façade | M5+ |
| Kiosk settlement | Channel phase after sessionless Check |
| Reporting changes | Separate reporting programs; money SSOT unchanged |
| API / UI redesign | Later phases |
| Production backfill execution | Prepare only; requires ops confirm window |
| Removal of legacy Session discovery | M3 cutover / M7 cleanup |

---

## Files Modified

| File | Change |
|------|--------|
| `drizzle/0071_check_order_membership.sql` | **Added** — membership table + indexes |
| `drizzle/meta/_journal.json` | Journal entry for 0071 |
| `drizzle/schema.ts` | `checkOrderMembership` table |
| `shared/operational-session/check/checkMembershipContract.ts` | **Added** — enrolled reasons + record type |
| `shared/operational-session/check/index.ts` | Export contract |
| `shared/operational-session/index.ts` | Re-export |
| `server/operational-session/check/checkOrderMembershipRepository.ts` | **Added** — persistence |
| `server/operational-session/check/checkMembershipService.ts` | **Added** — enroll + dual-write helpers |
| `server/operational-session/check/CheckMembershipBackfillService.ts` | **Added** — prepare/execute backfill helpers |
| `server/operational-session/check/CheckService.ts` | Sync membership on ensure; deactivate on void |
| `server/operational-session/check/index.ts` | Exports |
| `server/diningSession/sessionAggregateWriters.ts` | Dual-write enroll when `orderId` present |
| `server/order/.../OrderSessionConsumer.ts` | Passes `orderId` into increment |
| `server/_core/env.ts` | `checkMembershipDualWrite` (default ON) |
| `server/_core/opsTaxonomy.ts` | `check_membership_dual_write_failed` |
| `scripts/check-order-membership-backfill-execute.ts` | **Added** — confirm-gated CLI |
| `server/operational-session/check/__tests__/checkMembershipService.test.ts` | **Added** |
| `shared/operational-session/__tests__/checkMembershipM1.architecture.guards.test.ts` | **Added** |

---

## Migration Notes

1. Apply SQL migration `0071_check_order_membership` via normal deploy migrate path.
2. Dual-write defaults **ON** (`CHECK_MEMBERSHIP_DUAL_WRITE` unset or any value except `"false"`).
3. Rollback of writes: set `CHECK_MEMBERSHIP_DUAL_WRITE=false` — Session money path unaffected.
4. Historical parity: dry-run then execute backfill CLI only in a scheduled ops window:

```bash
npx tsx scripts/check-order-membership-backfill-execute.ts --scope tenant --restaurant-id <id> --dry-run
CHECK_MEMBERSHIP_BACKFILL_CONFIRM=YES npx tsx scripts/check-order-membership-backfill-execute.ts --scope tenant --restaurant-id <id>
```

5. Backfill enrolls open/paid/complimentary Checks from Session Orders; skips voided.
6. **Do not** flip any cutover/read flag in this phase (none exists yet).

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Dual-write failure breaks waiter flow | Best-effort + ops warn; Session aggregates/Check money still Session-based |
| Duplicate membership | Unique `(checkId, orderId)` + blocking membership query |
| Accidental cutover | Architecture guards assert Session subtotal path; no membership money reads |
| Backfill noise on voided Checks | Filtered out of backfill selection |
| Flag default ON surprises ops | Documented; disable env for immediate write rollback |

---

## Validation Results

| Check | Result |
|-------|--------|
| Unit: enroll / idempotent / blocking / flag skip / paid backfill | Pass (6) |
| Architecture guards: table, dual-write, no cutover, no settle façade | Pass (5) |
| Money path still `getOrdersBySessionId` | Guarded |
| Production backfill executed | **Not run** (by design) |

---

## Production Readiness

| Item | Ready? |
|------|--------|
| Schema migration shippable | Yes |
| Dual-write dark (no UX/money change) | Yes |
| Rollback via env | Yes |
| Historical backfill prepared | Yes (CLI gated) |
| Cutover | **No — not this phase** |

Deploy: migrate 0071 → ship code with dual-write ON → monitor `check_membership_dual_write_failed` → schedule tenant canary backfill later.

---

## Known Limitations

- Membership rows may lag if dual-write fails (ops warn only).
- Application-level “one Order → one non-void Check” (not a DB partial unique index).
- Voided Check history not backfilled.
- Membership not used for subtotal, settle, or reporting yet.
- Sessionless / multi-channel Checks not supported.

---

## Next Phase Recommendation

1. **M2 (ops):** Execute tenant canary backfill → reconcile membership vs Session Orders → fleet dry-run → fleet backfill.  
2. **M3:** Membership-authoritative read cutover behind flag (only while dual-write remains ON).  
3. Later: session optionality, Order/kiosk settle façades — only after M3 stable.

---

## Success Criteria (M1)

| Criterion | Met |
|-----------|-----|
| Membership exists | Yes |
| Production behavior unchanged | Yes (money/UI/reporting untouched) |
| Legacy discovery still works | Yes |
| Dual-write operational | Yes |
| Rollback remains possible | Yes |
| No user-detectable migration | Yes |
| No financial calculation changes | Yes |
| No reporting changes | Yes |
| No architectural violations | Yes (guards) |
