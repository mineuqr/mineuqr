# ONBOARDING AUDIT

## Path

`server/auth-local/registerOwner.ts` → `registerOwnerTransactional`:

1. Unique email / openId  
2. `db.transaction`: insert `users`, insert `restaurants` (first location), trial subscription payload  
3. **No** `withCommercialLimitOccupancy`  
4. **No** `checkLimit`

Chicken-and-egg: entitlements require a subscription; the first restaurant is created in the same tx as the trial bind.

## Can occupancy exceed the entitled limit?

Today trial resolves to Catalog **Professional**. Legacy matrix / typical Live Plan: `restaurants: 5` (Professional/Trial). Bootstrap is **0→1**, which is **within** that cap.

If a future trial Live Plan set `restaurants: 0`, registration would still insert one restaurant → **occupancy > cap**. That is not checked.

Concurrent double-submit: duplicate email / openId constraints. Not a commercial race across two users.

## Classification

| Lens | Result |
|------|--------|
| Current Professional trial cap ≥ 1 | **E. INTENTIONAL BYPASS — ARCHITECTURALLY CORRECT** (bootstrap 0→1) |
| No assert that trial `restaurants` cap ≥ 1 | **B. REQUIRED FOUNDATION** (fail registration if cap is 0) |
| Invent freeze/delete if cap 0 | **C. POLICY** — do not invent |

Do **not** silently call this “complete occupancy.” It is a documented bootstrap exception.
