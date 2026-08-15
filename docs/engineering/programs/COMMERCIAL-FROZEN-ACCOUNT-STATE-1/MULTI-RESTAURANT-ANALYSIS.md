# MULTI-RESTAURANT-ANALYSIS.md

## Existing scope (not reinvented)

Commercial entitlement uses **account-level** subscriptions:

`pickUserLevelSubscription` → rows with `restaurantId === 0`.

One user commercial subscription covers that user's restaurants.

## Frozen scope

Frozen is **account-level**, same as the subscription architecture.

If the canonical user-level subscription is expired, **all restaurants owned by that user** resolve FROZEN together. Public QR for each restaurant uses `restaurant.userId`.

No restaurant is deleted. No partial data wipe.

## Restaurant-scoped rows

`resolveOrderingSubscriptionRow` can prefer a restaurant-scoped row for **ordering** resolution. Commercial entitlement / Frozen does **not** switch to that model.

This program does not introduce per-restaurant Frozen.

## Ambiguity

Current architecture can safely determine Frozen at the **user / account** boundary. Implementation proceeded on that existing model.

If a future product needs independent Frozen per restaurant, that requires a new subscription-scope decision — stop and propose it; do not silently fork state.
