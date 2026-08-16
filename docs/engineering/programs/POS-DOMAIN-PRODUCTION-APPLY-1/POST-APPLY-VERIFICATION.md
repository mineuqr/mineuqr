# POST-APPLY VERIFICATION

**Queried at:** `2026-08-16T12:19:28.481Z`  
**Server time:** `2026-08-16T09:19:22.000Z`  
**Mutation:** NONE (read-only verification)  
**Evidence:** `POST-APPLY-VERIFICATION.json`

## Target

`DATABASE()=mineuqr` PRODUCTION TLS 4000.

## Journal

| Order | Tag | Hash | id |
|------:|-----|------|---:|
| 1 | 0090_commercial_subscription_concessions | `bd9989fa…` | 6144102 |
| 2 | 0091_pos_terminals | `05872dc0…` | 6174102 |
| 3 | 0092_pos_permission_grants | `e7bf4f73…` | 6174103 |
| 4 | 0093_pos_sale_idempotency | `778caa62…` | **6174104** (terminus) |

Each of 0090–0093 is registered **once**.

## New tables

| Table | Exists | Rows | PK | Unique | Secondary |
|-------|--------|-----:|----|--------|-----------|
| `pos_terminals` | yes | 0 | `id` | restaurant/code | restaurant/lifecycle |
| `pos_permission_grants` | yes | 0 | `id` | restaurant/user/permission | restaurant/user |
| `pos_sale_idempotency` | yes | 0 | `id` | restaurant/terminal/user/key | orderId |

Unexpected POS tables: **none**.

## Counts vs baseline

All listed financial/commercial counts are unchanged. See `FINANCIAL-ISOLATION.md`.

## 780001

Unchanged: active / yearly / `d836bd10-9d9f-4408-a076-f921354d785a` / `2027-06-21T10:47:36.000Z`.
