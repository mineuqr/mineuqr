# 04 — BINDING LEGACY ID RETIREMENT

## Production (last certified query, OD-3)

| Fact | Value |
|------|-------|
| bindings | 2 |
| `planId` | 2 UUID, disagreement 0 |
| leftover integer column | populated 30001, 30003 |

Fresh Production query was **not** repeated in this blocked program after code edits (no Production mutation, no deploy).

## Column drop

**NOT PERFORMED.**

Blockers:

- No independently verified recoverable Production backup in this program
- TiDB DDL is not assumed transactional
- Adding `0089` to the journal without apply would risk auto-migrate on next deploy
- Architecture Authority has not authorized Production DDL

## Writers

Application bind writers updated to pass UUID `planId` and omit leftover integer identity.

Existing column remains nullable. Existing two Production values are not rewritten.
