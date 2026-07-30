# Projection Schema

**Module:** `shared/commercial-projection/schema.ts`  
**Version:** `COMMERCIAL_PROJECTION_VERSION = "1.0.0"`

## `CommercialProjectionRecord`

| Field | Type | Notes |
|-------|------|-------|
| `projectionId` | `CommercialProjectionId` | Stable Plan/Catalog/Runtime id |
| `capabilityName` | string | Display name |
| `owner` | string | Architectural owner from Discovery |
| `domain` | string | Domain from Discovery |
| `category` | string | Packaging category |
| `commercialEligibility` | `"COMMERCIAL_ELIGIBLE"` | Always |
| `visibility` | `"plan"` | Plan-visible |
| `lifecycle` | `"active"` | Active projection |
| `discoveryCapabilityIds` | `DiscoveryCapabilityId[]` | Source CAPs |
| `dependencies` | `CommercialProjectionId[]` | Declared edges |
| `planAvailability` | `true` | Allowed on Plans |
| `publicVisibility` | `true` | Allowed on Offerings |
| `defaultState` | boolean | Default off unless noted |
| `runtimeCapabilityId` | string | `cap.*` matrix id |
| `projectionVersion` | `"1.0.0"` | Schema version |

## ID enum

`COMMERCIAL_PROJECTION_IDS` — 15 string literals listed in Specification.
