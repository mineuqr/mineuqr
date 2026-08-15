# OWNER-ACCESS-GOVERNANCE.md

Owner identity: `ENV.ownerOpenId` / `isPlatformOwner`.

```
PLATFORM_OWNER
  ├── FULL_PLATFORM → all current commercial capabilities (CE-11, I-CE-16)
  └── SIMULATED_PLAN → current Live Plan capabilities (CE-12, I-CE-17)
```

Forbidden: `if (isOwner) return true` or `if (userId === 1)` outside the hub.

FULL_PLATFORM is not a customer subscription and is not subject to customer freeze, trial expiry, or subscription requirement (CE-23).

SIMULATED_PLAN MUST NOT use snapshots, version freezes, or a copied owner matrix.

This program does **not** change Owner Access Mode implementation.
