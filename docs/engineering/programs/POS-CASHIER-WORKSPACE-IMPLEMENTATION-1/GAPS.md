# KNOWN GAPS / DELIBERATELY DEFERRED

**Program:** POS-CASHIER-WORKSPACE-IMPLEMENTATION-1

These are not treated as V1 defects unless they block owner testing of the Cashier shell.

## Missing command contracts (do not invent)

| Gap | Owner | Notes |
    10||-----|--------|--------|
| Kitchen status mutations from Cashier | Order / Kitchen | No POS command. Cashier is read + sale/intake/initiate only. |
| Paid settlement completion without Register shift | Check / CRMP Register | `pos.settlement.initiate` still requires an open financial shift. Cashier now explains the gap and links to **Register Ops**. Does not open the shift. |
| Order status update from Cashier | Order | No cashier-facing status command in this program. |
| Refund / void / discount | POS permissions exist; no V1 UI | Would require existing command contracts + Check ownership. |
| Settlement projection lag after intake | Order Settlement read | Amount due may briefly show Order total until `pos.read.orderSettlement.listByOrder` refreshes. Check id is shown from intake result immediately. |

## Resolved in owner-test correction

| Item | Resolution |
|------|------------|
| Category names | POS catalog projects Menu `categories.nameAr` / `nameEn`. Cashier does not display category IDs. |
| Product images | POS catalog projects Menu `menuItems.imageUrl`. Cashier uses `resolveImageUrl` with a letter fallback. |
| Place-sale latency | `pos.sale.create` defers outbox relay (`awaitRelay: false` → `scheduleOrderEventRelay`). Persist + idempotency unchanged. |
| Open Check result | Cashier stores and displays `pos.check.intake` `checkId` / open state. |
| Checkout / payment | Cashier presents Check amount due, selectable catalog payment methods, paid state. Forwards method to Check via `pos.settlement.initiate`. |

## Deferred programs (must remain possible)

- Restaurant Workspace / Staff Identity
- Owner / Admin / Staff separation UI
- Permission / Capability Catalog
- POS Seats / Cashier Seats
- Terminal / Session Policy
- Plan Entitlements vs Staff Permissions

## Inherited limitations (not this program)

- `pos.terminal.list` is owner/admin restaurant access. Staff with stored `terminalId` can still run cashier reads if they have `POS_ACCESS`.
- Order Read `listActive` cursor behavior remains inherited.
- Owner testing grant uses existing `pos.access.grant`. It is **not** Staff Access.

## Explicitly not created

`pos_revenue` · `pos_sales` · `pos_financial_totals` · `pos_reporting_db` · schema migration · plan seat hardcoding · auto `POS_ACCESS` for Owner/Admin.
