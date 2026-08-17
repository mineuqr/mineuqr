# CONFIGURATION DECISION

**Program:** TYPESCRIPT-TS2802-CONFIGURATION-HARDENING-1

## Options

### A. Set `target` (selected)

Set `"target": "ES2020"`.

| Axis | Assessment |
|------|------------|
| Correctness | Aligns tsc with `lib: esnext`, `module: ESNext`, bundler resolution, and source that already uses Map/Set `for-of` and ES2020 syntax (`?.`, `??`) |
| Runtime | **None** — `noEmit` |
| Browser | Unchanged — Vite emit unchanged |
| Server | Unchanged — esbuild Node emit unchanged |
| Generated code | tsc still emits nothing |
| Bundle / performance / polyfill | None |
| Tests | Typecheck only; Vitest pipeline unchanged |
| Architecture | Single existing tsconfig; no multi-config |

Minimum that removes TS2802 is ES2015. ES2020 is chosen because it is the language level already used in source and proven by Node 20 CI, without jumping to ES2022 (class-field defaults) or ESNext (moving target).

### B. `downlevelIteration` only

Would silence TS2802 while leaving implicit ES5. Incorrect: tsc does not emit, so downlevel helpers would never ship; the flag would describe a false emit contract. Rejected.

### C. Both

Unnecessary if target ≥ ES2015. Rejected.

### D. No change

Would keep 118 false “ES5 emit” diagnostics on a noEmit + bundler project. Rejected — the current implicit ES5 target is not an intentional product contract.

## Proposal (applied)

```
CURRENT:
  target: (omitted → ES5)
  lib: esnext, dom, dom.iterable
  module: ESNext
  noEmit: true
  downlevelIteration: (omitted)

PROPOSED:
  target: ES2020
  (all other compilerOptions unchanged)

EXPECTED TS2802: 0
EXPECTED OTHER TS: 30 identities were *not* all stable. ES2020 types `[...map.values()]` / Map `for-of`, so 3 × TS7006 (implicit any) drop and 1 × TS2345 (`setCurrency(r.currency)`) is unmasked. Net OTHER: 30 − 3 + 1 = 28. See FORENSIC-RECONCILIATION.md.

RUNTIME IMPACT: none (noEmit; Vite/esbuild unchanged)
BUILD IMPACT: none expected
```

`downlevelIteration` is **not** required.
