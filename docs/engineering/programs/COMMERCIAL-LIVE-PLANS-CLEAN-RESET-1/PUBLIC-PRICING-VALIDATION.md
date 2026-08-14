# PUBLIC-PRICING-VALIDATION.md

Path: Admin `saveLivePlan` → `PlanService.saveLive` → persist → `invalidatePublicCatalogCache` → `projectPublicCatalogOfferings`.

No publication step. Hidden plans leave the public catalog immediately (`isHidden`).

Wizard saves monthly + yearly **USD** canonical amounts and **preserves** existing SAR regional rows (does not wipe them).

Tests:

- `commercialPersistentCatalogBootstrap.architecture.test.ts` — public offerings after bootstrap; name edit visible after save.  
- `commercialLivePlans.cleanReset.test.ts` TEST A/C — capability appears on public Professional offering.  
- `commercialCatalogPublicPublishing.test.ts` — hide removes offering.
