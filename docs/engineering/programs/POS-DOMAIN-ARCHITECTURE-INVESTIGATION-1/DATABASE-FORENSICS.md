# DATABASE FORENSICS

Journal terminus (local certified): `0090_commercial_subscription_concessions`. No POS tables.

| TABLE | OWNER | PURPOSE | TENANT KEY | IDENTITY | LIFECYCLE | SAFE TO REUSE? | REASON |
|-------|-------|---------|------------|----------|-----------|----------------|--------|
| `operational_devices` | Operational Device | Screen/hardware | `restaurantId` | `deviceId` | active/disabled | REFERENCE only | Not POS Terminal |
| `operational_device_tokens` | Operational Device | Pairing secrets | via device | `tokenId` | active/revoked/rotated | No | Hardware auth |
| `crmp_registers` | CRMP | Cash drawer station | `restaurantId` | `registerId` / code | provisioned/active/inactive | No as terminal | Register ≠ POS; type `mobile_pos` is naming only |
| `crmp_financial_shifts` | CRMP | Shift | restaurant via register | `financialShiftId` | ADR-030 | No | Shift ≠ terminal |
| `commercial_plans` | Catalog | Live Plan | n/a | UUID | live row | Yes (read) | Entitlement identity |
| `commercial_bundle_features` | Catalog | Capability ON/OFF | via bundle | `(bundleId, featureKey)` | included | Yes (read) | Not quantity |
| `commercial_limit_values` | Catalog | Quantities | via profile | `limitKey` | value/null | **EXTEND** | Add `posTerminals` later |
| `user_subscriptions` | Subscription | Entitlement identity | user | `planId` UUID | lifecycle | Yes (read) | Do not mutate for POS |
| `users` | Auth | Actor | n/a | `id` | role user/admin | Yes (cashier actor) | Not terminal |
| `restaurants` | Tenant | Business | `userId` owner | `id` | — | Yes (binding) | Terminal.restaurantId |
| `orders` | Order | Order truth | `restaurantId` | `id` | status/lifecycle | Yes (create via domain) | Channel stamp |
| `dining_sessions` | Session | Table visit | `restaurantId` | `id` / token | open/paid/… | Reference | POS must not own |
| `operational_checks` | Check | Money | `restaurantId` | `id` | outcome | Yes (consume) | No header `version` |
| `check_settlement_transactions` | Check | Tenders | `restaurantId` | `id` | status | Yes | Payment method ≠ channel |
| `check_split_payments` | Check | Split tender | `restaurantId` | `paymentId` | + `version` CAS | Yes | Child OCC |
| Settlement Record tables | Check publication | Immutable docs | restaurant | record id | append-only | Yes (read) | POS must not write |

**No POS / cashier / terminal table exists.**
Do not reuse `crmp_registers` or `operational_devices` as POS Terminal persistence.
