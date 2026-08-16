# FORENSIC AUDIT

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

## Cap oracle

`checkLimit()` in `server/subscription-runtime/enforcement.ts`:

- Resolves `resolveOwnerEntitlements(ownerId)`.
- `plan === "NONE"` → deny, cap 0, `not_entitled`.
- Missing limit key → deny, `limit_key_unsupported`.
- `cap === null` → unlimited.
- Else `allowed = proposedTotal <= cap` (hard).

No resource-domain plan snapshot. No second matrix.

## Occupancy primitive

`withCommercialLimitOccupancy`:

1. Commit mutex row (`INSERT IGNORE`).
2. READ COMMITTED txn, `SELECT … FOR UPDATE` on the mutex.
3. Optional `resolveExisting`.
4. `occupancy = countOccupancy(tx)` (domain `COUNT(*)`).
5. `proposedTotal = occupancy + delta`.
6. `decide(proposedTotal)` → `checkLimit` in production paths.
7. Create or throw `CommercialLimitExceededError`.

The helper does not UPDATE/DELETE existing tenant rows when decide fails.

## Plan change owner

Tenant plan bind: `bindSubscriptionToLivePlan` in `adoptionService.ts`.

- Writes `commercial_subscription_bindings.planId` (upsert).
- Captures charged terms.
- Does **not** delete, hide, deactivate, or migrate restaurants/categories/items/POS.

Catalog limit edits: `saveLive` on the live plan, then `invalidateEntitlementCache()`.

POS, orders, and dashboard do not own quantity caps.

## Cache

Entitlement cache is **opt-in** (`useCache === true`). Default `checkLimit` path is live resolution. TTL 5s when enabled. `saveLive` and `notifySubscriptionLifecycleChanged` invalidate.

## Expiration vs downgrade

`deriveCommercialAccountState`:

- entitlements enabled → `ACTIVE`
- subscription present but entitlements disabled → `FROZEN`
- no subscription → `NONE`

Expiration / FROZEN is a distinct commercial state. Downgrade keeps an entitled plan with a lower numeric cap. G-11 does not merge them.

## Lifecycle grandfathered flag

`meta.grandfathered` on entitlements is **subscription-lifecycle** metadata. It is not occupancy downgrade grandfathering. Do not reuse that flag as a debt marker.

## Quantity keys with live occupancy

| Key | Occupancy set | Create path |
|-----|---------------|-------------|
| restaurants | all persisted restaurant rows for the owner | `createRestaurantWithCommercialLimit` |
| categories | all persisted category rows for the restaurant | `createCategoryWithCommercialLimit` |
| items | all persisted item rows for the restaurant | `createMenuItemWithCommercialLimit` |
| posTerminals | provisioned lifecycles (`registered` + `active`) | `PosTerminalService.consumeProvisionedSlot` |

`staffAccounts`, `branches`, `devices`, `qrCodes`, `screens`: catalog filter keys only. No occupancy primitive. G-11 does not invent one.

## Existing-resource mutations

Restaurant `update` / `delete` in `routers.ts` do not call `checkLimit` or the occupancy helper. Category/item flag flips (`isActive` / `isAvailable`) do not call occupancy. POS deactivate does not wrap occupancy (G-10). POS replace uses `occupancyDelta = 0`.

## Pre-G-11 replace gap

For `occupancyDelta = 0`, `proposedTotal = occupancy`. After a downgrade with `occupancy > cap`, `checkLimit` returned hard `limit_exceeded`. That blocked POS replace even though replace does not consume a slot. That contradicted Policy B and the certified replacement model. Closed by `isNewCapacityDenial`.

## G-08 preview

G-08 P10: create ∥ `UPDATE cap = 0` left the persisted restaurant in place. Classified then as G-11 policy, not an occupancy-create failure.
