# POS OWNERSHIP

POS Terminal belongs to Restaurant via `pos_terminals.restaurantId` (integer, **no SQL FK**).

Lifecycles: `registered` | `active` | `deactivated` | `replaced`.

Restaurant deletion deletes **all** of those rows for that `restaurantId`. It does not replace, provision, activate, or settle.

Occupancy COUNT remains `listByRestaurant` filtered to provisioned (`registered` ∪ `active`). After cascade, that list is empty because **rows are gone**, not because COUNT was filtered.
