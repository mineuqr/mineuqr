# IMPLEMENTATION.md — COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1

## Summary

Adopted Capability Catalog (Discovery) as the commercial capability authority via a **Capability Filter Registry**. Removed duplicate hardcoded feature/limit lists from Catalog UI. Enforced filter keys on Catalog bundle/limit create. Confirmed Pricing is generated exclusively from Published Offerings.

No Commercial / Runtime / Discovery / Billing / DB redesign.

---

## Code changes

| Path | Change |
|------|--------|
| `shared/commercial-capability/registry.ts` | SSOT: filter keys, Discovery classification (46), crosswalk, assert helpers |
| `shared/commercial-capability/index.ts` | Barrel |
| `src/lib/commercial/featureKeys.ts` | Re-exports filter keys as `FEATURE_KEYS` (Runtime vocabulary = Filter SSOT) |
| `catalogUiHelpers.ts` | `CATALOG_FEATURE_KEYS` / `CATALOG_LIMIT_KEYS` ← registry |
| `catalogCommercialDisplay.ts` | Display keys ← registry |
| `server/services/commercial-catalog/index.ts` | Reject unknown feature/limit keys on create |
| `publicCatalogReadModel.ts` | Public `featureKeys` filtered to known filter keys |
| `__tests__/commercialCapabilityPlatformAdoption.guards.test.ts` | Adoption guards |

---

## Explicit non-changes

- Subscription Runtime evaluation paths (I-SRE-01)
- I-SRE-02 capabilityMatrix rows (still authoritative mapping; vocabulary now shared)
- Snapshot / I-CPL-13
- Publishing lifecycle / I-CPP-01
- Billing / checkout
- Discovery markdown catalog content (adopted, not rewritten)
- Adding new sellable capabilities (Kitchen, Printing, …) — backlog in Remaining Gap Report
