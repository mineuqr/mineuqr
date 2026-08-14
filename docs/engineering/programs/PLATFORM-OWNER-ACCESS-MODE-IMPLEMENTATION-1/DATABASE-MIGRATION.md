# DATABASE-MIGRATION.md

Additive SQL only: `drizzle/0087_platform_owner_access_mode.sql`

- Creates `platform_owner_access_mode`
- CHECK enforces valid mode/plan combinations
- Journal idx 87; governance tail `0087_platform_owner_access_mode` (88 entries)

Does **not** modify: `users`, `restaurants`, `user_subscriptions`, `subscription_plans`, `invoices`, `payments`, commercial catalog tables, or bindings.

**Production migration is not applied.** This program is implementation + validation only.
