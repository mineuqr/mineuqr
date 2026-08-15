# PRODUCTION VALIDATION

**Mode:** SELECT only. Mutation: NONE. 0090 not applied.

Script: `_preview-readonly.mjs`  
Evidence: `_PREVIEW-READONLY.json`  
Queried at: `2026-08-15T21:08:17.430Z`

## Proof

| Check | Result |
|-------|--------|
| `DATABASE()` | `mineuqr` |
| Journal latest | 0089 `45dd198fe62f78746ef245e5091fc146ee383235f6d5a01b5d2b590b06c37e6d` |
| `count_hash_0089` | 1 |
| `count_hash_0090` | 0 |
| Snapshot table | present |
| Snapshot rows | 0 |
| Concession table | **absent** |
| Subscriptions | 7 unchanged |
| Bindings | 3 unchanged (19.00 / 19.00 / 29.00 USD monthly leftover) |
| Plans / prices | 3 / 10 |
| 780001 | active / yearly / `d836bd10-9d9f-4408-a076-f921354d785a` |

## 780001

Unchanged. No concession created. No snapshot created. No Binding rewrite.

## Not done

- Production migrate
- Production deploy
- Production test subscription
- Historical backfill
