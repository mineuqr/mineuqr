# RESTAURANT STAFF ACCESS

## Audit (actual)

| Fact | Evidence |
|------|----------|
| Owner | `restaurants.userId` |
| Platform admin | `users.role === "admin"` |
| Restaurant tenancy helper | `assertRestaurantAccess` — owner or admin only |
| Staff membership table | **Does not exist** |
| Permission / role-assignment table | **Does not exist** |
| RBAC platform | Architecture-only (`RBAC-PLATFORM-ARCHITECTURE-1`) |
| `INTERNAL_STAFF_CATEGORIES` | Platform audit metadata, not restaurant authorization |
| PLATFORM_OWNER | ENV `ownerOpenId` via `isPlatformOwner` — commercial hub, not cashier |

## Decision

Do **not** replace or weaken `assertRestaurantAccess`.

Do **not** build restaurant RBAC.

Add a **narrow POS-owned** helper:

`assertRestaurantPosScope` / `resolveRestaurantPosScope`

Scope kinds:

- `owner` — `restaurant.userId === user.id`
- `admin` — `users.role === "admin"`
- `pos_grant` — user has at least one POS permission grant for that restaurant

PLATFORM_OWNER is **not** a scope kind. It does not become a cashier shortcut.

## Why this is safe

- Existing owner/admin restaurant management is unchanged.
- Non-owner staff enter the POS domain only with an explicit restaurant-scoped POS grant.
- Having scope is not cashier authorization. `POS_ACCESS` remains a separate grant.
- No generic roles, no restaurant membership platform, no second auth system.

Staff cashiers who are not owners are represented as:

```
authenticated user
  + pos_grant restaurant scope
  + explicit POS_ACCESS
  + active terminal
  + available POS entitlement
```
