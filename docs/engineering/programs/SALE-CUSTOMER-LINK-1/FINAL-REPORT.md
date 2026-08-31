# SALE-CUSTOMER-LINK-1 — Final Report

## Verdict: **PASS**

## Sale Entity

Canonical Sale for Cashier POS = **`orders`** (created at Confirm via PlaceOrder / `finalizeCashierPreparedInvoice`).

## Relationship

`orders.customerId` → `customers.id` (nullable). Identifies buyer for the Sale only.

## Nullable Behavior

`customerId = NULL` is first-class. Cashier display `العميل: نقدًا` remains display-only (no fake Customer).

## Cashier

- Select / clear / create-then-select update draft snapshot (v4) and Confirm sends `customerId`.
- Inbound existing-order Confirm attaches via `setOrderSaleCustomerId`.

## Customer

No schema redesign. `taxNumber` optional. No SA branching.

## Authorization / Tenant Isolation

`resolveOptionalSaleCustomerId` → `findCustomerById(restaurantId, id)`; cross-tenant rejected.

## Historical Sales / Delete Behavior

FK **ON DELETE SET NULL** — Sales remain if Customer deleted.

## Financial / Compliance Boundary

No Collection Fact / PAID / PaymentConfirm / settlement / Compliance Orchestrator semantic changes.

## Migration

| Item | Value |
|------|-------|
| Tag | `0106_orders_customer_id` |
| Governance terminus | 0106 / **107** entries |
| Production apply | **SUCCESS** |
| Column | `orders.customerId` NULL int |
| FK | `orders_customer_id_fk` SET NULL |

## Tests

Focused saleCustomerLink + architecture + migration governance + financial/cashier guards: **PASS**  
`pnpm run check`: **PASS**  
`pnpm run db:governance-check`: **PASS**

## Deferred

Tax Invoice domain, InvoiceClassification, B2B/B2C, VAT, ZATCA, IRN, QR, buyer snapshots, numbering.

## Scope certification

NO TAX INVOICE WAS IMPLEMENTED.  
NO B2B/B2C CLASSIFICATION WAS IMPLEMENTED.  
NO VAT ENGINE WAS IMPLEMENTED.  
NO ZATCA / FATOORA / IRN / QR WAS IMPLEMENTED.  
NO COLLECTION FACT OR PAID SEMANTICS WERE CHANGED.  
NO CUSTOMER SCHEMA REDESIGN WAS PERFORMED.

## SHAs

| Field | Value |
|-------|-------|
| Commit | *(after push)* |
| Message | `feat(sale): persist customer relationship` |
