# PRE-COMMIT VERIFICATION

**Program:** COMMERCIAL-GIT-GOVERNANCE-0094-COMMIT-1

| Check | Result |
|-------|--------|
| `git branch --show-current` | `main` |
| `git diff --check` | empty (CRLF warnings only) |
| `pnpm check` | **188** `error TS*` (delta 0) |
| `pnpm build` | PASS |
| Governance guard | OK — last tag 0094, 95 entries |
| G-07 | 12/12 PASS (G07 only) |
| G-08 | 18/18 PASS |
| TOCTOU | 12/12 PASS |
| G-09 | 10/10 PASS |
| G-10 | 9/9 PASS |
| G-11 | 15/15 PASS |
| POS Commercial (provision / replace / isolation / auth guards) | 9 files / 43 PASS |
| Governance tests | 17/17 PASS |
| 0094 SQL modified | NO |
| Credentials in staged set | NO |
| Production mutation | 0 |
| Deploy | 0 |
