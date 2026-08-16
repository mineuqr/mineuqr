# REGISTER / REPORTING BOUNDARIES

## Register / Shift

CRMP exists and is partial-production: `crmp_registers`, `crmp_financial_shifts`, `server/crmp/`, ADR-ARCH-028/030/033.

Register owns drawer / shift / expected vs actual / settlement **attribution**. Check still owns money.

`registerType` includes `mobile_pos`. That is a **Register catalog type**, not a POS Terminal. Current code does **not** couple a POS Terminal entity to Register (no POS Terminal entity exists). Naming collision is a documentation risk only.

POS Terminal ≠ Register. Do not create POS Cash Drawer or POS Shift.

If Register is incomplete for a POS cash workflow: **do not build Register in POS programs.** Dependency: existing CRMP + future `POS-REGISTER-SHIFT-IMPLEMENTATION-1` (attribution/wiring only).

Staff settle already requires register + open shift (`StaffCounterPickupSettlementService.ts`). POS collection of existing Checks can follow that pattern later.

## Reporting

Revenue SSOT: paid Check `grandTotal` (ADR-ARCH-020 R9; `server/reporting-platform/` tests).

Existing dimensions:

| Dimension | Status |
|-----------|--------|
| Sales channel | From `orders.orderingChannel` via `SalesChannelAnalyticsService` + registry |
| Payment method | `PaymentMethodAnalyticsService` / Settlement Record snapshots |
| Cashier | **Not** a reporting dimension today |
| POS Terminal | **Not** present |
| Register / Shift | Attribution on CRMP; not a Reporting revenue rewrite |

POS must not write reporting facts. Future dimensions (terminal, cashier) must be derived from operational/financial facts stamped at Order/Check/Settlement/Attribution time — follow-up, not Phase 1 schema on Reporting.
