# SCHEMA-VERIFICATION.md

`SHOW CREATE TABLE platform_owner_access_mode` after apply:

```sql
CREATE TABLE `platform_owner_access_mode` (
  `ownerOpenId` varchar(64) NOT NULL,
  `mode` enum('FULL_PLATFORM','SIMULATED_PLAN') NOT NULL,
  `simulatedPlanCode` varchar(64) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ownerOpenId`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
```

| Element | Expected | Observed |
|---------|----------|----------|
| Table | `platform_owner_access_mode` | present |
| `ownerOpenId` | varchar(64) NOT NULL PK | match |
| `mode` | enum FULL_PLATFORM / SIMULATED_PLAN NOT NULL | match |
| `simulatedPlanCode` | varchar(64) NULL | match |
| `createdAt` | timestamp NOT NULL DEFAULT now | match |
| `updatedAt` | timestamp NOT NULL ON UPDATE | match |
| Foreign keys | none | none |
| CHECK `platform_owner_access_mode_state_chk` | in SQL file | **not persisted by TiDB** |

## Residual — CHECK constraint

TiDB accepted the CREATE TABLE and dropped the CHECK clause (not stored in `SHOW CREATE TABLE` / `information_schema.CHECK_CONSTRAINTS`).

Application enforcement remains: `interpretOwnerAccessRecord` fails closed on invalid combinations. No migration rewrite was performed.

Rows after apply: **0** (empty table is the approved initial state).
