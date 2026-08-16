# PRODUCTION READINESS

## This program

| Action | Count |
|--------|--------|
| Production schema apply (0094) | **0** |
| Live Plan mutation | **0** |
| commercial_limit_values mutation | **0** |
| Resource provisioning against Production | **0** |
| Subscription / POS production data | **0** |
| Commit / push / deploy | **0** |

Migration **exists locally** and is journalized. It is **not** Production-ready until a dedicated Production Apply program runs preflight + migrate + verify.

## Runtime before 0094 is applied

If this code were deployed without the table, occupancy `INSERT` into `commercial_limit_occupancy_locks` would fail closed (transaction error → no domain insert). That is safe, not silent unlimited.

Do **not** deploy occupancy-adopting code to Production before 0094.

## Future Production Apply (not this program)

1. `pnpm db:governance-check` / preflight  
2. Apply `0094_commercial_limit_occupancy_locks`  
3. Confirm table empty except lazy lock rows after first creates  
4. No backfill  
5. Smoke: one restaurant/category/item/POS provision in staging  

## Rollback

Dropping the table after apply would break occupancy mutations. Rollback is “do not apply” until Apply is certified. After apply, rollback is a separate schema program.
