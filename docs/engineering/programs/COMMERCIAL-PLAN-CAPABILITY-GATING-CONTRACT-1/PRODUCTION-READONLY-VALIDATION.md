# PRODUCTION READ-ONLY VALIDATION

**Mode:** READ-ONLY. No INSERT / UPDATE / DELETE. No test accounts. No plan edits.

This contract **does not** open a new Production session. Baseline is the forensic SELECT already taken for COMMERCIAL-PLAN-CAPABILITY-GATING-FORENSICS-1.

## Forensic SELECT (authoritative for this contract)

| Field | Value |
|-------|--------|
| Observed | `2026-08-15T23:31:00Z` |
| Journal terminus | **0090** |
| Live Plans | **3** (basic / professional / enterprise) |
| `commercial_bundle_features` rows | **29** |
| Distinct `featureKey` values | the **15** Projection IDs only |
| Rows for `sessionTableManagement` | **0** |
| Rows for `menuManagement` | **0** |
| Rows for `menuDesign` | **0** |
| Rows for `smartQr` | **0** |
| Basic bundle (forensic) | `printing` + `realtime` among Projection keys — **not** a statement of the four Always-On cards |

Code baseline (this workspace, unchanged by this program):

- Presentation: `alwaysEnabled: true`, `projectionKeys: []` for the four IDs (`shared/commercial-catalog-presentation/registry.ts`)
- Display injects the four IDs unconditionally (`projectFeatureKeysForCommercialDisplay`)
- `COMMERCIAL_PROJECTION_IDS` length **15** — four keys absent
- Production `requireFeature` adapter: **devices** only

## Implication for cutover (implementation only)

Fail-closed missing key would turn all four capabilities OFF for every current customer.

Implementation MUST seed `included=true` for the four keys on **all existing Live Plan bundles** before or atomically with unlocking the Plan Editor and wiring `requireFeature`.

That seed is **Always-On preservation**, not a new commercial matrix. This contract does **not** assign Basic=OFF.

## This program did not

- Mutate Production
- Add bundle rows
- Change prices, snapshots, concessions, or subscriptions
- Create drizzle files
