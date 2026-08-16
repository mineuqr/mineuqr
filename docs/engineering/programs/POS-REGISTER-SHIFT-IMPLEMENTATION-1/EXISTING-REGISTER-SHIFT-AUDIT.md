# EXISTING REGISTER / SHIFT AUDIT

MineuQR already has a complete Cash Register Management Platform (CRMP).

| Plane | Owner | Location |
|-------|-------|----------|
| Register catalog + duty | CRMP | `shared/crmp/register/`, `server/crmp/RegisterDomainService.ts` |
| Financial Shift + drawer | CRMP | `shared/crmp/financialShift/`, `server/crmp/FinancialShiftDomainService.ts` |
| Settlement Context (read) | CRMP | `server/crmp/SettlementContextResolver.ts` |
| Settlement Attribution (write, post-commit) | CRMP | `crmp_settlement_attributions` |
| Money | Check / Settlement Record | `settleCheckPaidByIdDetailed` |
| POS Terminal | POS | `pos_terminals` |

**Before this program:** POS sale, check intake, and settlement initiation had **zero** Register/Shift coupling by design. Settlement was fail-open with no hints.

**StaffCounterPickupSettlementService** is the existing fail-closed caller (REGISTER_REQUIRED / SHIFT_REQUIRED). POS must not reuse that façade (wrong auth contract). POS now applies the same *operational* rule via CRMP `SettlementContextResolver` before calling Check.

## A–S

| # | Answer |
|---|--------|
| A | `CashRegister` (`shared/crmp/register/registerContract.ts`) |
| B | `FinancialShift` (`shared/crmp/financialShift/financialShiftContract.ts`) |
| C | Embedded `Drawer` on Financial Shift — no separate cashbox table |
| D | `crmp_registers.registerId` |
| E | `crmp_financial_shifts.financialShiftId` |
| F | CRMP `RegisterDomainService` |
| G | CRMP `FinancialShiftDomainService` |
| H | Financial Shift / `recordDrawerMovement` |
| I | No dedicated domain — `paid_out` movements |
| J | Register duty: `RegisterDomainService`; Shift: `FinancialShiftDomainService` |
| K | CRMP `operatorUserId` / assigned operator; POS `cashierUserId` for POS commands |
| L | Register optional `deviceId`; POS `terminalId` / `optionalDeviceId` |
| M | CRMP: `assertRestaurantAccess`. POS: `POS_ACCESS` + operation permission. `SHIFT_*` / `REGISTER_ADJUST` catalog-only |
| N | Projection `register` (unenforced). POS `posTerminals` limit |
| O | Optional Settlement Context + post-commit attribution. Check does not require Register for money |
| P | Same as O. Active shift required when the caller hard-gates |
| Q | Yes — POS consumes CRMP; does not change ownership |
| R | Resolve context; require it on POS settlement; pass `settlementContextHints`; read-only `pos.registerShift.context` |
| S | Cashier-facing CRMP open/close via POS permissions; public drawer-movement API; `requireFeature` on CRMP — out of scope |
