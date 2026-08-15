# 12 — DECISION MATRIX

| Model | Financial correctness | Historical integrity | MRR correctness | Entitlement correctness | Complexity | Recommendation |
|-------|----------------------|----------------------|-----------------|-------------------------|------------|----------------|
| A. Revive + reuse old snapshot | Fail — treats a closed commitment as live; stale vs catalog | Pass (no overwrite) | Fail if catalog moved | Fail — can entitle without new commitment | Lowest | **REJECT** |
| **B. Revive + new snapshot** | **Pass** — new commitment at current offer | **Pass** — insert-only | **Pass** — current snapshot | **Pass** if atomic | Medium (dedicated procedure + close implicit path) | **SELECT** |
| C. New subscription row | Pass if snapshot on new row | Pass on old id; fragments ownership | Pass if only new row entitled | Dual-row pick risk | High (identity, reporting, delete orphans) | **REJECT** |

**DECISION = MODEL B**

Not BLOCKED: commercial policy is derivable from already certified authorities (new paid commitment → current Live Plan offer; snapshots immutable; cancel/expiry terminate entitlement). Continuation (A) was not proven.
