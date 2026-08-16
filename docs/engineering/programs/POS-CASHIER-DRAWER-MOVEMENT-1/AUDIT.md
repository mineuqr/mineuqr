# AUDIT

Read-only forensic audit completed before implementation. No blockers.

## A. POS access

- `PosAccessContext`: `userId`, `restaurantId`, `terminalId`, `permissions`, `restaurantScope`
- `POS_ACCESS` is an explicit grant. Owner / admin / `PLATFORM_OWNER` are not cashiers.
- Restaurant scope: `assertRestaurantPosScope` (owner, admin, or any POS grant), then terminal resolution.
- POS Terminal is resolved server-side from `terminalId` + restaurant. Foreign / inactive / missing terminals are denied.
- Cashier identity is `context.userId` from the authenticated user.

## B. POS permissions

- Catalog: `shared/pos/permissions.ts`
- Enforcement: `PosAccessService.resolvePosTerminalAccess` + adapter double-check that `POS_ACCESS` and the operation permission are both present.
- `REGISTER_ADJUST` existed as a catalog key and was **catalog-only** after POS-CASHIER-CRMP-OPERATIONS-1.
- Semantics: register/drawer cash adjustment. Sufficient for Drawer Movement. No new permission created.

## C. POS router

- Existing nest: `pos.cashier.register.*`, `pos.cashier.financialShift.*`
- Pattern: `verifiedProcedure` → service authorize → CRMP façade → map errors.
- Register/Shift adapters already stamp `operatorUserId` / `actorUserId` from `context.userId`.
- Settlement adapter is a different path (`settleCheckPaid`) and is not reused for cash.

## D. CRMP API

- `crmp.financialShift.recordDrawerMovement` is certified and consumable.
- Input: restaurant, register, optional shift hint, movement type, amount, optional currency, reason, idempotency key.
- Actor: authenticated `ctx.user.id`. Client cashier ids are not accepted.
- Output: `{ shift, movement, alreadyApplied }` with CRMP `expectedCashAmount`.
- Idempotency: `drawerMovementIdForRetry` from restaurant + register + shift + actor + key.
- Concurrency: Shift `version` OCC with one reload retry inside CRMP.
- Errors: not found (register / no active shift), conflict (idempotency / mismatch / overdraft), validation (currency).

## E. Register / Shift resolution

- POS cashier adapters already load the Register in restaurant scope and bind it to the POS Terminal when both have a device id.
- CRMP `recordDrawerMovement` loads the Register and resolves the **active** Financial Shift server-side.
- `PosRegisterShiftContextService` remains the settlement/context read path. Not duplicated for this mutation.

## F. Architecture guards

- POS cashier guards previously forbade exposing `paid_in` (correct for that program).
- CRMP drawer-movement guards forbade POS consumption **in CRMP-DRAWER-MOVEMENT-API-1**.
- This program updates those guards: POS may call the CRMP façade; POS still must not persist cash or own domain writes.

## EXISTING (reused)

- `PosCashierCrmpOperationsService`
- `PosAccessContext` / `POS_ACCESS` / `REGISTER_ADJUST`
- `assertRegisterForTerminal`
- `CrmpFinancialShiftOperationsService.recordDrawerMovement`
- `crmp_drawer_movements`

## NEW

No new domain, table, permission, or idempotency store.

## FORBIDDEN (confirmed unused)

- `pos_cash_movements` / `pos_drawer_movements` / `pos_cash_ledger`
- POS `computeExpectedCash`
- POS movement-id derivation
- Direct `FinancialShiftDomainService` writes from POS
