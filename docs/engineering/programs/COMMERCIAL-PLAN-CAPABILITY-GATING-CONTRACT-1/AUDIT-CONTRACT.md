# AUDIT CONTRACT

Reuse the existing commercial catalog audit. **Do not invent a new audit system.**

## Existing mechanism

`auditCommercialUpdated` / `commercial_catalog_updated` (`server/services/commercial-catalog/commercialCatalogAudit.ts`) on Live Plan / feature-bundle save.

## Required fields (map to existing payload; do not add a parallel event type unless the existing writer already supports them)

| Field | Source |
|-------|--------|
| event | `commercial_catalog_updated` (existing) |
| actor | Admin user id already recorded |
| plan | Live Plan id already recorded |
| capability | Diff of included feature keys (before → after) |
| old state | Prior included set |
| new state | New included set |
| timestamp | Existing audit timestamp |
| reason | Only if the existing writer already has a reason field — **do not invent** |

## Runtime deny

`requireFeature` denial is an authorization failure. Do **not** require a new audit event per denied tRPC unless an existing entitlement-deny log already exists. Do not create one in this program.

## Forbidden

- New `capability_toggled` table
- Auditing into Charged Terms
- Logging capability changes as financial events
