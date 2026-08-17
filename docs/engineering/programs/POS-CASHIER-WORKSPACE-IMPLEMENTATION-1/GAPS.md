# KNOWN GAPS / DELIBERATELY DEFERRED

**Program:** POS-CASHIER-WORKSPACE-IMPLEMENTATION-1

These are not treated as V1 defects unless they block owner testing of the Cashier shell.

## Missing command contracts (do not invent)

| Gap | Owner | Notes |
|-----|--------|--------|
| Kitchen status mutations from Cashier | Order / Kitchen | No POS command. Cashier is read + sale/intake/initiate only. |
| Paid settlement completion without Register shift | Check / CRMP Register | `pos.settlement.initiate` may fail without an open financial shift. Open shift from **Register Ops**. |
| Category names on POS catalog | Menu / Catalog | DTO has `categoryId` only. UI labels as "Category {id}". |
| Order status update from Cashier | Order | No cashier-facing status command in this program. |
| Refund / void / discount | POS permissions exist; no V1 UI | Would require existing command contracts + Check ownership. |

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
