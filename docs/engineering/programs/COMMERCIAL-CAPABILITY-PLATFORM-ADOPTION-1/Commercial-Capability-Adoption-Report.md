# Commercial Capability Adoption Report — COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1

## Objective met

Commercial Plans behave as **Capability Filters** over MineuQR Platform capabilities.

| Before | After |
|--------|-------|
| 4 duplicate hardcoded 18-key lists | Single Filter Registry SSOT |
| Catalog accepted arbitrary `featureKey` strings | Reject unknown filter keys |
| FEATURE_KEYS independent copy | FEATURE_KEYS = Filter Registry |
| Plan Builder local checklist | Plan Builder = filter toggles from SSOT |
| Pricing could theoretically diverge | Pricing ← Published Offerings only (reconfirmed) |

---

## Architecture law (adopted)

1. Capability Catalog (Discovery) owns what exists on the platform.  
2. Filter Registry owns which of those may be commercially enabled/disabled.  
3. Commercial Plan Feature Bundles are enable/disable sets only.  
4. Subscription Runtime resolves entitlement from Snapshots only.  
5. Published Offerings are the only public pricing authority.

Plans **MUST NEVER** introduce business logic or become a second capability SSOT.

---

## Success criteria mapping

| Criterion | Status |
|-----------|--------|
| Capability Catalog is commercial capability authority (via Filter Registry adoption) | **Met** |
| Plans are Capability Filters | **Met** |
| Every sellable (filter) capability exists in production | **Met** (18/18) |
| Every production Discovery CAP has owner + class | **Met** (46/46) |
| Every commercial filter key Runtime-mapped | **Met** |
| No duplicate hardcoded filter lists | **Met** |
| No orphan filter keys | **Met** |
| Public Pricing from Published Offerings only | **Met** |
| Publish updates pricing automatically | **Met** (invalidate + public read model) |
| Retire/Archive remove from pricing | **Met** (visibility matrix) |

Depth residuals (flags_only / backlog commercializable CAPs): [Remaining-Gap-Report.md](./Remaining-Gap-Report.md).
