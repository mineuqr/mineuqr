# LIFECYCLE-SETTLEMENT-GUARDS-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | LIFECYCLE-SETTLEMENT-GUARDS-1 |
| **Type** | Production Hardening |
| **Date** | 2026-07-25 |
| **Verdict** | **LIFECYCLE SETTLEMENT GUARDS — PRODUCTION CERTIFIED** |

---

## 1. Executive Summary

Operational terminal transitions are now blocked until the associated Check is financially complete (`paid` | `complimentary`).

Financial ownership is unchanged. No auto-settle. No new payment flows. Settlement Record / Reporting / Register / Financial Shift / Kitchen pipelines are untouched.

---

## 2. Architectural Invariant

> An operational entity may enter a terminal operational state **only if** every associated Check is already financially complete.

| Allowed | Blocked |
|---------|---------|
| `paid` | `open` |
| `complimentary` | (future: pending / partially_settled / failed) |

---

## 3. Shared Domain Guard

**Pure rules:** `shared/operational-session/check/lifecycleSettlementGuards.ts`

| API | Role |
|-----|------|
| `canCloseSession` / `assertSessionCloseAllowed` | Session close |
| `canCompleteOrder` / `assertOrderCompleteAllowed` | Order complete |
| `validateSettlementBeforeTerminalTransition` | Central validator |
| `LifecycleSettlementGuardError` | `SESSION_REQUIRES_SETTLEMENT` / `ORDER_REQUIRES_SETTLEMENT` / `CHECK_NOT_SETTLED` |

**I/O adapter:** `server/operational-session/check/lifecycleSettlementGuardService.ts`

| API | Loads |
|-----|-------|
| `assertSessionCloseable` | `getActiveCheckForSession` |
| `assertOrderCompletable` | `findBlockingMembershipForOrder` when sessionless |

---

## 4. Channel Enforcement

| Channel | Terminal action | Rule |
|---------|-----------------|------|
| Waiter / Table QR | Serve food | **Allowed unpaid** (no regression) |
| Waiter / Table QR | Close Session | **Blocked** until Check paid/complimentary |
| Self Ordering | Complete / Serve | **Blocked** until Check paid/complimentary |
| Counter Pickup | Complete / Serve | **Blocked** until Check paid/complimentary |
| All sessionless | Cancel before settle | **Allowed** (not a completion path) |

### Call sites (domain — not UI-only)

- `sessionService.closeSession` → `assertSessionCloseable` (void-then-close removed)
- `AdvanceOrderStatusService` when `targetStatus === "served"` → `assertOrderCompletable`  
  Covers `order.updateStatus`, device serve actions, and any other advance callers.

### UI consistency

Orders Workspace hides **Serve** for unpaid sessionless Orders; Settle + Cancel remain. Backend remains source of truth.

---

## 5. Explicit Non-Goals (honored)

- ✗ No Settlement redesign  
- ✗ No Settlement Record changes  
- ✗ No Reporting / Payment analytics changes  
- ✗ No Register / Financial Shift changes  
- ✗ No Kitchen redesign  
- ✗ No auto-settle / auto-payment  

---

## 6. Verification

| Check | Result |
|-------|--------|
| Cannot close unpaid session | ✓ |
| Can close paid / complimentary session | ✓ |
| Cannot complete unpaid Self Ordering | ✓ |
| Settle then complete | ✓ (guard allows paid) |
| Counter Pickup same rule (sessionless) | ✓ |
| Waiter serve unpaid | ✓ allowed |
| Direct `order.updateStatus` → served blocked when unpaid sessionless | ✓ |
| Idempotent served (already served) | ✓ early return |
| Cancel unpaid sessionless | ✓ not gated |
| Architecture guards | ✓ |

---

## 7. Certification

**LIFECYCLE SETTLEMENT GUARDS — PRODUCTION CERTIFIED**

No operational entity reaches terminal completion before financial completion. Domain-level enforcement is shared across Session and Order channels.
