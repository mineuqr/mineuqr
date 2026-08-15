# ARCHITECTURAL DECISION

## Selected: MODEL A

Reuse the existing Commercial Projection capability model.

Add the four keys to `COMMERCIAL_PROJECTION_IDS` / packaging / filter registry. Persist via `commercial_bundle_features` (same as `ordering`, `devices`). Resolve via Live Plan bundle → entitlements.features → `requireFeature`.

## Why not B / C / D

| Model | Rejected because |
|-------|------------------|
| B — extend catalog beside Projection | Second write vocabulary; Plan Editor already persists Projection keys only |
| C — separate capability system | Duplicate SSOT; CE-29 reject |
| D | Not needed |

Presentation IDs already exist. Empty `projectionKeys` + `alwaysEnabled` was a packaging choice, not a different domain model. Promoting those IDs keeps **one identity** for UI, catalog, and runtime.

## Smallest change

1. Unlock the four cards (`alwaysEnabled: false`, `projectionKeys: [canonical]`).  
2. Add the four IDs to `COMMERCIAL_PROJECTION_IDS` so `assertCommercialCapabilityFilterKeys` accepts them (it already equals Projection IDs).  
3. Wire `requireFeature` on the contracted mutations.  
4. Cutover-seed existing Production bundles **ON** so fail-closed absence does not disable all customers overnight.  
5. Do **not** invent Basic=OFF assignments in this contract.

`replaceIncludedFeatures` already stores only `included=true` keys. Disabled = absent. Entitlement hub fail-closed on missing key. That is the mechanism.

## Packaging exception (locked)

`generateCommercialProjectionRegistry` today requires every packaging rule to cite `DISCOVERY_COMMERCIAL_ELIGIBLE` (exactly 17 IDs). CAP-05 / CAP-06 / CAP-07 are **documentation links** on the presentation cards; they are **not** in that eligible set.

Implementation MUST treat the four new Projection IDs as **catalog-promoted**:

- Add `PACKAGING_RULES` with origin `catalog_promoted`.
- Documentation `discoveryCapabilityIds` may cite CAP-05 / CAP-06 / CAP-07.
- The generator MUST accept that origin without requiring those CAPs to join `DISCOVERY_COMMERCIAL_ELIGIBLE`.
- The existing 17 eligible CAPs remain fully packaged. Do **not** expand Discovery ELIGIBLE in this program.
- Do **not** fake-map these four onto CAP-03 / ordering.

This is still MODEL A (one persist vocabulary, one `requireFeature` vocabulary). It is not MODEL B.

Guards that assert `COMMERCIAL_PROJECTION_IDS.length === 15` must become **19**. `FEATURE_KEYS` / `RUNTIME_ENTITLEMENT_FEATURE_KEYS` gain the four keys automatically. FULL_PLATFORM then grants them.
