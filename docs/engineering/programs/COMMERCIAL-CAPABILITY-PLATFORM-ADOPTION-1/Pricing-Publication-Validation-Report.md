# Pricing Publication Validation Report — COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1

## Required pipeline

```
Capability Catalog → Commercial Plan (filters) → Approval → Published Offering → Public Pricing
```

## Validation

| Check | Result | Evidence |
|-------|--------|----------|
| Pricing reads `commercialCatalog.public.listOfferings` only | **PASS** | `Pricing.tsx` + adoption guards |
| Pricing does not read Draft / Internal / Capability Catalog directly | **PASS** | No Discovery/registry import in Pricing; offerings are published-only |
| Pricing does not use manual plan matrices | **PASS** | Feature bullets = `offering.featureKeys` |
| Publish makes plan publicly browsable | **PASS** | Foundation publish → workflow `published` → public read model |
| Monthly + Yearly prices on offering | **PASS** | `priceMonthly` / `priceYearly` on PublicCatalogOffering |
| Included capabilities published | **PASS** | `featureKeys` from published bundle (filter-validated) |
| Plan metadata published | **PASS** | planName, versionName, versionCode, currency |
| Retired not newly listed | **PASS** | Not publicly browsable |
| Archived inaccessible | **PASS** | I-CPP-01 visibility |
| No manual Pricing page maintenance | **PASS** | Page is projection consumer only |

## Automatic update behavior

| Catalog action | Pricing effect |
|----------------|----------------|
| Publish version | Appears on next `listOfferings` (cache invalidated) |
| Deprecate | Removed from browse; historically addressable by id |
| Retire | Removed from public get/browse |
| Archive | Inaccessible |

Checkout still uses `legacyPlanId` bridge (billing out of scope) — does not redefine capabilities.
