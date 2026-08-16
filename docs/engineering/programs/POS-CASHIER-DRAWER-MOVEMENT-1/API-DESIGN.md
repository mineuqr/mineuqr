# API DESIGN

Canonical POS name (existing cashier nest, Shift-owned cash):

`pos.cashier.financialShift.recordDrawerMovement`

Not `pos.cashier.drawerMovement` — POS already nests cash lifecycle under `pos.cashier.financialShift.*`, matching `crmp.financialShift.recordDrawerMovement`.

## Input (untrusted)

Routing (validated, not authoritative):

- `restaurantId`
- `terminalId`
- `registerId`
- `financialShiftId` (optional hint)

Business:

- `movementType` — `paid_in | paid_out | safe_drop | manual_adjustment`
- `amount` — signed decimal string (manual_adjustment may be negative)
- `reason` — required
- `idempotencyKey` — required, 8–128 chars (POS input bound; CRMP owns identity)
- `currencyCode` — optional; CRMP rejects mismatch

Not accepted: `cashierId`, `operatorUserId`, `actorUserId`, `userId`, `movementId`, `expectedVersion`, `expectedCash`.

## Authorization

`verifiedProcedure` → `POS_ACCESS` + `REGISTER_ADJUST` → server restaurant + terminal.

## Call

`CrmpFinancialShiftOperationsService.recordDrawerMovement` with:

- `restaurantId: context.restaurantId`
- `registerId` after terminal/register check
- `actorUserId: context.userId`
- forwarded business fields + optional shift hint + idempotency key

## Output

Canonical CRMP `{ shift, movement, alreadyApplied }` plus POS attribution `{ cashierUserId, terminalId }` matching existing cashier adapters.

## Errors (existing POS mapping)

| Condition | POS code / tRPC |
|-----------|-----------------|
| Unauthenticated | `UNAUTHORIZED` |
| Missing `POS_ACCESS` / `REGISTER_ADJUST` | `pos_permission_denied` / `FORBIDDEN` |
| Foreign terminal | `terminal_foreign` / `FORBIDDEN` |
| Missing terminal | `terminal_not_found` / `FORBIDDEN` |
| Wrong restaurant | restaurant scope `FORBIDDEN` |
| No active Shift / closed Register or Shift | `shift_required` / `BAD_REQUEST` |
| Shift hint mismatch | `shift_mismatch` / `BAD_REQUEST` |
| Exact idempotent retry | success, `alreadyApplied: true` |
| Conflicting payload | `idempotency_conflict` / `CONFLICT` |
| Overdraft | `drawer_overdraft` / `CONFLICT` |
