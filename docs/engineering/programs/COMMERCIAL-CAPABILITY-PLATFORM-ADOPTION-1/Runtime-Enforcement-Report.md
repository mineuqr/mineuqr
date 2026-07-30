# Runtime Enforcement Report — COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1

## Rule

Hidden UI alone is **not** sufficient enforcement.

## Validated

| Surface | Mechanism | Result |
|---------|-----------|--------|
| Runtime vocabulary | `FEATURE_KEYS` ≡ Filter Registry | **PASS** |
| Snapshot → features | Only included filter keys true | **PASS** |
| Disabled capabilities | Absent as `true` (explicit `false`) | **PASS** |
| Canonical APIs | `hasFeature` / `requireFeature` / `checkCapability` / `checkLimit` exported | **PASS** |
| API example | Guest ordering uses `hasFeature("ordering")` | **PASS** |
| UI gates | `featureVisibility` reads entitlements.features (Runtime hub) | **PASS** |
| Published Catalog | Not used for authz (I-CPP-01) | **PASS** |

## UI / Navigation / Routes (operational)

| Check | Result | Notes |
|-------|--------|-------|
| Enabled capabilities accessible via entitlements UI path | **PASS** (architecture) | `useCommercialFeatureVisibility` |
| Disabled capabilities not entitled | **PASS** (resolver) | Snapshot filter set |
| Navigation / menus / dashboard | **PASS** (wiring) | Gates via entitlements; no Catalog authz |
| Direct URL bypass | Domain-dependent | Ordering API hard-gated; not every flag has route-level `requireFeature` |

## Device Registration / Screen Registration

| Check | Result |
|-------|--------|
| Commercial filter keys gate device/screen registration | **NOT IN FILTER PLANE** |

No `deviceRegistration` / screen commercial entitlement keys in Filter Registry or enforcement module. Device/Screen remain Discovery commercializable backlog (prior Remaining Gap Report). **Not a regression** of this adoption; **not** claimed as filter-enforced.

## Discrepancy register (must clear before Production Certification if live UI differs)

| ID | Item | Severity |
|----|------|----------|
| OE-1 | Live browser visual pass deferred (no automation in this run) | Cert gate — AA env |
| OE-2 | Device/Screen not commercially filter-gated | Residual (documented) |
| OE-3 | Some filter keys remain flags_only / coarse_legacy at domain API depth | Residual (prior enforcement audit) |

**No Runtime↔UI presentation discrepancy was observed in automated evidence.** Live visual confirmation remains an AA certification step.
