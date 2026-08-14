# TYPECHECK-BUILD-AUDIT.md

## Typecheck (`pnpm check`)

| Metric | PRODUCTION-MIGRATION-1 | This program |
|--------|------------------------|--------------|
| `error TS*` count | **186** | **186** |

No new errors introduced (this program changed no application source).

Commercial runtime files still carry **baseline** `TS2802` MapIterator/`downlevelIteration` errors in `commercial-catalog/index.ts` and `livePlanPersistence.ts` — present in the prior program’s typecheck log. They do **not** fail `esbuild` production bundle.

Other 186 errors remain kiosk routes, design-system, reporting, CRMP, etc.

## Production build (`pnpm build`)

**PASS** (Vite client + esbuild `dist/index.js` + `dist/vercel-api.mjs`).

## Tests (this audit)

Live-plan / entitlement / public / governance files: **66 passed**.

Same 3 failures as migration program (`listPlans` ×2, `checkTrialStatus`) — `getDb` mock gap. Charge-path tests in those files passed. See [CHECKOUT-BOUNDARY-AUDIT.md](./CHECKOUT-BOUNDARY-AUDIT.md).
