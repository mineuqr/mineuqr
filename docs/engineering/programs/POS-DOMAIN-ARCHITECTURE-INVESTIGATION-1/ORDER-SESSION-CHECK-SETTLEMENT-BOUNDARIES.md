# ORDER / SESSION / CHECK / SETTLEMENT BOUNDARIES

## Order

Canonical place: `PlaceOrderService` + `IdentityPlaceOrderService` (`server/order/application/`).

Path: Ordering identity (service mode + fulfilment anchor) → `resolveOperationalSession` → PlaceOrder → optional `ensureCheckForOrder` for ephemeral/sessionless.

`orders.orderingChannel` is stamped at place (`drizzle/schema.ts`). Required by `IdentityPlaceOrderCommand.orderingChannel`.

`orders.tableId` / `tableNumber` remain NOT NULL. Non-table uses sentinels `LEGACY_NON_TABLE_TABLE_ID = 0` (`shared/ordering-platform/orderingIdentityContract.ts`). Not a fake `restaurant_tables` row.

**Future POS direct sale:** Cashier → POS → `IdentityPlaceOrder` with `serviceMode: "counter"` (or take_away) + `station` (or other non-table) anchor + **new** `orderingChannel: cashier_pos` (not registered today) → Check enrollment. Do **not** create `POS Order`.

## Session

`resolveOperationalSession`: `table` → persistent `dining_sessions`; `station` / `pickup_point` / `queue` / `drive_lane` → **ephemeral**, no dining session row.

`operational_checks.sessionId` is **nullable** (ADR-ARCH-020 sessionless finance).

POS **must not** own Session.

| POS mode | Session |
|----------|---------|
| Direct sale | No Dining Session required (ephemeral / sessionless Check) |
| Existing Check intake | Reference `dining_sessions` / `activeCheckId`; do not replace Session |

## Check

`operational_checks`: restaurant-scoped; monetary fields `subtotal`, `taxAmount`, `grandTotal`; tax/currency snapshots; outcomes `open|paid|complimentary|voided`. **No `version` column on the Check header.**

POS may discover/display/reference Check and later **initiate** settle via `CheckService` (`settleCheckPaidByIdDetailed`). POS must not duplicate totals or invent POS Check / POS Revenue.

## Settlement

Owner: Check (`CheckService.ts`). Publication: Settlement Record (ADR-ARCH-026). Tender lines: `check_settlement_transactions`.

Existing cashier-adjacent reuse: `StaffCounterPickupSettlementService` (staff settle of sessionless Checks; requires registerId + Financial Shift — CSA-03). `order.settlePaid` is a **public** tracking-token façade — not POS authorization.

POS later: call Check settle APIs. Must not become settlement owner. Must not finalize money offline.

**No blocker:** POS can consume Check/Settlement without a parallel financial SSOT if implementation stays behind these services.
