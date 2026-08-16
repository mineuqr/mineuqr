# POS ENTITLEMENT MATRIX

## Canonical commercial identity

| Kind | Key | Status |
|------|-----|--------|
| Feature (`FEATURE_KEYS` / Projection ID) | none for POS | Intentional — do not auto-create |
| Limit | `posTerminals` | Authoritative quantity |
| Capability matrix | `cap.limit.posTerminals` | `kind: "limit"` |
| Catalog filter | `COMMERCIAL_LIMIT_FILTER_KEYS` includes `posTerminals` | Packaging vocabulary |
| Required Live Plan keys | `restaurants`, `categories`, `items` | `posTerminals` is **optional recognized** |

`available` on Effective POS Entitlement means **included quantity > 0** (or unlimited). That is the POS “capability on/off” derived from the limit, not a separate feature flag.

Feature = whether POS may be used (included > 0 or unlimited).  
Limit = how many terminals may be provisioned.

Do not confuse those with Operational Device `devices`.

## Effective entitlement (`deriveEffectivePosEntitlement`)

| Source | included | available | provisioningAllowed |
|--------|----------|-----------|---------------------|
| Live Plan N | N | N > 0 | remaining > 0 |
| Missing / 0 (non-admin) | 0 | false | false |
| ADMIN / isAdmin without explicit key | null (unlimited) | true | true |
| ADMIN with explicit N | N | N > 0 | remaining > 0 |
| Lifecycle disabled / plan NONE | 0 | false | false |

## Actor × commercial × POS (actual)

| Actor | Commercial (restaurant owner plan) | Restaurant scope | POS_ACCESS | Cashier mutation |
|-------|-------------------------------------|------------------|------------|------------------|
| Restaurant Owner | `checkLimit(restaurant.userId)` | `owner` | **explicit grant required** | Denied without grants |
| Platform `role=admin` | restaurant owner plan, not admin’s role | `admin` | **explicit grant required** | Denied without grants |
| POS Cashier (staff) | restaurant owner plan | `pos_grant` if any grant | explicit | Allowed if grants + active terminal + available |
| Unauthorized staff | n/a | none | none | Denied at scope |
| PLATFORM_OWNER FULL_PLATFORM | unlimited **only if** `ownerId` is the platform owner; customer restaurant uses customer owner | `admin` if `role=admin` | **explicit grant required** | Not automatically a cashier |
| Restaurant Administrator (RBAC platform) | **not implemented** in POS | — | — | Future RBAC; must not become a cashier shortcut |

## Subscription × POS use

| Subscription | Limits enabled | POS `available` | Provision | Operate |
|--------------|----------------|-----------------|-----------|---------|
| Active / trial / grace | yes | follows `posTerminals` | `checkLimit(+1)` | if included > 0 |
| Expired / cancelled / suspended / archived / draft | no | false (cap 0) | deny | deny |
| Missing subscription (legacy / NONE) | fail-closed | false unless ADMIN hub | deny | deny |
| Live plan unreadable | `denyEntitlementsFailClosed` | false | deny | deny |
