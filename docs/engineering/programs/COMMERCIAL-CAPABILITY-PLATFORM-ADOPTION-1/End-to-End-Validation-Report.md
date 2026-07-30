# End-to-End Validation Report — COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1

## Pipeline under test

```
Capability Filter Registry
  → Commercial Plan (Feature Bundle = enable/disable set)
  → Approve (governance overlay; still private)
  → Publish (CC-16 + foundation published)
  → Public Catalog Offering (read model)
  → Pricing consumer (listOfferings)
  → Snapshot capture (subscription bind contract)
  → Subscription Runtime entitlements
  → Retire / Archive (public removal; Snapshot immutable)
```

## End-to-end run

| Step | Input | Expected | Observed |
|------|-------|----------|----------|
| Create plan + dual prices | registry filters; monthly 19 / yearly 190 | Stored draft | PASS |
| Reject unknown capability | `notInRegistry` | Error | PASS |
| Approve | draft version | approved; not public | PASS |
| Publish | enforceWorkflow | published offering | PASS |
| Public list | — | 1 offering w/ prices + caps | PASS |
| Capture Snapshot | published version | immutable payload | PASS |
| Resolve entitlements | active + Snapshot | ordering/reports only | PASS |
| Retire | published→deprecated→retired | pricing empty; snap same | PASS |
| Archive | retired | archived; inaccessible; snap same | PASS |

## Public source exclusivity

After publish, the only browseable commercial offerings come from the Published Catalog read model (`projectPublicCatalogOfferings`). Draft/approved versions never appear.

## Automatic Pricing update

No manual Pricing configuration in the pipeline: publish/retire/archive mutate Catalog lifecycle → public projection changes. Pricing page consumes `commercialCatalog.public.listOfferings` only (source-verified).

## Verdict

**E2E OPERATIONAL PASS** for the implemented commercial capability lifecycle.
