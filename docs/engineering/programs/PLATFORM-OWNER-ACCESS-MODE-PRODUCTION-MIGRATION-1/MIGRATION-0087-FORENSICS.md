# MIGRATION-0087-FORENSICS.md

File: `drizzle/0087_platform_owner_access_mode.sql`  
Journal: idx 87, tag `0087_platform_owner_access_mode`, when `1784730000000`  
SHA-256: `d1d9b161c405cc8e448fbf74d3e40b99618d88d388f65479a43e8115fb4cc595`

## Statements

Exactly one DDL statement:

```sql
CREATE TABLE `platform_owner_access_mode` (
  `ownerOpenId` varchar(64) NOT NULL,
  `mode` enum('FULL_PLATFORM','SIMULATED_PLAN') NOT NULL,
  `simulatedPlanCode` varchar(64),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `platform_owner_access_mode_pk` PRIMARY KEY(`ownerOpenId`),
  CONSTRAINT `platform_owner_access_mode_state_chk` CHECK(
    (`mode` = 'FULL_PLATFORM' AND `simulatedPlanCode` IS NULL)
    OR (`mode` = 'SIMULATED_PLAN' AND `simulatedPlanCode` IS NOT NULL)
  )
);
```

No INSERT, UPDATE, DELETE. No `users`, `user_subscriptions`, catalog, invoices, or payments DML (names appear only in comments).

SQL matches the approved implementation. Migration was **not** rewritten.
