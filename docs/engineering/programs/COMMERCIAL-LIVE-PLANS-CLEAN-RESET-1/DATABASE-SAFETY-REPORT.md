# DATABASE-SAFETY-REPORT.md

## Forbidden tables — not in 0086 DML/DDL

`users`, `restaurants`, `user_subscriptions`, `subscription_plans`, `invoices`, `payments`, `subscription_history`, `orders`, `settlement_records`, check/settlement tables.

SQL guard test asserts no `DELETE`/`UPDATE` of `user_subscriptions`, `invoices`, `payments`, `subscription_plans`.

## Owner `600001`

Preflight fingerprint recorded. This program **did not** UPDATE that row. Owner-access P0 remains `OWNER-SUBSCRIPTION-ACCESS-FORENSICS-1`.

After a future authorized migrate, re-read `600001` and compare `updatedAt` / period / planId.

## Payment `60001`

349.00 SAR captured — not referenced by 0086. Must remain.

## Production apply status

**Not applied.** Database still at 0085 with obsolete catalog rows (`001`/`002` + retired standard plans). Safety of the **script** is validated; safety of a **live wipe** is pending AA authorization.
