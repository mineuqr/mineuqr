# CUSTOMER-FOUNDATION-1 — Final Report

## VERDICT: **PASS**

## SHAs

| Field | Value |
|-------|-------|
| Foundation commit | `c67af313e5efadc6e2c663ebec87a6b456e64399` |
| Cashier-create starting SHA | `1c49a8837ff0d1cbfaa658598589cf0fa8f0157d` |
| Cashier-create ending SHA | *(this commit after push)* |
| Commit | `fix(customer): complete cashier customer creation` |

## Existing architecture discovered

Global Customer domain already shipped (`0105_customers`). Cashier could search/select/clear but had no inline create. Management `customer.create` required owner/admin access; cashiers with POS grant needed a POS-scoped create that still calls `CustomerService.createCustomer`.

## IMPLEMENTED (foundation)

| Area | Detail |
|------|--------|
| Schema | `customers` — migration `0105_customers` (unchanged this completion) |
| Types | `individual` \| `business`; status `active` \| `archived` |
| Optional tax | `taxNumber` nullable — never required at Customer layer |
| API | `customer.list/search/get/create/update` + `searchForPos` + **`createForPos`** |
| Auth | Management: `assertRestaurantAccess`; Cashier search/create: POS scope |
| UI | Dashboard **Customers** tab (global) |
| Cashier | Select/clear + **إضافة عميل** dialog; null → `العميل: نقدًا` |
| Guards | Country-agnostic, financial/compliance separation, tenancy, create reuse |
| Governance | Terminus remains `0105_customers` / 106 entries — **no new migration** |

## Cashier customer creation completion

| Requirement | Result |
|-------------|--------|
| Visible **إضافة عميل** beside اختيار | **PASS** — `CashierCustomerBar` |
| Dialog: Individual / Business, required name, contacts, optional tax | **PASS** |
| Create via existing Customer domain (`createForPos` → `createCustomer`) | **PASS** |
| Newly created customer immediately selected | **PASS** — `onSelect` on success |
| Dialog closes; no full page reload | **PASS** |
| Sale items / discounts / payment / CF / PAID untouched | **PASS** — selection state only; Confirm path does not read `selectedCustomer` |
| Individual without tax number | **PASS** (validation + dialog) |
| Business without tax number | **PASS** (global contract) |
| Optional tax number | **PASS** |
| نقدًا remains display-only fallback | **PASS** |
| No SA / B2B-B2C / Tax Invoice / ZATCA / IRN / QR | **PASS** |
| No schema migration | **PASS** — 0105 sufficient |

## Auth

- `customer.create` — Management (`assertRestaurantAccess`)
- `customer.createForPos` — Cashier POS (`assertRestaurantPosScope` + same `createCustomer`)
- Update/archive remain Management-only

## Boundaries preserved

- Collection Fact / PAID / settlement / payment methods unchanged
- Customer Core remains country-agnostic
- Tax Invoice / IRN / QR / ZATCA / B2B-B2C deferred
- No fake Customer named نقدًا

## Collateral fix

Stale architecture guards in Incoming Confirm Order Lock / Incoming Check Recovery / Recovery Discovery Starvation asserted `journal.not.toContain("0102_")`, which broke after later certified migrations (`0102`…`0105`). Updated to preserve program intent (no CF unique writer / no bare `0102.sql` / no recovery cron) without freezing the journal terminus.

## DEFERRED

- Persist `orders.customerId` on Confirm
- Tax Invoice snapshots
- Country-specific customer compliance modules
- Commercial plan gating of Customer feature
- B2B/B2C invoice classification (not Customer Core)

## Test / check results

| Check | Result |
|-------|--------|
| Customer foundation + cashier-create architecture guards | **PASS** (18) |
| Shared customer validation | **PASS** (12) |
| PaymentConfirm + POS terminal + Cashier financial boundary + fixed CF/recovery guards | **PASS** (67 across focused suite) |
| `pnpm run check` | **PASS** |
| `git diff --check` | **PASS** |
| Migration governance | **SKIPPED** — no schema change |

## Push / HEAD

| Field | Value |
|-------|-------|
| Push | `git push origin main` |
| HEAD == origin/main | *(after push)* |
| Working tree | *(after push)* |
