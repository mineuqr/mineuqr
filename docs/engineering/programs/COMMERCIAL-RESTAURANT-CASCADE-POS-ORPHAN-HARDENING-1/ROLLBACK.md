# ROLLBACK

If any later statement in the same callback fails (including `delete(restaurants)`), Drizzle/InnoDB rolls back the whole transaction, including POS deletes.

Test: `delete(restaurants)` throws → `deleteRestaurantCascade` rejects; no `cascade_restaurant_deleted` completed audit.

Forbidden partial states (deleted restaurant + leftover terminals, or live restaurant + missing terminals from this tx) do not commit.
