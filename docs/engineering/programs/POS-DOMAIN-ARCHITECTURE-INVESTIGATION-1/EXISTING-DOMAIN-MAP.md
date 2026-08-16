# EXISTING DOMAIN MAP

| Domain | Owner path | What it is | POS relationship |
|--------|------------|------------|------------------|
| Commercial Catalog | `server/services/commercial-catalog/` | Live Plans, prices, bundles, limits | Entitlement source. Do not duplicate. |
| Subscription Runtime | `server/subscription-runtime/` | `resolveOwnerEntitlements`, `requireFeature`, `checkLimit` | Resolve Effective POS Entitlement here. |
| Commercial Projection | `shared/commercial-projection/` | 19 Projection IDs (incl. gated four + `devices`) | Boolean capabilities. Not POS quantity. |
| Restaurant / tenant | `restaurants`, `assertRestaurantAccess` | Owner `userId` | Terminal must bind `restaurantId`. |
| Users | `users` | `role` enum `user` \| `admin` | Cashier is a user, not a terminal. |
| Operational Device | `server/operational-device/` | Screen/hardware + pairing | **Not** POS Terminal. Optional later association. |
| Order | `server/order/` | Canonical place / lifecycle | Future POS direct sale must enter here. |
| Ordering Channel | `shared/ordering-platform/orderingChannelRegistry.ts` | Channel SSOT | No `cashier_pos` today. |
| Operational Session | `server/operational-session/` | Table persistent / other ephemeral | POS must not own. Direct sale can be sessionless. |
| Dining Session | `dining_sessions` | Table visit | Existing Check intake target. |
| Check | `operational_checks` + `CheckService` | Money + settle | POS consumes; does not own. |
| Settlement Record | ADR-ARCH-026 | Immutable publication | POS must not write reporting facts. |
| CRMP | `server/crmp/` | Register + Financial Shift | POS ≠ Register. `registerType` includes `mobile_pos` (naming collision only). |
| Reporting | `server/reporting-platform/` | Channel + payment-method analytics | Future POS dimensions only. |
| Country / tax | Restaurant `taxPolicyJson`, Check tax snapshot | Business tax, not ZATCA | POS must stay country-neutral. |
| Ops audit | `server/_core/opsLog.ts` | Process log, not a DB | Reuse; do not create a second audit bus. |
