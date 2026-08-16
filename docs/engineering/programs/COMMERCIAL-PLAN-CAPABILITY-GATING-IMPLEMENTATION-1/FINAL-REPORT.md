# FINAL REPORT — COMMERCIAL-PLAN-CAPABILITY-GATING-IMPLEMENTATION-1

**STATUS:** PASS — LOCALLY CERTIFIED

COMMIT: NONE
PUSH: NONE
DEPLOY: NONE
PRODUCTION MUTATION: 0
MIGRATION EXECUTED AGAINST PRODUCTION: NONE

Commercial Capability Impact: YES
Required Capability: `sessionTableManagement`, `menuManagement`, `menuDesign`, `smartQr`
Server Enforcement: `requireRestaurantPlanFeature` → `requireFeature(ownerUserId, key)` before persist
UI Enforcement: `hasFeature` on sidebar / dashboard (presentation only)
Expired Behavior: existing FROZEN policy unchanged
Owner Simulation: FULL_PLATFORM via existing hub / `FEATURE_KEYS`

---

1. **Canonical keys:** `sessionTableManagement`, `menuManagement`, `menuDesign`, `smartQr`
2. **Projection:** four IDs added; packaging origin `catalog_promoted`; Discovery ELIGIBLE remains 17; Projection length 19
3. **Bundles:** same `commercial_bundle_features`; missing key = disabled
4. **Local seed:** `seedCatalogPromotedCapabilitiesOnLivePlanBundles` — idempotent ON preservation; SQL prepared, not run on Production
5. **Plan Editor:** Always-On lock removed; Admin can toggle per plan
6. **Runtime:** restaurant owner → `requireFeature`; TRPC FORBIDDEN on deny
7. **Session:** owner mutations + timeline/workspace gated; public session GET not gated; tables not this key
8. **Menu & Items:** category/item/offer management gated; public catalog GET not gated; quotas still apply when ON
9. **Menu Design:** template/colors/fonts/branding writes gated; admin-role + `isSubscriptionActive` grant removed
10. **smartQr:** table CRUD + owner list/get gated; public `getByNumber` not gated
11. **Public rendering:** continues with stored catalog/design
12. **QR identity:** preserved; no delete-on-disable
13. **FROZEN:** unchanged; still runs on `verifiedProcedure` denylist before the new gate
14. **FULL_PLATFORM:** existing hub; all four keys in `FEATURE_KEYS`
15. **Plan change:** follows current Live Plan bundle; no snapshots
16. **Audit:** existing `commercial_catalog_updated` on plan/bundle save
17. **Negative API:** matrix + routers template/colors OFF tests
18. **Targeted tests:** 148 passed / 14 files
19. **pnpm build:** PASS
20. **pnpm check:** FAIL (pre-existing TS2802 / unrelated); seed file fixed
21. **Governance guards:** PASS
22. **Pre-existing failures:** `pnpm check` TS2802 Map/Set iteration and other unrelated errors
23. **Remaining risks:** Production deploy without seed would fail-closed-disable all four capabilities
24. **Production readiness:** local only — wait for PRODUCTION-APPLY then PRODUCTION-DEPLOY

STOP. Do not commit, push, deploy, or mutate Production.
