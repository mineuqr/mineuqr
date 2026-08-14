# GOVERNANCE-VALIDATION.md

`pnpm db:governance-check`: **OK**

- Journal entries: 88
- Tail: `0087_platform_owner_access_mode`
- Ordering valid
- No non-legacy orphan SQL

`pnpm db:preflight` after apply: **All journal migration hashes recorded in DB.**

0087 hash in `__drizzle_migrations` matches local SQL SHA-256.  
0086 row retained. No duplicate 0087 identity.
