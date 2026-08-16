# TEST RESULTS

## Targeted CRMP drawer movement

New tests added by this program: **13 passed / 0 failed**

- `shared/crmp/__tests__/financialShiftCommands.test.ts` — 2 new (idempotent replay, conflicting payload)
- `server/crmp/__tests__/FinancialShiftDomainService.test.ts` — 1 new (movementId replay)
- `server/crmp/api/__tests__/crmpDrawerMovement.api.test.ts` — 6
- `server/crmp/__tests__/crmp.drawerMovement.architecture.guards.test.ts` — 4

Covered: paid_in expected cash; authenticated actor; extra cashier fields ignored; permission/unauthenticated/cross-restaurant; closed shift / hint mismatch / overdraft / currency; idempotent retry; conflicting payload; concurrent same key; concurrent distinct keys; POS does not own cash persistence.

The files containing those tests (including preexisting cases in the same files) ran **39 passed / 0 failed**.

## POS folder

`pnpm exec vitest run server/pos/__tests__`

**122 passed / 0 failed** — POS still does not expose `recordMovement` / `paid_in`.

## CRMP / Settlement regression

`RegisterDomainService`, `crmp.architecture.guards`, `SettlementContextResolver`, `crmpRouter`, `SettleOrderPaidService`, `StaffCounterPickupSettlementService`

**52 passed / 0 failed**

Regression excluding this program's 13 new tests: **196 passed / 0 failed**.

## Build / check

- `pnpm build` — PASS
- `pnpm check` — exit 2 — **188** preexisting `error TS*`. Zero diagnostics in this program's CRMP/POS files. Count unchanged from POS-CASHIER-CRMP-OPERATIONS-1.
