# BASELINE

**Program:** CUSTOMER-FOUNDATION-1  
**Measured:** 2026-08-31  
**Starting SHA:** `dc0b4e15b6466da18950d7964a88972243c4420d`

## 1. Global Customer Core

Customer is a **global**, tenant-scoped domain answering: **who is this customer?**

It does **not** answer invoice type, taxability, payment method, or settlement.

## 2. Customer optionality

`customerId = null` is valid. Customer is optional on Order / Invoice Intent / Cashier / Collection Fact / PAID.

## 3–4. Individual / Business

`customerType`: `individual` | `business` — descriptive metadata only.  
Does **not** map to B2B/B2C or Tax Invoice type.

## 5. Optional tax information

`taxNumber` is optional for all types at Customer Foundation. No global mandatory tax fields.

## 6–7. Saudi acceptance

Saudi Individual (name only, no tax number) → **valid**.  
Saudi Business without tax number → **valid at Customer layer** (future Compliance may require tax data for a specific invoice scenario).

> NO TAX NUMBER ≠ NON-TAX INVOICE  
> CUSTOMER NAME ≠ INVOICE TYPE

## 8. "العميل: نقدًا"

Display/business state when no Customer selected. **Not** a persisted Customer. **Not** a payment method.

## 9–10. Customer vs Payment / Financial Truth

Customer cannot create/modify Collection Fact, PAID, tenders, settlement, or payment methods.

## 11–12. Customer vs Tax Profile / Tax Invoice

Seller Tax Profile ≠ Customer. Tax Invoice remains deferred.

## 13. Customer Type vs Invoice Type

Separated. Compliance/Tax Invoice owns classification later.

## 14. Country-specific Compliance boundary

No `if (countryCode === "SA")` in Customer Core. Saudi/ZATCA stays in Compliance Layer.

## 15–16. Tenant / Authorization

`assertRestaurantAccess` for Management CRUD.  
`assertRestaurantPosScope` for Cashier `searchForPos` (read-only).

## 17. Future Tax Invoice snapshot

When Tax Invoices exist, Compliance must snapshot Customer fields. Later Customer edits must not rewrite issued invoices. **DEFERRED.**

## Migration

`0105_customers` — governance terminus updated to 0105 / 106 entries.
