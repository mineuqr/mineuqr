# FINAL-REPORT.md — COMMERCIAL-LIVE-PLANS-CAPABILITY-EDITOR-REPAIR-1

**Date:** 2026-08-15  
**Verdict:** **READY FOR DEPLOY**

This program does **not** authorize commit, push, or production deployment. Await Architecture Authority review.

---

## 1. Root cause

The Live Plan Editor treated a **feature bundle** as the capability UI, and `saveLive` / durable persist did **not** write individual `commercial_bundle_features` rows. Production already stored 7 / 13 / 15 mappings; the administrator could not see or change them.

## 2. Owning layer

**UI + persistence** (not schema, not Projection, not a missing production mapping).

## 3. Files changed

- `client/src/components/admin/platform-ops/commercial-catalog/experience/PlanCreationWizard.tsx`
- `client/src/components/admin/platform-ops/commercial-catalog/experience/CapabilityFilterPicker.tsx`
- `client/src/components/admin/platform-ops/commercial-catalog/experience/__tests__/commercialCatalogAdminExperience.guards.test.ts`
- `client/src/contexts/LanguageContext.tsx` (`translateIn` for bilingual names)
- `client/src/locales/en.json` / `ar.json`
- `server/api/commercialCatalog/commercialCatalogRouter.ts`
- `server/services/commercial-catalog/index.ts`
- `server/services/commercial-catalog/livePlanPersistence.ts`
- `server/commercial-catalog/__tests__/commercialLivePlans.capabilityEditor.repair.test.ts` (new)
- `docs/engineering/programs/COMMERCIAL-LIVE-PLANS-CAPABILITY-EDITOR-REPAIR-1/` (this package)

## 4. Database changes

**None.** No migration. No production writes.

## 5. Why no migration

0086 already has Live Plan → bundle → `commercial_bundle_features`. The defect was application/UI.

## 6. Capability editor behavior

Select plan → view Presentation capability groups → toggle individual commercial capabilities → Save → `saveLive` replaces current composition → caches invalidated. No publish step.

## 7. Capability counts

| Kind | Basic | Professional | Enterprise |
|------|------:|-------------:|-----------:|
| Stored Projection keys | 7 | 13 | 15 |
| Commercial-visible picker cards | 12 | 12 | 12 |
| Always-on product claims (no stored key) | 4 | 4 | 4 |
| Commercially editable cards | 8 | 8 | 8 |
| Hidden foundation / devices / expo | see [DEPENDENCY-AND-LOCK-POLICY.md](./DEPENDENCY-AND-LOCK-POLICY.md) | | |

Bootstrap stored counts were **not** arbitrarily changed.

## 8. Persistence result

`saveLive` persists capability composition atomically (in-memory rollback + DB transaction DELETE+INSERT for that bundle). Validation failure restores the previous Live Plan.

## 9. Runtime propagation result

Professional A and B receive add then remove of a capability from the current Live Plan without snapshot, version, publication, or rebind. **PASS** (fixtures).

## 10. Public Pricing result

Public offerings still load from live plans. Capability save invalidates the public cache. Internal bundle IDs are not newly exposed.

## 11. Build result

`pnpm build` **PASS**.

## 12. Test result

Relevant new/modified suites **PASS**. Typecheck **185** vs prior baseline **186** (no new errors).

## 13. Remaining residuals

1. Production Basic catalog USD is **19.00 / 199.00**, not the certified **0.00 / 0.00**. Discovered read-only; not written by this program. Do not mix a price correction into this repair.
2. Dual price book: checkout monthly 19 / 39 / 99 USD unchanged.
3. Expo hidden from the commercial picker; stored on Enterprise; API-editable only.
4. Four always-on product claims have no Projection ID and remain locked (explained).
5. Unbound runtime still uses `planFeatureMatrix`.
6. Owner expired-access P0 unchanged.
7. In-browser 17-step walkthrough not run (no deploy; no production writes).
8. Three pre-existing vitest `getDb` mock gaps.
9. Leftover names: `snapshotLoader.ts`, unused `stateLabel`, `versionCompare.ts`.

---

## Decision checklist

- [x] Individual capabilities visible in Plan Editor
- [x] Individual capabilities editable
- [x] `saveLive` persists capability composition
- [x] Atomicity verified
- [x] Cache invalidation verified
- [x] Basic / Professional / Enterprise editing verified (fixtures; compositions independent)
- [x] Runtime propagation verified
- [x] Public Pricing remains functional
- [x] Capability save does not alter prices (tests)
- [x] Checkout unchanged
- [x] No Version / Snapshot dependency introduced
- [x] No migration required
- [x] Production build passes
- [x] No new typecheck errors
- [x] Relevant tests pass
- [x] Original “cannot add capabilities” issue resolved in code

**STOP.** Do not deploy from this program.
