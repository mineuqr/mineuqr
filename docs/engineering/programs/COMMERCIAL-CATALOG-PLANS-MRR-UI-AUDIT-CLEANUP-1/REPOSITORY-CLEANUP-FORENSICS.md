# REPOSITORY-CLEANUP-FORENSICS.md

## Cursor / agent rules

`.cursor/rules/` contains only `commercial-entitlement-enforcement.mdc`. **CANONICAL**. Not superseded. Kept.

## Scripts

| Script | Class |
|--------|-------|
| `server/seed-plans.mjs` | LEGACY / ONE_TIME / **dangerous** (`DELETE FROM subscription_plans`) |
| Program `_validate.mjs` / `_snapshot.mjs` | HISTORICAL AA evidence |
| Catalog bootstrap | ACTIVE_RUNTIME |
| Migration SQL | HISTORICAL — never delete |

## Documentation

Prior COMMERCIAL-* program folders: **HISTORICAL** or **CURRENT** for their verdicts. Not deleted. Some snapshot-era docs are **SUPERSEDED** by Live Plans programs; they remain AA records.

## Classification summary

| Class | Examples |
|-------|----------|
| CANONICAL | Live Plans, hub, `checkLimit`, Frozen state, Owner modes |
| ACTIVE_RUNTIME | `saveLive`, `snapshotLoader.ts`, checkout `subscription_plans` |
| ACTIVE_UI | Plan Editor, Pricing, Frozen banner, Owner controls |
| ACTIVE_TEST | Limits repair, capability editor, Frozen, owner suites |
| ACTIVE_GOVERNANCE | Constitution v1.0, CE checklist, `.cursor` rule |
| LEGACY_COMPATIBILITY | `subscription_plans`, `PLAN_LIMITS`, `isSubscriptionActive` templates |
| HISTORICAL | 0086, snapshot program docs |
| DUPLICATE | MRR vs charged terms; `isSubscriptionActive` vs hub |
| SUPERSEDED | Version/publish APIs (already removed) |
| DEAD | None unreferenced that passed SAFE DELETE |
| ORPHANED | Extra limit keys; cancel stub; expo commercially |
| REVIEW_REQUIRED | Stub experience panels; rename snapshotLoader; seed-plans.mjs retirement |
| SAFE_TO_DELETE | **None** |

## SAFE DELETE

No file met all 13 evidence criteria. **Zero deletions.**
