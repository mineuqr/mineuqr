# PLAN EDITOR CONTRACT

## Admin (PLATFORM_ADMIN)

Must be able to view, enable, and disable each of the four capabilities **independently per Live Plan**.

The four cards MUST leave Always-On / locked presentation:

- `alwaysEnabled: false`
- `projectionKeys: [<canonical key>]`
- `CapabilityFilterPicker` must treat them as editable
- `setPresentationCapabilityEnabled` must persist through the existing Projection filter path
- `projectFeatureKeysForCommercialDisplay` must **not** inject them unconditionally

## Persistence path (existing)

Plan Editor save → `replaceIncludedFeatures` → `commercial_bundle_features`.

Enable = include key. Disable = omit key. Idempotent: saving the same set is a no-op persist.

## Validation

- Keys must be in `COMMERCIAL_PROJECTION_IDS` after promotion.
- Unknown keys rejected (`assertCommercialCapabilityFilterKeys`).
- Admin role does **not** grant the commercial capability to restaurants.
- RBAC / owner role on a restaurant does **not** grant these capabilities.

## Immediate effect

Yes. Next entitlement resolve after cache invalidation. No Charged Terms write. No MRR/ARR change.

## Existing vs new plans

| Case | Behavior |
|------|----------|
| Existing Production plans | Cutover seed ON (preserve current Always-On). Admin may then disable. |
| New plans | Default ON unless Admin unchecks (recommended). Implementation must not invent Production OFF assignments. |
| Editing | Toggle is a catalog mutation only. |

## Audit

Reuse `commercial_catalog_updated` on the plan / feature-bundle save. Before/after must include the four keys. See `AUDIT-CONTRACT.md`.

## Forbidden

- Hardcoded plan names (`if plan === "basic"`).
- Client-supplied “enabled” as authority.
- Locking the four cards after this contract is implemented.
