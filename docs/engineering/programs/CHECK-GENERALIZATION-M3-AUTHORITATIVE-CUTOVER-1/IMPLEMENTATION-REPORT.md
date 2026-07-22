# CHECK-GENERALIZATION-M3-AUTHORITATIVE-CUTOVER-1 — Implementation Report

**Status:** Implemented  
**Date:** 2026-07-22  
**Authority:** ADR-ARCH-020 Financial Settlement Platform  
**Related:** M1 Membership Persistence · M2 Backfill & Validation · CHECK-GENERALIZATION-IMPLEMENTATION-DESIGN-1

---

## Architecture Notes

ADR-ARCH-020 **R2 / I-FIN-10**: after cutover, **membership is the sole discovery path** for Check Order composition used in money calculation. Session order scan is transitional only.

M3 completes that cutover for **Check money discovery** only:

| Concern | Authority after M3 |
|---------|-------------------|
| Check Order discovery for subtotals / settle freeze | **`check_order_membership` (active)** |
| Session Order attach / visit aggregates | Session (unchanged) |
| Dual-write enrollment | Remains **ON** (default) |
| Session settle façades (`markPaid`, etc.) | Unchanged signatures; money via Check + membership |
| Session optionality / sessionless Checks | **Not** this program (M4) |

**Flags**

| Env | Default | Role |
|-----|---------|------|
| `CHECK_MEMBERSHIP_DUAL_WRITE` | ON | Keep writing membership |
| `CHECK_MEMBERSHIP_AUTHORITATIVE_READ` | **ON** | Membership read for money; set `false` to roll back to Session scan **only while dual-write stays ON** |

Bootstrap exception: brand-new Check insert may seed money from Session scan **once** before membership rows exist; immediately after `dualWriteSyncSessionOrdersToCheck`, money is refreshed from membership when authoritative.

---

## Implementation

### Choke point

`CheckService.loadOrdersSubtotal({ restaurantId, sessionId, checkId })`

- **Authoritative ON:** `listActiveOrderIdsForCheck` → `getOrdersByIds` → `computeOrdersTotalAmount` (excludes cancelled)
- **Authoritative OFF:** `getOrdersBySessionId` (rollback)

### Callers updated to pass `checkId`

| Function | Behavior |
|----------|----------|
| `createOpenCheckForSession` | Sync dual-write → refresh money from membership |
| `recalculateOpenCheckForSession` | Membership subtotal |
| `finalizeOpenCheck` (paid / complimentary / void) | Membership subtotal before freeze |

New helper: `db.getOrdersByIds(restaurantId, orderIds)`.

---

## Validation (tests)

| Case | Coverage |
|------|----------|
| Recalc membership discovery | `CheckService.m3.cutover.test.ts` |
| Recalc Session rollback flag | same |
| Create + dual-write + membership refresh | same |
| Settle paid freezes membership totals | same |
| Void uses membership then deactivates | same |
| Architecture guards M1 + M3 | `checkMembershipM1/M3.architecture.guards.test.ts` |
| Dual-write enrollment unchanged | `checkMembershipService.test.ts` |

**Result:** 19 related tests PASS.

Manual / production expectations (unchanged formulas):

- Existing / new / split Checks — membership set drives open recalc & settle freeze  
- Complimentary / voided — same finalize path; void still deactivates memberships  
- Historical / backfilled — M2 parity; authoritative read consumes those rows  
- Dual-write consistency — still required for live enrollment  
- Reporting — continues to read stored Check `grandTotal` (no Session rediscovery)

---

## Non-goals (honored)

- No Session Optionality (M4)  
- No Session aggregate removal  
- Dual-write **not** disabled  
- No payment / tax / Revenue formula changes  
- ADR-ARCH-020 text unchanged  
- No sessionless `EnsureCheckForOrder` / Order settle façade  

---

## Success criteria

| Criterion | Met |
|-----------|-----|
| Membership is sole authoritative membership discovery for Check money | **Yes** (flag default ON) |
| Session no longer owns membership lookup for money | **Yes** |
| Dual-write remains enabled | **Yes** |
| ADR-020 unchanged | **Yes** |
| Regression tests pass | **Yes** |
| Production ready (rollback flag documented) | **Yes** |

---

## Migrated runtime paths (Session lookup → Membership lookup)

Every path below previously resolved Check Order money via `getOrdersBySessionId`. After M3 (authoritative ON) they resolve via **`listActiveOrderIdsForCheck` → `getOrdersByIds`**.

1. **`CheckService.loadOrdersSubtotal`** — discovery choke point (Session → Membership).  
2. **`CheckService.createOpenCheckForSession`** — post-sync money refresh for new and existing open Checks.  
3. **`CheckService.recalculateOpenCheckForSession`** — open Check recalculation (incl. OrderSessionConsumer / session aggregate writers).  
4. **`CheckService.finalizeOpenCheck`** — shared settle/void freeze.  
5. **`CheckService.settleCheckPaid`** — paid settlement freeze.  
6. **`CheckService.settleCheckComplimentary`** — complimentary settlement freeze.  
7. **`CheckService.voidCheck`** — void freeze (membership deactivate unchanged).

**Indirect callers** (no code change; inherit membership money via the above):

- `sessionAggregateWriters.incrementSessionAggregatesForOrder` / `decrementSessionAggregatesForCancelledOrder` → `recalculateOpenCheckForSession`  
- `OrderSessionConsumer` → session aggregate writers → recalc  
- `sessionService.markPaid` / `markComplimentary` / `closeSession` → settle/void Check APIs  
- Operational session lifecycle settle/void façades → same Check APIs  

**Not migrated** (correctly remain Session-scoped or non-money):

- Dual-write sync/enroll (`dualWriteSyncSessionOrdersToCheck`, `dualWriteEnrollOrderForSession`) — Session → membership **write** mirror  
- Backfill / M2 validators — Session as historical seed  
- Session workspace / Session aggregate drift vs Session orders — operational UX, not Check Revenue  
- Reporting aggregators — read stored Check totals  

---

## Production readiness

1. Deploy with defaults: dual-write ON + authoritative read ON.  
2. Rollback (emergency): `CHECK_MEMBERSHIP_AUTHORITATIVE_READ=false` while keeping `CHECK_MEMBERSHIP_DUAL_WRITE` ON.  
3. Do **not** disable dual-write while authoritative read is ON (ADR design §9).
