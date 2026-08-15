# API ENFORCEMENT CONTRACT

Negative authorization is mandatory. Direct tRPC with capability OFF = DENIED.

## Matrix

| Capability | Procedure | Operation | Gate required | Current gate | Contract gate |
|------------|-----------|-----------|---------------|--------------|---------------|
| `sessionTableManagement` | `session.markPaid` | Mutation | Yes | Restaurant + FROZEN (no requireFeature) | `requireFeature(..., "sessionTableManagement")` |
| `sessionTableManagement` | `session.markComplimentary` | Mutation | Yes | Same | Same |
| `sessionTableManagement` | `session.close` | Mutation | Yes | Same | Same |
| `sessionTableManagement` | `session.getOwnerTimeline` | Management read | Yes | Restaurant access | Same |
| `sessionTableManagement` | `session.getOwnerWorkspace` | Management read | Yes | Restaurant access | Same |
| `sessionTableManagement` | `session.getActiveByTable` | Public read | No | Public | **None** (this key) |
| `sessionTableManagement` | `session.getByToken` | Public read | No | Public | **None** (this key) |
| `menuManagement` | `category.create` / `update` / `delete` | Mutation | Yes | Restaurant + quota (`create` only) | `requireFeature(..., "menuManagement")` then quota |
| `menuManagement` | `menuItem.create` / `update` / `delete` / `uploadImage` | Mutation | Yes | Restaurant + quota (`create` only) | Same |
| `menuManagement` | `offer.create` / `update` / `delete` / `uploadImage` | Mutation | Yes | Restaurant | Same |
| `menuManagement` | `category.list` / `menuItem.listByCategory` / `offer.list` | Management read | Yes | Restaurant | Same |
| `menuManagement` | `category.listPublic` / `menuItem.listByRestaurant` / `offer.listActive` | Public render | No | Public + FROZEN | **None** (this key) |
| `menuDesign` | `restaurant.updateTemplate` | Mutation | Yes | `isSubscriptionActive` + admin role (wrong grant) | `requireFeature(..., "menuDesign")` **replace** role grant |
| `menuDesign` | `restaurant.updateCustomColors` | Mutation | Yes | Same wrong grant | Same |
| `menuDesign` | `restaurant.updateCustomFonts` | Mutation | Yes | Same wrong grant | Same |
| `menuDesign` | `restaurant.uploadImage` / `deleteImage` | Mutation | Yes | Restaurant | Same |
| `smartQr` | `table.create` / `createMultiple` | Mutation | Yes | Restaurant | `requireFeature(..., "smartQr")` then quota if wired |
| `smartQr` | `table.update` / `table.delete` | Mutation | Yes | Restaurant | Same |
| `smartQr` | `table.list` / `table.getById` | Management read | Yes | Restaurant | Same |
| `smartQr` | `table.getByNumber` (public) | Public resolution | No | Public | **None** (this key) |

## Negative requirement

```
capability OFF
  → authenticated customer
  → direct tRPC of any GATED procedure
  → COMMERCIAL_ENTITLEMENT_DENIED / FORBIDDEN
  → no persist
```

Alternate procedure names that perform the same write (if implementation finds any) must receive the same gate. Unknown extra writes discovered during implementation = **stop and extend this matrix** — do not ship ungated twins.

## Bypass prohibition

- UI hide only
- Client `enabled` / plan name
- Hardcoded customer IDs
- Admin role as commercial grant
- Calling a sibling procedure that writes the same table
