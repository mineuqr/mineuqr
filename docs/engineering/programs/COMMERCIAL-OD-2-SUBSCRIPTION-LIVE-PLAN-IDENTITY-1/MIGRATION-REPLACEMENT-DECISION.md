# MIGRATION REPLACEMENT DECISION

| Field | Decision |
|-------|----------|
| Artifact | `drizzle/0088_user_subscriptions_live_plan_identity.sql` |
| Journal tag | Unchanged: `0088_user_subscriptions_live_plan_identity` |
| Journal idx / when | Unchanged (idx 88, terminus 0088, 89 entries) |
| New migration 0089 | **Not created** |

## Why replace 0088 in place

0088 has **not** been applied to Production. `__drizzle_migrations` does not contain this hash.

Repository precedent: un-applied `0086` was replaced in place (COMMERCIAL-LIVE-PLANS-CLEAN-RESET-1). Governance forbids rewriting *applied* history and forbids inventing 0089 only to patch an un-applied file.

## What changed

SQL body only: populate → explicit validation gate → destructive cutover.

Journal lineage, tag, and terminus are unchanged. The on-disk SQL hash changes; that is expected for an un-applied correction.

## What was not done

- No journal reset
- No renumber
- No delete of prior migration files
- No Production apply
