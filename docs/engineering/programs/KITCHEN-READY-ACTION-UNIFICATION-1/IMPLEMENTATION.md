# KITCHEN-READY-ACTION-UNIFICATION-1

**Program:** KITCHEN-READY-ACTION-UNIFICATION-1  
**Type:** Operational lifecycle / UI ownership  
**Date:** 2026-09-06  
**Decision:** Kitchen Screen may mark displayed orders Ready. Cashier adds Ready while preserving Served.

## Ownership contract

The previous observation-only Kitchen rule (KITCHEN-LIFECYCLE-OWNERSHIP-1) is superseded for Ready only.

```
Kitchen Screen:  preparing → ready
Orders / Expo:   ready → served
Cashier:         preparing → ready → served
```

Kitchen does not gain `serve-order` or Accept. Ready is the persisted domain status. The active Kitchen query (`status: "active"`) returns only orders that are not yet `ready`.

## Transition authority

Reuse `AdvanceOrderStatusService` / `order.updateStatus` / `executeDeviceOrderAction`.  
No `kitchenMarkReady()` / `cashierMarkReady()`. No Financial Core, Collection Fact, PAID, settlement, or compliance changes.
