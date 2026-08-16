# DOMAIN OWNERSHIP

| Concern | Owner | POS role |
|---------|--------|----------|
| POS Terminal identity / lifecycle | **POS** | Owns |
| Effective POS quantity | Live Plan / `checkLimit` | Reads |
| Restaurant tenancy | Restaurant access | Calls `assertRestaurantAccess` |
| Operational Device / screens | Device Management | Optional association only |
| Cashier permission namespace | POS (catalog) | Owns catalog; grants are explicit |
| Order | Order domain | Future PlaceOrder consumer |
| Session | Session domain | May be sessionless later |
| Check | Check domain | Future settle consumer |
| Settlement | CheckService / Settlement Record | Future consumer |
| Register / Shift / Drawer | CRMP | Future association |
| Reporting | Reporting platform | Reads Order channel |
| Commercial subscription / Charged Terms | Commercial | Untouched |
| Country compliance / ZATCA | Later integration | Untouched |

POS must not mutate subscription, commercial projection, Order, Check, Settlement, Register, or Reporting.
