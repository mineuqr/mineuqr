# DATA MODEL CONTRACT

## SCHEMA CHANGE REQUIRED: **NO**

Existing model already supports plan → capability → enabled/disabled:

- Live Plan → `featureBundleId`
- `commercial_bundle_features` (`bundleId`, `featureKey`, `included`)
- Unique `(bundleId, featureKey)`
- `featureKey` varchar(128) — existing presentation IDs fit
- Disabled = row absent (current `replaceIncludedFeatures` writes only included keys)

No new table. No Charged Terms column. No `user_subscriptions` capability column.

## MIGRATION (DDL): **NO**

Do not create a drizzle file for this program.

## DATA CUTOVER (DML): **YES — implementation program only**

Fail-closed missing key would disable all four capabilities for every current customer.

Implementation **must** seed `included=true` for:

`sessionTableManagement`, `menuManagement`, `menuDesign`, `smartQr`

on **every existing Live Plan feature bundle** (Production today: basic, professional, enterprise — 3 plans).

This is **preservation of Always-On**, not a new commercial assignment. It is **not** “Basic = Session OFF.”

Safety:

- Idempotent insert (unique pair)
- Transactional
- No price / MRR / snapshot writes
- Authorized Production DML only in the implementation program after acceptance
- Verify row counts after apply

## Compatibility

Existing 15 Projection keys unchanged. New keys are additional rows. Old clients that ignore unknown keys remain compatible. Plan Editor must start accepting the four keys or save would reject them.

`FEATURE_KEYS` / `RUNTIME_ENTITLEMENT_FEATURE_KEYS` become Projection(19) ∪ legacy. Guards that assert Projection length **15** must become **19**. Discovery ELIGIBLE remains **17** (catalog-promoted packaging origin — see `ARCHITECTURAL-DECISION.md`).
