# CHECK-GENERALIZATION-M5-CHANNEL-ADOPTION-1 — Implementation Report

**Status:** Implemented  
**Date:** 2026-07-22  
**Authority:** ADR-ARCH-020 Financial Settlement Platform  
**Related:** M1–M4 Check Generalization · PRODUCTION-MIGRATION-0072-EXECUTION

---

## Architecture Notes

After M4, Membership + Check are sufficient for financial correctness, but most **channel entry points** still reached money via Session façades or skipped Check enrollment for sessionless orders.

M5 adopts Membership + Check across production channels:

| Concern | Authority after M5 |
|---------|-------------------|
| Settle / complimentary / void (Dashboard, Session lifecycle) | **Check by id** (`*ById`) via `activeCheckId` |
| Sessionless place (kiosk / counter / pickup / station) | **`ensureCheckForOrder`** on place + consumer |
| Check money discovery | **Membership** (M3; unchanged) |
| Check create seed (table Session) | Zero seed → dual-write sync → Membership refresh |
| Billing display (Dashboard workspace, Waiter floor/workspace) | Prefer **Check `grandTotal`** |
| Session visit lifecycle | Session (operational) — APIs retained |
| Dual-write | Remains **ON** |

**Non-goals honored:** dual-write not disabled; Session aggregate/APIs not removed; no compatibility cleanup program.

---

## 1. Migrated channels

| Channel | Change |
|---------|--------|
| **Dashboard settle** | `sessionService.markPaid` / `markComplimentary` / `closeSession` → `settle*ById` / `voidCheckById`; metadata from Check `grandTotal` (no `getOrdersBySessionId`) |
| **Operational Session lifecycle** | Inherits Dashboard settle path via `markPaid` / `markComplimentary` / `closeSession` |
| **QR / table place** | Session Check create retained for ops; money after sync from Membership (create seed no longer Session-scans) |
| **Kiosk / counter / station / non-table** | `IdentityPlaceOrderService` calls `ensureCheckForOrder` when ephemeral / `sessionId == null` |
| **Background OrderSessionConsumer** | Sessionless `OrderCreated` → `ensureCheckForOrder` (independent of table dual-write flag); Session-linked path unchanged |
| **Session aggregate writers** | Check recalc via `activeCheckId` → `recalculateOpenCheck` (Membership); Session rollups remain operational |
| **Dashboard workspace** | `getOwnerSessionWorkspace` prefers Check `grandTotal` (`aggregateSource: "check"`) |
| **Waiter workspace / floor** | `sessionTotalAmount` prefers Check `grandTotal` when `activeCheckId` set |
| **Owner timeline** | Settlement events prefer `checkGrandTotal` over legacy `totalAmount` |
| **Reporting (canonical)** | Already Check Revenue — no change |
| **Kitchen / Expo / Pickup display / Printing / Public status** | Operational only — no financial rediscovery; no change |

---

## 2. Remaining Session dependencies

| Dependency | Classification | Justification |
|------------|----------------|---------------|
| Session create / resolve / `activeCheckId` bind | **Operational / Required** | Table visit occupancy; Waiter/QR attach |
| Session façades `settleCheckPaid` / `voidCheck` (by `sessionId`) | **Operational compatibility** | Still exported for Session Platform callers; Dashboard settle no longer uses them for money |
| `ensureOpenCheckForSession` / `createOpenCheckForSession` | **Operational** | Table Session Check bootstrap + dual-write sync |
| Dual-write enroll/sync via Session order scan | **Legacy write mirror** | Required while dual-write ON; not money SSOT |
| Session aggregate columns (`totalAmount` / `totalOrders`) | **Operational** | Floor UX fallback when no Check; drift monitor |
| `logSessionAggregateDriftIfAny` Session order scan | **Operational monitor** | Non-blocking ops telemetry |
| Waiter place `sessionId` required guards | **Operational** | Waiter is table-bound; money still Check/Membership |
| OrderSessionConsumer Session events/rollups | **Operational** | Visit timeline + Session aggregates |
| Membership backfill scripts | **Admin / Legacy** | Offline tooling |
| Soft-sunset `ops.getSettlement*` Session totals | **Legacy** | Not Check Revenue; already soft-sunset |

---

## 3. Justification summary

Every remaining Session use is either:

1. **Operational visit context** (table occupancy, attach, timeline), or  
2. **Compatibility / dual-write mirror** (not financial discovery), or  
3. **Display fallback** when Check not yet linked.

No production channel uses Session order rediscovery as the **financial SSOT** for settle, complimentary, void, or Check money freeze after M5.

---

## 4. Compatibility Cleanup readiness

**Recommendation: NOT YET — do not start Compatibility Cleanup.**

Reasons:

- Dual-write must remain ON (program non-goal; still required for live Session→Membership enrollment on table paths).
- Session façades and APIs remain in use for operational workflows.
- Session aggregate columns still serve Waiter/Dashboard fallback when Check missing.
- Cleanup would require dual-write off, Session façade deprecation, and aggregate/display cutover — a separate program after sustained M5 production soak.

Platform is ready for **production M5 deploy** (migration 0072 already GO). It is **not** ready for Compatibility Cleanup / dual-write removal.

---

## Implementation details

### Settle path (Dashboard)

`settleAndCloseSession` / `closeSession`:

1. Resolve `activeCheckId` (ensure open Check if missing).  
2. `settleCheckPaidById` / `settleCheckComplimentaryById` / `voidCheckById`.  
3. Event metadata: `ordersTotalAmount` / `totalAmount` / `checkGrandTotal` = Check money.

### Sessionless place

- Synchronous: `IdentityPlaceOrderService` → `ensureCheckForOrder`.  
- Async safety net: `OrderSessionConsumer` for `sessionId == null`.

### Create seed

`createOpenCheckForSession` inserts `0.00`, syncs membership, refreshes money via Membership (no Session seed scan).

---

## Validation (tests)

| Suite | Coverage |
|-------|----------|
| `sessionActions.test.ts` | markPaid/comp/close → `*ById` |
| `IdentityPlaceOrderService.test.ts` | ephemeral → `ensureCheckForOrder` |
| `OrderSessionConsumer.test.ts` | sessionless OrderCreated enroll |
| `CheckService.m5.channelAdoption.test.ts` | create seed without Session scan |
| `sessionOwnerTimeline.test.ts` | `checkGrandTotal` preference |
| `checkMembershipM5.architecture.guards.test.ts` | channel adoption guards |
| M3 / M4 suites | regression green |

**Result:** 45 related tests PASS.

---

## Success criteria

| Criterion | Met |
|-----------|-----|
| Every production channel uses Membership + Check for financial operations | **Yes** |
| No production channel depends on legacy Session financial discovery for settle/freeze | **Yes** |
| Operational Session usage remains where appropriate | **Yes** |
| Dual-write remains enabled | **Yes** |
| Compatibility Cleanup not started | **Yes** |
| Explicit Cleanup readiness recommendation documented | **Yes — NOT YET** |

---

## Production readiness

1. Migration `0072` already certified (prerequisite).  
2. Deploy M5 application code with dual-write ON + authoritative Membership read ON.  
3. Monitor `check_membership_dual_write_failed` for sessionless `ensureCheckForOrder` failures.  
4. Do **not** begin Compatibility Cleanup in this release.
