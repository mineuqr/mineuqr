# UI Validation Notes — COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1

## Method

1. **Source wiring audit** (Plan Builder, Plan Editor, Pricing, publishing panels).  
2. **Automated public projection E2E** (authoritative for publish→pricing→retire/archive content).  
3. **Live browser screenshots** — not captured in this agent environment (no browser MCP). Deferred to Architecture Authority certification host.

## Capability Registry (UI)

| Check | Evidence | Result |
|-------|----------|--------|
| Plan Builder shows registry capabilities | Wizard maps `CATALOG_FEATURE_KEYS` ← Filter Registry | PASS |
| Plan Editor / Feature Bundles same | `CatalogManagementPanels` | PASS |
| No duplicate local arrays | Helpers re-export registry | PASS |
| No orphan inventable keys | Server rejects unknown keys | PASS |
| No hardcoded 18-key literal lists in helpers | Guard tests | PASS |

## Commercial Plans (UI states)

| State | UI indication | Public visibility |
|-------|---------------|-------------------|
| Draft | foundation `state=draft` badges | Hidden |
| Approved | publishing workflow overlay + admin actions | Hidden |
| Published | `state=published` | Visible on Pricing via offerings |
| Deprecated / Retired / Archived | badges + publishing actions | Not browsable (archive inaccessible) |

## Public Pricing (visual expectations vs projection)

Projection-validated content the Pricing page will render after publish:

- Plan name / version metadata  
- Monthly + yearly amounts  
- Included capability labels via `catalogFeatureNameKey`  
- Automatic appearance/disappearance on publish/retire/archive (cache invalidate)

## Runtime UI

Entitlement-driven visibility remains via `useCommercialFeatureVisibility` → Runtime hub. Disabled capabilities are `false` in entitlements object — UI must not treat Catalog as authz (I-CPP-01).

## Discrepancy policy

Any mismatch between live UI and Runtime entitlements found during AA visual pass **MUST** be filed before Production Certification (see Runtime-Enforcement-Report OE-1).
