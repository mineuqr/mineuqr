# API DESIGN

Existing `pos` router, still thin.

| Path | Gate | Purpose |
|------|------|---------|
| `pos.access.resolve` | `assertRestaurantPosScope` | Full access decision + context |
| `pos.access.context` | `assertRestaurantPosScope` | Context for `POS_ACCESS` |
| `pos.access.authorize` | `assertRestaurantPosScope` | Same decision (Phase 1 name kept) |
| `pos.access.grant` | `assertRestaurantAccess` | Owner/admin assigns a POS permission |
| `pos.access.revoke` | `assertRestaurantAccess` | Owner/admin removes a POS permission |

Terminal lifecycle APIs remain owner/admin-only.

No sale, payment, settlement, refund, or Register APIs.
