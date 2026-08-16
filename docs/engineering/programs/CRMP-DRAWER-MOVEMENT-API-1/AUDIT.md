# AUDIT

Read-only forensic audit completed before implementation.

## EXISTING

- `CashRegister` / `crmp_registers` — Duty/catalog. No cash balance.
- `FinancialShift` / `crmp_financial_shifts` — cash custody aggregate.
- Drawer is 1:1 with Financial Shift (`drawerId`).
- `DrawerMovement` / `crmp_drawer_movements` — `opening_float | paid_in | paid_out | safe_drop | manual_adjustment`.
- `DrawerCount` / `crmp_drawer_counts` — interim/final.
- Domain command `recordDrawerMovement` and service `FinancialShiftDomainService.recordMovement`.
- Façade `DrawerDomainService.recordMovement`.
- Expected cash is computed, not stored: OpeningFloat + paid_in − paid_out − safe_drop + manual_adjustment + attributed cash tender.
- Public CRMP APIs: register duty, shift open/close/archive, getCurrent, tender summary, closing report.
- Authorization: `assertRestaurantAccess` (owner/admin). Domain services have no auth.
- Concurrency: Financial Shift `version` OCC.
- Opening float is created on shift open (idempotent by `financialShiftId`).

## MISSING (this program)

- Public tRPC mutation for drawer movements.
- Movement idempotency (`recordMovement` always minted `newCrmpId("mov")`).
- Server-stamped actor on a public movement command (existing close still takes client `actorUserId`).

## REUSED

- `recordDrawerMovement` validation and expected-cash rules.
- `crmp_drawer_movements` unique `movementId`.
- `CrmpFinancialShiftOperationsService` + `crmp.financialShift.*` router nest.
- Shift must be `open` (`shiftIsMutable`).

## WIRED (this program)

Thin CRMP public command:

`crmp.financialShift.recordDrawerMovement`

Authorize → resolve restaurant-scoped Register → resolve active Financial Shift → stamp actor from authenticated user → derive `movementId` from idempotency key → existing domain `recordDrawerMovement`.

## NEW

No new domain. No new table. No new commercial entitlement. No POS adapter.

## FORBIDDEN

- `pos_cash_movements`, `pos_drawer_movements`, `pos_cash_ledger`
- POS calling `recordMovement` in this program
- Treating drawer movement as Settlement, Check money, or Revenue
- Editing/deleting historical movements
- Weakening CRMP `assertRestaurantAccess`
- New migration without necessity
