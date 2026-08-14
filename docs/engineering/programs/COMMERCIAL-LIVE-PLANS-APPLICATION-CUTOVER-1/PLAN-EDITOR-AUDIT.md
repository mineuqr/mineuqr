# PLAN-EDITOR-AUDIT.md

Required flow: Edit → Validate → `saveLive` → atomic persist → cache invalidation → subsequent hydrate sees new definition.

## API

| Procedure | Behavior |
|-----------|----------|
| `updatePlan` | `planService.saveLive(id, patch)` — **does not** call `planService.update` |
| `saveLivePlan` | `planService.saveLive` with optional price replace |
| `validatePlanSave` | `planSaveValidator.validate` |
| `createPlan` | in-memory create (bootstrap/admin); not version create |
| `listPlans` | live plans after `ensureCatalogReady` |
| `createPrice` | live price + `persistLivePlan` + `invalidatePublicCatalogCache` |

No procedures: `publishVersion`, `createVersion`, `retireVersion`, `createSnapshot`, draft state machine.

`PlanService.update` remains for in-process bootstrap composition. HTTP admin mutations use `saveLive`.

## UI

- `CatalogManagementPanels` → `commercialCatalog.saveLivePlan`
- `PlanCreationWizard` → `saveLivePlan`
- Guards assert no `createVersion` / `publishVersion` / `retireVersion`

Leftover unused `stateLabel` draft/published/retired map is **dead code** (never called). `versionCompare.ts` and `CapabilityLifecycleRail` are not wired into the live editor surface.

## Atomic save

`saveLive` validates, optionally replaces prices, `persistLivePlan`, then:

1. `invalidateCatalogReadyGate`
2. `invalidatePublicCatalogCache`
3. `invalidateEntitlementCache()` (all owners)

Rollback of in-memory state if validation or persist fails.

## Propagation

TEST A/C (`commercialLivePlans.cleanReset.test.ts`): Professional A and B receive a newly saved capability without snapshot, version, publication, or rebind. **PASS.**
