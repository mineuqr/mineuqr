# CONSUMER-INVENTORY — COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1

| Consumer | Adoption path |
|----------|----------------|
| Subscription Platform | Consumes offerings + snapshots; does not own pricing/features |
| Plan selection / Pricing | `subscription.listPlans` → Catalog published offerings |
| Signup / onboarding | `registerOwner` + trial builder → Catalog trial + snapshot |
| Trial activation | `createTrialSubscription` → Catalog + snapshot |
| Upgrade / downgrade | `createImmutableCommercialSnapshotForSubscription({ event })` |
| Feature resolution | Snapshot overlay in `getCommercialEntitlements` when bound |
| Limit resolution | Snapshot overlay when bound |
| Regional availability | `resolveRegionFromCatalog` |
| Promotion resolution | `resolvePromotionFromCatalog` |
| Reporting attribution | Snapshot payload (read-only) |
| Platform Ops Admin | Existing `commercialCatalog.*` + `adoptionStatus` |
