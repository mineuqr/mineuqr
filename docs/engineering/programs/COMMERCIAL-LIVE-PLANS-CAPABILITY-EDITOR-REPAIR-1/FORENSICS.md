# FORENSICS.md

**Date:** 2026-08-15  
**Production:** read-only SELECT. Terminus **0086** (`__drizzle_migrations.id` 6024102, hash `cfaec30e54892eaf`).

## Symptom

Plan Editor showed a **feature bundle selector** (“Basic Features”) and no individual capability toggles. The administrator could not perform:

```
Plan → add/remove capability → save → capability is part of the Live Plan
```

## Owning layers (proven)

This was **not** UI-only.

| Layer | Finding |
|-------|---------|
| **UI** | `PlanCreationWizard` bound `fields.features` to a bundle `<Select>`. `CapabilityFilterPicker` already existed and used Presentation, but only on **create feature bundle**, not the Live Plan editor. |
| **Persistence** | `saveLive` did not accept capability composition. `DbDurableLivePlanBackend.persistLivePlan` wrote `commercial_plans` + `commercial_prices` only. It did **not** replace `commercial_bundle_features`. |
| **Schema** | 0086 already has `commercial_plans.featureBundleId` + `commercial_bundle_features`. **No migration required.** |
| **Projection** | Still produces the approved vocabulary. The editor never received individual keys because the DTO/UI asked only for `featureBundleId`. |

Mismatch: the editor received **B. feature bundle only**, not **A. individual capabilities**. Presentation already had capability groups; the Live Plan editor did not use them.

## Production mappings (exist — do not invent)

| Plan | ID | Bundle ID | Stored included keys |
|------|----|-----------|---------------------:|
| Basic | `79cf7bf7-c3b6-45de-8f20-42897cd493ac` | `f5707a05-…` | **7** |
| Professional | `0ade795a-02fa-4d3e-b9b5-262515bade09` | `9f459189-…` | **13** |
| Enterprise | `d836bd10-9d9f-4408-a076-f921354d785a` | `4e091048-…` | **15** |

Keys match COMMERCIAL-LIVE-PLANS-PRODUCTION-MIGRATION-1. Version/snapshot/publication/retirement tables **absent**. Bindings not queried as mutated (this program did not write).

## Production catalog prices (read-only)

| Plan | USD monthly / yearly | SAR monthly / yearly |
|------|----------------------|----------------------|
| Basic | **19.00 / 199.00** | — |
| Professional | 26.40 / 264.00 | 99.00 / 990.00 |
| Enterprise | 79.73 / 797.33 | 299.00 / 2990.00 |

Post-migration certification recorded Basic catalog **0.00 / 0.00**. Production now shows **19.00 / 199.00**. This program issued **no production writes**. Treat as a **pre-existing catalog price drift** residual — do not “correct” it in this repair.

Checkout `subscription_plans` 30001–30003 monthly remains **19 / 39 / 99** USD.

## Removed-architecture guard

No new dependency on `commercial_plan_versions`, snapshots, publications, retirements, draft, or publish. `saveLivePlan` input gained `capabilities[]` only.
