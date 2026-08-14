# RESET-EXECUTION.md

Production **was not reset**. This program prepared a deterministic reset in the repository.

## When Architecture Authority authorizes apply

1. Backup TiDB.  
2. `pnpm db:preflight` then `pnpm db:migrate` (applies replaced `0086`).  
3. Application boot runs `ensureCatalogReady` → `bootstrapPersistentCommercialCatalog` (idempotent).  
4. Verify three live plans, empty bindings, owner `600001` fingerprint unchanged, payment `60001` unchanged.

## What 0086 does (catalog only)

1. Add live composition columns on `commercial_plans`.  
2. **DELETE** obsolete catalog aggregate rows (plans, prices, bundles, limits, policies, regions, cycles, promotions).  
3. Retarget `commercial_prices` and promotions to `planId`.  
4. Retarget empty `commercial_subscription_bindings` to live `planId` + charged terms.  
5. **DROP** `commercial_plan_versions`, `commercial_snapshot_definitions`, `commercial_publication_rules`, `commercial_retirement_policies`.

No INSERT of plan rows in SQL. Bootstrap creates Basic / Professional / Enterprise.

## What this program already did in the repo

- Replaced unapplied conversion `0086` with the wipe SQL above.  
- Live-plan save path, CRS `live_plan` display, no charged-term live-price fallback.  
- Admin editor uses `saveLivePlan`.  
- Tests A–D and governance terminus `0086`.
