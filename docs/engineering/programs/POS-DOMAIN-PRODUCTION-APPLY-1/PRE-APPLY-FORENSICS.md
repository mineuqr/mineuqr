# PRE-APPLY FORENSICS

**Mode:** SELECT / INFORMATION_SCHEMA only. Mutation: NONE.  
**Evidence:** `PRE-APPLY-BASELINE.json`  
**Queried at:** `2026-08-16T12:17:06.940Z`  
**Server time:** `2026-08-16T09:17:04.000Z`  
**Access:** PRODUCTION (`tidbcloud_prod`, TLS, port 4000, `DATABASE()=mineuqr`)

## Target

| Check | Result |
|-------|--------|
| `DATABASE()` | `mineuqr` |
| Host shape | TiDB Cloud prod gateway01 |
| Matches known Production | **yes** |

## Journal

| Item | Result |
|------|--------|
| Terminus | **0090** `bd9989fa8f3fd1698c8b26df8d71c3dca44c6df21e2ba9dca44c4a60fc330997` (id 6144102) |
| Prior | 0089 `45dd198f…` (id 6114102) |
| `count_hash_0090` | 1 |
| `count_hash_0091` | **0** |
| `count_hash_0092` | **0** |
| `count_hash_0093` | **0** |

Sequence around 0089 → 0090 is consistent with the last certified Commercial apply.

## POS schema

| Table | Exists |
|-------|--------|
| `pos_terminals` | **ABSENT** |
| `pos_permission_grants` | **ABSENT** |
| `pos_sale_idempotency` | **ABSENT** |
| Unexpected `pos_%` / `*pos_order*` | **none** |

No partial POS apply.

## Certified local SQL

| File | Hash | CREATE TABLE | INSERT/UPDATE/DELETE/DROP/TRUNCATE/ALTER |
|------|------|--------------|------------------------------------------|
| `0091_pos_terminals.sql` | `05872dc0…` | `pos_terminals` | none |
| `0092_pos_permission_grants.sql` | `e7bf4f73…` | `pos_permission_grants` | none |
| `0093_pos_sale_idempotency.sql` | `778caa62…` | `pos_sale_idempotency` | none |

`0093` comment text mentions Settlement; no Settlement DDL.

## Git (pre-apply)

| Field | Value |
|-------|--------|
| Branch | `main` |
| HEAD | `4278bdb3792c7ee3d3b98f7271a7452d346a9025` |
| HEAD subject | `feat(commercial): implement plan capability gating` |

Working-tree POS implementation and `0091`–`0093` are the certified local sources. Not discarded. Not modified by this program.

## Gate

Production is at 0090. POS tables and journal hashes are absent. SQL is additive. Target is unequivocally `mineuqr`. Preflight **PASS**.
