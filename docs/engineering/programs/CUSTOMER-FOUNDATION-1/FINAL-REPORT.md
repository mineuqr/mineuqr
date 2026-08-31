# CUSTOMER-FOUNDATION-1 — Final Report

## VERDICT: **PASS**

## SHAs

| Field | Value |
|-------|-------|
| Starting SHA | `dc0b4e15b6466da18950d7964a88972243c4420d` |
| Ending SHA | `c67af313e5efadc6e2c663ebec87a6b456e64399` |
| Commit SHA | `c67af313e5efadc6e2c663ebec87a6b456e64399` |
| Commit | `feat(customer): establish global customer foundation` |

## Existing architecture discovered

No prior Customer CRM entity. Only order free-text `customerName`/`customerPhone` and push subscriptions. Greenfield Customer table + service.

## IMPLEMENTED

| Area | Detail |
|------|--------|
| Schema | `customers` — migration `0105_customers` |
| Types | `individual` \| `business`; status `active` \| `archived` |
| Optional tax | `taxNumber` nullable — never required at Customer layer |
| API | `customer.list/search/get/create/update` + `searchForPos` |
| Auth | Management: `assertRestaurantAccess`; Cashier search: POS scope |
| UI | Dashboard **Customers** tab (global) |
| Cashier | Select/clear bar; null → `العميل: نقدًا` (display only) |
| Guards | Country-agnostic, financial/compliance separation, tenancy |
| Governance | Terminus → `0105_customers` / 106 entries |

## Saudi acceptance

- Individual "خالد" without tax number → **valid**
- Business without tax number → **valid at Customer Foundation**
- No Customer Core `countryCode === "SA"` branching
- Tax number optional ≠ invoice type / non-tax invoice

## "العميل: نقدًا"

`cashierCustomerDisplayLabel(null)` — not a Customer row; not payment method.

## Boundaries preserved

- Collection Fact / PAID / settlement / payment methods unchanged
- Saudi Tax Profile separate
- Tax Invoice / IRN / QR / ZATCA deferred
- Realtime unchanged

## DEFERRED

- Persist `orders.customerId` on Confirm
- Tax Invoice snapshots
- Country-specific customer compliance modules
- Cashier create-customer inline
- Commercial plan gating of Customer feature

## Test / check results

| Check | Result |
|-------|--------|
| Customer + compliance + governance tests | **PASS** (95) |
| PaymentConfirm + POS financial + Cashier boundary | **21/21 PASS** |
| `pnpm run check` | **PASS** |
| `pnpm run db:governance-check` | **PASS** — terminus `0105_customers` |
| Production migrate `0105` | **SUCCESS** |
| Preflight | All journal hashes in DB |

## Push / HEAD

| Field | Value |
|-------|-------|
| Push | `git push origin main` |
| Commit | `c67af313e5efadc6e2c663ebec87a6b456e64399` |
| HEAD == origin/main | *(after push)* |
| Working tree | *(after push)* |
