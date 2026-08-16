# TEST RESULTS

**Date:** 2026-08-16

Targeted suite (POS access + Phase 1 regression + migration governance): **61 passed / 0 failed**

## Phase 2 coverage

| Category | Result |
|----------|--------|
| Staff + POS_ACCESS on own active terminal | PASS |
| Cross-restaurant A↔B | PASS |
| Owner/admin without grant | PASS (denied) |
| Staff with unrelated grant | PASS (denied) |
| Stranger / no restaurant scope | PASS (denied) |
| PLATFORM_OWNER shortcut | PASS (denied) |
| registered / deactivated / replaced / unknown | PASS (denied) |
| Missing/zero entitlement | PASS (fail-closed) |
| Entitled active terminal | PASS |
| No device required | PASS |
| Idempotent grant / repeatable resolve | PASS |
| Architecture guards | PASS |

## Build / check

| Gate | Result |
|------|--------|
| `pnpm build` | PASS |
| `pnpm check` | PRE-EXISTING — exit 2, **188** `error TS*`, **zero** in this program's files |
