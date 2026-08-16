# FINAL REPORT

**PROGRAM:** COMMERCIAL-RESTAURANT-CASCADE-POS-ORPHAN-HARDENING-1  

**STATUS:** PASS — LOCALLY CERTIFIED  

**MODE:** AUDIT → IMPLEMENT → TEST → CERTIFY  

**PREDECESSOR:** COMMERCIAL-ONBOARDING-OCCUPANCY-INVARIANT-1 (G-04); finding from COMMERCIAL-LIMIT-OCCUPANCY-COMPREHENSIVE-AUDIT-1 (G-05)

---

## ROOT CAUSE

`deleteRestaurantCascadeTx` hard-deleted the restaurant and menu/order children but never deleted `pos_terminals` (or restaurant-owned POS grants / sale idempotency). No SQL FK existed to compensate.

## RESTAURANT DELETE ARCHITECTURE

Hard delete via `deleteRestaurantCascade` (`restaurant.delete`) and `deleteUserCascade` (`admin.deleteUser`). Both use `deleteRestaurantCascadeTx` in one Drizzle transaction.

## POS TERMINAL OWNERSHIP

`restaurantId` on `pos_terminals`. All lifecycles deleted with the restaurant.

## POS PERMISSION OWNERSHIP

Restaurant-scoped (`restaurantId`, `userId`, `permission`). Deleted with the restaurant.

## POS SALE IDEMPOTENCY OWNERSHIP

Operational Sale→Order map, restaurant-scoped. Deleted with the restaurant because orders are already cascade-deleted. Not retained as financial history.

## DATABASE CONSTRAINT RESULT

No FK. Application cascade is the existing platform pattern. **No 0095.**

## DELETE PATH RESULT

Both production wipe paths covered. No other production restaurant-row delete found.

## TRANSACTION RESULT

POS deletes on the existing `tx`. No second connection.

## ROLLBACK RESULT

Failure after POS cleanup starts fails the callback; completed cascade audit is not emitted.

## TENANT ISOLATION RESULT

Deletes are `eq(table.restaurantId, restaurantId)` only.

## COMMERCIAL OCCUPANCY RESULT

COUNT unchanged. Orphans cannot remain to be counted. Helper not modified.

## CONCURRENCY RESULT

Serialized occupancy vs delete is **not** added (no new lock). Classified remaining risk: a concurrent POS **provision** that inserts after this transaction’s `DELETE pos_terminals` and does not re-validate restaurant existence could still write a terminal for a restaurant being deleted. That is a provision TOCTOU (G-07/G-08 class), not the cascade omission G-05 closed. **Not STOP** for G-05. Do not invent a lock here.

## FINANCIAL ISOLATION RESULT

No new Order/Check/Settlement/CRMP/reporting deletes. Existing order cascade preserved.

## IMPLEMENTATION RESULT

`server/db/cascadeDeletes.ts` only (plus tests/docs).

## TARGETED TESTS

17 passed

## REGRESSION TESTS

62 files / 417 passed

## BUILD

PASS

## CHECK

188 `error TS*`

## MIGRATION

NONE

## DATABASE MUTATION

None against application/Production DBs (unit/guard tests).

## PRODUCTION MUTATION

0

## COMMIT

NONE

## PUSH

NONE

## DEPLOY

NONE

## REMAINING RISKS

- Concurrent provision vs restaurant delete TOCTOU (classified above).  
- CRMP / Check / Settlement Record rows still not in restaurant cascade (pre-existing DATA-RETENTION gap, not G-05).  
- Occupancy lock mutex rows for deleted `restaurant` scopeIds retained (harmless, not counted).  
- G-06…G-11, G-02, G-03 unchanged.

## POLICY GAPS

None for G-05. Inactive restaurant flags still occupy (G-10).

## NEXT PROGRAM

Operator-selected. **Not started:** G-06, G-03, POS-READ-APIS-IMPLEMENTATION-1.

## FINAL

**STOP.**
