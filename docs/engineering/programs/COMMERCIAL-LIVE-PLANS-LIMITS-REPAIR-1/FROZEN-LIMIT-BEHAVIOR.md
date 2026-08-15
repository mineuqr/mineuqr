# FROZEN-LIMIT-BEHAVIOR.md

Frozen remains the **account lifecycle** authority. This program does not add `frozenQuota` or a second Frozen capability system.

## Expected

```
FROZEN
  ↓
restaurant.create
  ↓
DENIED
```

`verifiedProcedure` → `assertCommercialAccountActive` → hub `commercialAccountState === FROZEN` → `FORBIDDEN` (`غير مصرح بالوصول`).

`restaurant.create` is listed in `FROZEN_BLOCKED_MUTATION_PREFIXES`.

This denial happens **before** restaurant limit evaluation. A Live Plan restaurant cap of `null` or `50` does not authorize a Frozen account to create.

## Unchanged

- FROZEN does not delete data
- Renewal / billing / auth paths are not Frozen-blocked
- QR consumer behavior is unchanged (prior Frozen program)
