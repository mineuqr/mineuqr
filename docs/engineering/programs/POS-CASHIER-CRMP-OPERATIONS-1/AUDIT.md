# AUDIT

Read-only forensic audit completed before implementation.

## EXISTING (CRMP)

- `CashRegister` / `crmp_registers`
- `FinancialShift` / `crmp_financial_shifts`
- Drawer movements/counts as children of Financial Shift
- Owner/admin APIs: `crmp.register.open/close`, `crmp.financialShift.open/close`
- Domain services enforce no auth; router uses `assertRestaurantAccess`
- Open register is idempotent when already open with the same operator
- Open shift is idempotent by `financialShiftId`
- Optimistic `version` concurrency

## REUSED

- `CrmpRegisterOperationsService` / `CrmpFinancialShiftOperationsService`
- `PosAccessContext` + `POS_ACCESS` + `SHIFT_OPEN` / `SHIFT_CLOSE`
- POS Terminal identity
- Settlement context wiring from POS-REGISTER-SHIFT-IMPLEMENTATION-1

## WIRED

Thin POS adapters that authorize a POS cashier, resolve restaurant/terminal, then call existing CRMP façades. Operator/actor is always `context.userId`.

## NEW

No new domain. No new table. No new commercial entitlement.

## FORBIDDEN

- `pos_cashiers`, `pos_shifts`, `pos_cash_movements`
- POS writing CRMP tables
- Exposing `paid_in` / `paid_out` (no public API, no movement idempotency)
- Weakening `crmpRouter` `assertRestaurantAccess`
- Owner/admin automatically becoming cashier
