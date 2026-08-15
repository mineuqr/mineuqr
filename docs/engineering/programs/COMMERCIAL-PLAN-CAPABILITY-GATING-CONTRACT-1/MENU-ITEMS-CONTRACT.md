# MENU & ITEMS CONTRACT

**Canonical key:** `menuManagement`  
**Display:** Menu & Item Management  

## Scope

Restaurant **catalog management**: categories, items, and offers that share the same management surface.

Public customer menu **rendering is not this capability**.

## Classification

| Operation | Procedure | Class |
|-----------|-----------|--------|
| Category create / update / delete | `category.create` / `update` / `delete` | **GATED** |
| Menu item create / update / delete / image | `menuItem.create` / `update` / `delete` / `uploadImage` | **GATED** |
| Offer create / update / delete / image | `offer.create` / `update` / `delete` / `uploadImage` | **GATED** (same catalog management set) |
| Editor lists | `category.list`, `menuItem.listByCategory`, `offer.list` | **GATED** (management read) |
| Public catalog reads | `category.listPublic`, `menuItem.listByRestaurant`, `offer.listActive` | **NOT GATED** |
| Public menu render (slug / table / QR) | public menu procedures | **NOT GATED** |
| Item quantity / stock | dedicated stock APIs | **UNKNOWN** — no separate stock capability found; if stock is a field on `menuItem.update`, it is **GATED** as part of item mutation. Do not invent a stock capability. |
| Modifiers | dedicated modifier router | **UNKNOWN** — if modifiers persist only through `menuItem` payloads, they are **GATED** with items. Do not invent a modifier capability. |
| Menu “publish” if present as its own mutation | — | **GATED** if it is a catalog write; **UNKNOWN** until implementation enumerates the exact procedure name |

## Quotas (not this gate)

`assertCategoryCreateAllowed` / `assertMenuItemCreateAllowed` / `maxItems` remain **quotas**.

`maxItems = 50` ≠ capability OFF.  
Capability OFF ≠ set quota to 0.

Both may apply: ON + over quota = quota deny; OFF + under quota = entitlement deny.

## Disablement

- Management mutations: deny.
- Existing menus, categories, items, offers: **preserved**.
- Public rendering of the last saved catalog: **continues** (subject to FROZEN).
- No catalog DELETE as a gate.
