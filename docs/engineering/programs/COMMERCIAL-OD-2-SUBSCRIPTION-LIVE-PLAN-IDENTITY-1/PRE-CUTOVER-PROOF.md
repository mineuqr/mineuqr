# PRE-CUTOVER-PROOF

Program: **COMMERCIAL-OD-2-0088-PRODUCTION-PREFLIGHT-1**  
Queried: **2026-08-15T12:29:27.631Z**  
DB UTC: 2026-08-15T09:29:29Z  
Mutation: **NONE**

## Target

TiDB Cloud production shape (`tidbcloud_prod` / `gateway01` / `mineuqr`). Port 4000. TLS on. Credentials not recorded.

## Journal

| Field | Value |
|-------|-------|
| Latest `__drizzle_migrations.id` | 6054102 |
| Hash prefix | `d1d9b161c405cc8e` = local 0087 |
| 0087 applied | **YES** |
| 0088 applied | **NO** |

## Schema

`user_subscriptions.planId` = `int` NOT NULL. `planIdUuid` absent.

## Population

7 rows. 30001×1 (expired) · 30002×4 (active 3, expired 1) · 30003×2 (active 2). NULL/0/negative/unknown = 0.

## Mapping

30001 → basic → `79cf7bf7-c3b6-45de-8f20-42897cd493ac`  
30002 → professional → `0ade795a-02fa-4d3e-b9b5-262515bade09`  
30003 → enterprise → `d836bd10-9d9f-4408-a076-f921354d785a`  

Source 7 = convertible 7. Binding disagreement 0. Unbound 5, all resolvable.

## Backup

**Not independently verified** in this program.

## Apply

**Not executed.**
