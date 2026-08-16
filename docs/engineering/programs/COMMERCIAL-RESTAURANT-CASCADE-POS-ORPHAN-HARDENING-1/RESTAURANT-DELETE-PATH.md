# RESTAURANT DELETE PATH

| Path | Entry | Transaction | Covered by this fix |
|------|--------|-------------|---------------------|
| Owner / admin restaurant wipe | `restaurant.delete` | `deleteRestaurantCascade` | Yes (`CascadeTx`) |
| Admin user wipe | `admin.deleteUser` | `deleteUserCascade` → `CascadeTx` per restaurant | Yes |
| Subscription-only | `deleteSubscriptionCascade` | Own tx | N/A (no restaurant row) |
| Soft `isActive` | update, not delete | — | Terminals remain (restaurant still exists; G-10 occupancy of inactive flags) |

Authorization unchanged: `assertRestaurantAccess` / `assertAdminAccess`. No new permission.
