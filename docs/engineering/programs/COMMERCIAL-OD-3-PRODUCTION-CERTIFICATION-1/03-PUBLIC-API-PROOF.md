# 03 — PUBLIC API PROOF

Canonical public identity is Live Plan UUID (`commercial_plans.id`), not integer `planId`.

## Deployed public catalog (live)

`GET https://www.mineuqr.com/api/trpc/commercialCatalog.public.listOfferings`  
`2026-08-15T13:29:49Z` — HTTP 200

| planCode | planId (UUID) | legacyPlanId (DTO only) |
|----------|---------------|-------------------------|
| basic | `79cf7bf7-c3b6-45de-8f20-42897cd493ac` | 30001 |
| professional | `0ade795a-02fa-4d3e-b9b5-262515bade09` | 30002 |
| enterprise | `d836bd10-9d9f-4408-a076-f921354d785a` | 30003 |

`PublicCatalogOffering.planId` = Live Plan UUID.  
`planCode` = Live Plan code.  
`legacyPlanId` remains a compatibility DTO field. Pricing and Customer Success do not use it as checkout/admin identity.

`getOffering` on the live origin:

| Input | Result |
|-------|--------|
| Professional UUID | 200 — `planId` UUID, `planCode=professional` |
| malformed `not-a-uuid` | 400 Invalid UUID |
| unknown UUID | 404 Offering is not publicly accessible |
| integer `30002` | 400 Invalid UUID |

## Application contracts (deployed commit `c1d64cba`)

| Surface | Identity |
|---------|----------|
| Public Pricing | `const checkoutPlanId = offering.planId` |
| Checkout PayPal / Tap | `planId: livePlanUuidInput` |
| Admin create / update | `livePlanUuidInput` |
| Customer Success | `id: o.planId` (string UUID; no `parseInt`) |
| `listPlans` `id` | Live Plan UUID + `planCode` |
| Admin stats `subscriptionsByPlan.planId` | stored UUID |
| Subscription plan view `id` (UUID path) | UUID |

`server/routers.ts` contains **zero** `planId: z.number()` writers.

## Classification of remaining integers

| Location | Class |
|----------|-------|
| `PublicCatalogOffering.legacyPlanId` | compatibility DTO — not canonical |
| Admin audit fixture `plan: 30002` in `admin-auth-1e` | historical display in tests |
| `bindings.legacyPlanId` | retained compatibility column |

None of these are the public canonical identity.

## Decision

**PUBLIC API GATE: PASS**
