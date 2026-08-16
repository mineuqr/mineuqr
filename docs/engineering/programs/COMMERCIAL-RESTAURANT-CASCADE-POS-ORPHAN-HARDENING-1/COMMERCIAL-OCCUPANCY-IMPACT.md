# COMMERCIAL OCCUPANCY IMPACT

Occupancy COUNT is unchanged: domain `listByRestaurant` / provisioned lifecycles.

After successful restaurant delete:

- restaurant row gone  
- POS terminal rows for that id gone  
- COUNT for that restaurant id is 0 because **data is gone**

No orphan filter, no second counter, no `checkLimit` / helper change.

Leftover `commercial_limit_occupancy_locks` rows for `scopeKind=restaurant, scopeId=<deleted id>` are mutex tokens, not occupancy. Not required for G-05.
