# PRODUCTION READINESS

This program is **locally certified**. It is **not** Production-ready until a separate apply program seeds existing Live Plan bundles.

## Must happen before deploy

1. **COMMERCIAL-PLAN-CAPABILITY-GATING-PRODUCTION-APPLY-1**
   Run the idempotent ON seed on every existing Live Plan bundle (`sessionTableManagement`, `menuManagement`, `menuDesign`, `smartQr`).
   Prepared SQL (not executed): `seed-catalog-promoted-capabilities.sql`.
   Or call `seedCatalogPromotedCapabilitiesOnLivePlanBundles` against a hydrated catalog store in an authorized apply job.

2. Verify Production bundle row counts: +4 keys × number of Live Plan bundles, no duplicates, no price/snapshot writes.

3. **Then** COMMERCIAL-PLAN-CAPABILITY-GATING-PRODUCTION-DEPLOY-1.

## If deploy happens without seed

Fail-closed missing key → all four capabilities OFF for every current customer. That is a production incident.

## This program did not

- Run `pnpm db:migrate` against Production
- Execute the seed against Production
- Change Production plans
- Create test subscriptions
- Commit, push, or deploy
