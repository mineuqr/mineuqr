# CHANNEL IDENTITY FORENSICS

## Registry (actual)

`shared/ordering-platform/orderingChannelRegistry.ts`:

Active: `table_session`, `waiter_tablet`, `qr`, `kiosk`
Registered (not active): `mobile`, `marketplace`, `delivery_partner`, `call_center`

**`cashier_pos` / CASHIER POS is not registered.**

Channel ≠ payment method. Payment methods live on `check_settlement_transactions.paymentMethod` (`cash|card|mada|...`).

## Survival through Check / Settlement

`orders.orderingChannel` is stamped at **place** and projected to `order_read_orders`.
Sales channel analytics resolve **only** from that stamp (`resolveReportingSalesChannel` ignores `identityScope`).

Check / Settlement Transaction tables do **not** store ordering channel. Channel for reporting is Order-lineage, not rewritten at settle.

`StaffCounterPickupSettlementService` and `order.settlePaid` settle money; they do **not** update `orders.orderingChannel` (no such write found in those paths).

Therefore: a Table/QR order paid by a cashier **remains** Channel = table/QR **if** place stamped `table_session` or `qr`. It does **not** become CASHIER because a cashier collected.

## Risk (not a current production bug)

If a future POS PlaceOrder stamps `cashier_pos` onto a table-origin order, or if settle rewrites channel, **that would be a BLOCKER**. Today: **PASS** for existing settle paths. Gap: register `cashier_pos` as `registered` (reportingVisible false until POS sales exist) so POS cannot invent an ungoverned stamp.

Channel sequence numbers (`orderNumber` / daily display) must not become legal invoice numbers (I-POS-24) — already a document-identity concern (ADR-ARCH-027), not POS-specific.
