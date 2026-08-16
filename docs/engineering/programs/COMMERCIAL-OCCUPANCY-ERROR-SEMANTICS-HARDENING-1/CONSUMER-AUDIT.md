# CONSUMER AUDIT

| Consumer | After G-06 |
|----------|------------|
| `createRestaurantWithCommercialLimit` | shared mapper |
| `createCategoryWithCommercialLimit` | shared mapper |
| `createMenuItemWithCommercialLimit` | shared mapper |
| POS register / activate-from-deactivated / replace | Commercial errors propagate; `mapPosError` uses shared mapper |
| G-04 `POST /api/auth/register` | unchanged distinct JSON codes |

No other `withCommercialLimitOccupancy` production consumers found.
