# PRE-DESTRUCTIVE VALIDATION

Fail closed **before** `DROP COLUMN planId` if any of the following is true.

| ID | Condition |
|----|-----------|
| A | A source row has no target UUID |
| B | Target UUID is NULL |
| C / J | Target UUID is not a `commercial_plans.id` |
| D / E | Source `planId` is not 30001 / 30002 / 30003 |
| F | A source subscription id is missing from the projected set |
| G | Source ids are not unique (row explosion / duplicate target row) |
| H | One source integer maps to more than one UUID |
| I | `COUNT(source)` ≠ `COUNT(converted)` |
| Catalog | Required code missing, or more than one `commercial_plans` row per code |
| Bindings | Binding exists and `bindings.planId` ≠ expected Live Plan UUID |

Unknown integers are not guessed. Catalog data is not repaired.

## Preflight (read-only)

```
node scripts/0088-live-plan-identity-preflight.mjs
```

SELECT aggregates only. No DML. No credentials or PII in output.

This correction program **did not** run that script against Production.

## SQL gate

The same predicates are evaluated inside 0088 after `UPDATE` and before `DROP COLUMN`. Failure is a duplicate-key error on `_0088_live_plan_identity_gate`. Destructive statements are not executed.
