# DOMAIN INVENTORY

Quantity occupancy is only implemented for four live limit keys. Vocabulary-only keys are listed so they are not mistaken for occupancy gaps.

## Currently quantity-governed

### restaurants

| Field | Value |
|-------|--------|
| LIMIT KEY | `restaurants` |
| CAP SOURCE | `checkLimit({ ownerId, limitKey: "restaurants" })` |
| OCCUPANCY SOURCE | `COUNT(*)` `restaurants` where `userId` (inactive rows included) |
| CREATE PATH | `restaurant.create` → `createRestaurantWithCommercialLimit` → helper |
| REPLACE PATH | none |
| DELETE PATH | `restaurant.delete` → `deleteRestaurantCascade` (hard delete of the row) |
| HARD DELETE PATH | same cascade; not occupancy-locked |
| RESTORE PATH | none |
| PLAN CHANGE PATH | `bindSubscriptionToLivePlan` / catalog adoption; no occupancy lock |
| ADMIN PATH | same helper (admin may choose `ownerUserId`; still occupancy-checked) |
| OWNER PATH | same helper |
| PLATFORM OWNER PATH | same `restaurant.create` mutation |
| TRANSACTION BOUNDARY | helper: committed mutex → RC txn → `FOR UPDATE` → COUNT → decide → INSERT |
| OCCUPANCY HELPER USAGE | yes |
| IDEMPOTENCY | none |
| CONCURRENCY CONTROLS | tenant lock `(owner, userId, restaurants)` |

### categories

| Field | Value |
|-------|--------|
| LIMIT KEY | `categories` |
| CAP SOURCE | `checkLimit` owner of the restaurant |
| OCCUPANCY SOURCE | `COUNT(*)` `categories` where `restaurantId` |
| CREATE PATH | owner/staff: `createCategoryWithCommercialLimit`; **admin: `createCategory` (no helper)** |
| REPLACE PATH | none |
| DELETE PATH | `deleteCategory` — deletes child `menu_items` then the category; not occupancy-locked |
| HARD DELETE PATH | same |
| RESTORE PATH | none |
| PLAN CHANGE PATH | catalog / subscription bind |
| ADMIN PATH | skips quantity occupancy (G-09 policy) |
| OWNER PATH | helper |
| TRANSACTION BOUNDARY | helper for non-admin; admin insert is unlocked |
| OCCUPANCY HELPER USAGE | non-admin only |
| IDEMPOTENCY | none |
| CONCURRENCY CONTROLS | lock `(restaurant, restaurantId, categories)` for non-admin |

`getRestaurantById` runs **before** the occupancy transaction.

### items

| Field | Value |
|-------|--------|
| LIMIT KEY | `items` |
| CAP SOURCE | `checkLimit` |
| OCCUPANCY SOURCE | `COUNT(*)` `menu_items` where `restaurantId` |
| CREATE PATH | non-admin helper; **admin `createMenuItem` skip** |
| REPLACE PATH | none |
| DELETE PATH | `deleteMenuItem`; not occupancy-locked |
| HARD DELETE PATH | same |
| RESTORE PATH | none |
| ADMIN PATH | skips quantity occupancy (G-09) |
| TRANSACTION BOUNDARY | helper for non-admin |
| OCCUPANCY HELPER USAGE | non-admin only |
| IDEMPOTENCY | none |

### posTerminals

| Field | Value |
|-------|--------|
| LIMIT KEY | `posTerminals` |
| CAP SOURCE | `checkLimit` |
| OCCUPANCY SOURCE | COUNT of terminals whose lifecycle is provisioned (`registered` \| `active`) |
| CREATE PATH | `PosTerminalService.register` / reactivate-from-deactivated → `consumeProvisionedSlot` |
| REPLACE PATH | `replace` with `occupancyDelta = 0` when previous is provisioned; re-read lifecycle under lock |
| DELETE PATH | deactivate updates lifecycle **without** the occupancy lock (COUNT drops naturally) |
| HARD DELETE PATH | restaurant cascade deletes `pos_terminals` |
| RESTORE PATH | activate from `deactivated` consumes a slot (`occupancyDelta` default 1) |
| ADMIN PATH | restaurant access + same service (no quantity skip) |
| TRANSACTION BOUNDARY | helper; `getRestaurantById` **before** lock |
| OCCUPANCY HELPER USAGE | yes |
| IDEMPOTENCY | register with explicit code returns existing non-replaced terminal (`resolveExisting`) |
| CONCURRENCY CONTROLS | lock `(restaurant, restaurantId, posTerminals)` |

`pos_terminals` has **no FK** to `restaurants`. StagIn branch does not currently have the `pos_terminals` table (0091 not applied on the sparse branch). POS races used the G-07 terminal fixture with the same COUNT+lifecycle semantics.

## Onboarding (first restaurant)

| Field | Value |
|-------|--------|
| LIMIT KEY | `restaurants` (trial plan) |
| CAP SOURCE | `assertOnboardingFirstRestaurantPermitted` from live trial catalog |
| OCCUPANCY SOURCE | new owner; proposedTotal = 1; not a COUNT of existing owner restaurants |
| CREATE PATH | `registerOwnerTransactional` inserts user + restaurant + trial in one tx |
| HELPER | **not used** (helper opens its own tx; subscription does not exist yet) |
| IDEMPOTENCY | unique email / openId |
| CONCURRENCY | unique email; two different emails are two owners |

## Not quantity-occupancy (vocabulary / feature only)

| Resource | Why it is not G-08 occupancy |
|----------|------------------------------|
| staffAccounts | limit key exists; no COUNT occupancy create path |
| branches | same |
| devices | feature entitlement (`requireFeature("devices")`), not `posTerminals` COUNT |
| qrCodes / storage / images / ordersPerMonth | not adopted into the occupancy helper |

## Dead check-then-act

`assertRestaurantCreateAllowed` / `assertCategoryCreateAllowed` / `assertMenuItemCreateAllowed` still exist. Live insert paths do not call them.

## Delete accounting

Deletes never write `commercial_limit_occupancy_locks` and never decrement a counter. Occupancy remains domain `COUNT(*)`.
