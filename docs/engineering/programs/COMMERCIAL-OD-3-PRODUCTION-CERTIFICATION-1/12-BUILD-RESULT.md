# 12 — BUILD RESULT

## `pnpm build`

**PASS** — exit code 0

Vite client + esbuild server + `dist/vercel-api.mjs` completed.

Known unrelated warnings (not OD-3 blockers):

- `node:fs` / `node:path` browser externalization in reporting-exports
- large client chunk size warning

No new build failure caused by OD-3.

## `pnpm check` (`tsc --noEmit`)

**FAIL** — exit code 2 — **186** diagnostics.

Classification: **pre-existing repository debt**. Dominant classes:

- TS2802 `downlevelIteration` on `Map` / `Set` across CRM, realtime, reporting, catalog stores
- Kiosk / App route prop mismatches
- Operational session / split-payment / settlement type drift
- Catalog admin UI (`CatalogManagementPanels`) currency union — not in the OD-3 commit

OD-3 cutover files with **no new semantic type errors**:

- `server/routers.ts`
- `server/paypal.ts` / `paypal-webhook.ts` / `tap-webhook.ts`
- `server/create-trial-subscription.ts`
- `server/subscriptionAudit.ts`
- `client/src/pages/Pricing.tsx`
- Customer Success accounts section

`adoptionService.ts` and `server/db.ts` appear in the log only as TS2802 iterator spreads that predate the UUID input contract (`livePlanUuidInput` itself type-checks).

No new OD-3 error is hidden under existing debt.

## Decision

**BUILD GATE: PASS**  
`pnpm check` debt is classified and is not an OD-3 blocker.
