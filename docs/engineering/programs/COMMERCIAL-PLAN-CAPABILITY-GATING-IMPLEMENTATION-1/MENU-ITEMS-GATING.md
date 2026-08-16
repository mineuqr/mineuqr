# MENU & ITEMS GATING

**Key:** `menuManagement`

Gated: `category` create/update/delete + editor list; `menuItem` create/update/delete/uploadImage + `listByCategory`; `offer` create/update/delete/uploadImage + editor list.

Not gated: `category.listPublic`, `menuItem.listByRestaurant`, `offer.listActive`.

Quotas (`assertCategoryCreateAllowed` / `assertMenuItemCreateAllowed`) still run after the entitlement gate.
