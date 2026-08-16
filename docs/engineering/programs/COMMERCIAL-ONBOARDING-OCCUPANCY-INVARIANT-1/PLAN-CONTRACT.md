# PLAN CONTRACT

## Source of the onboarding plan

`resolveTrialPolicyFromCatalog()` → Professional live offering (`planCode === "professional"`, else first trial-capable offering). Same resolver as trial subscription `planId`.

Restaurant cap is read from that offering’s `limits` row `limitKey === "restaurants"`. **No** `?? 1`.

## Catalog vs runtime

| Layer | Role |
|-------|------|
| Live Plan editor / `validateLivePlanLimitValues` | Allows 0 and unlimited `null` |
| Seed | Professional restaurants = 5 today |
| This program | Runtime fail-closed if the **effective** trial cap does not permit proposedTotal 1 |

The architecture is **not** `restaurants = 1`. If Trial cap changes from 5 to 2, onboarding still succeeds. If it changes to 0, onboarding fails closed (operationally disables self-service signup).

## Unlimited

Commercial `cap === null` **with the key present** means unlimited and **allows** the first restaurant. Program text listing “null” under fail-closed is interpreted as **unresolved / missing JS value**, not Catalog unlimited. Missing key is fail-closed, not unlimited.

## Not done

No saveLive policy that forbids `restaurants = 0` on Professional. Setting 0 is a valid way to refuse new onboarding. Existing-tenant freeze on downgrade remains G-11.
