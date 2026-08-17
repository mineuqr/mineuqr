# RUNTIME TARGET ANALYSIS

**Program:** TYPESCRIPT-TS2802-CONFIGURATION-HARDENING-1

## tsc vs Vite vs esbuild

| Command | Tool | Role |
|---------|------|------|
| `pnpm check` | `tsc --noEmit` | Typecheck only. `tsconfig.json` `noEmit: true`. **Does not emit JS.** |
| `pnpm build` (client) | Vite 7.1 + esbuild transform + terser | Production browser bundle → `dist/public` |
| `pnpm build` (server) | esbuild `--platform=node --format=esm` | `dist/index.js`, `dist/vercel-api.mjs` |
| `pnpm start` | `node dist/index.js` | Executes esbuild output |
| `pnpm test` | Vitest 2 (Vite pipeline) | Tests; `*.test.ts` excluded from tsc include |

**Conclusion:** TS2802 is a **typecheck-only** diagnostic. Changing `compilerOptions.target` does not change Vite or esbuild emit unless those tools are later pointed at tsc emit (they are not).

## Current tsconfig (before change)

| Option | Value |
|--------|--------|
| `target` | **omitted** → TypeScript 5.9.3 default **ES5** |
| `lib` | `esnext`, `dom`, `dom.iterable` |
| `module` | `ESNext` |
| `moduleResolution` | `bundler` |
| `noEmit` | `true` |
| `strict` | `true` |
| tsconfig files | **one** (`tsconfig.json`) covering client, server, shared |

Root cause of all 118 TS2802: `lib`/`module` describe a modern program, but implicit **ES5** target treats Map/Set `for-of` as requiring `downlevelIteration`.

## Client JavaScript actually shipped

`vite.config.ts` does **not** set `build.target`. Vite 7 default is `'baseline-widely-available'` (Chrome/Edge ~107, Firefox ~104, Safari ~16). Those engines have native Map/Set iteration (ES2015).

No `browserslist` file exists. Client policy is **Vite’s default**, not an invented list.

## Server JavaScript actually executed

- `pnpm build` esbuild: `--platform=node`, no `--target` → modern Node syntax
- CI evidence: `.github/workflows/migration-governance.yml` uses **Node 20**
- Connector workflows use Node 22
- `vercel.json` does not pin Node; Production runs the esbuild ESM bundle on Vercel’s Node

Node 20 natively iterates Map/Set.

## Tests / tooling

Vitest uses Vite. Tests are excluded from `pnpm check`. tsx runs server watch in development (modern Node).

## One tsconfig?

Client and server already share one check config. Both runtimes natively support Map/Set `for-of`. A second tsconfig is **not** required to represent this.

## Browser policy

No product browserslist. Target selection for **tsc** does not change shipped client JS. It is not necessary to invent a browser matrix. Evidence used: Vite 7 default + Node 20 CI.
