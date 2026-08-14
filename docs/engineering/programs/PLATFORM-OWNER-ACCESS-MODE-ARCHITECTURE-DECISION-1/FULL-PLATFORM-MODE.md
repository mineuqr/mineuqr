# FULL-PLATFORM-MODE.md

## Semantics

`PLATFORM_OWNER + FULL_PLATFORM` grants **every current commercial capability** in the runtime vocabulary at resolve time.

```
for each key in COMMERCIAL_PROJECTION_IDS ∪ RUNTIME_ENTITLEMENT_FEATURE_KEYS:
  enabled = true
commercial limits (restaurants / categories / items) = unrestricted (null)
no subscription, plan, binding, expiry, or snapshot
```

A capability added to Projection tomorrow is included on the **next resolve**. No owner migration, no matrix edit, no manual assignment.

Do **not** implement Full Platform as “copy Enterprise” or “use `planFeatureMatrix.ADMIN` forever.” Those freeze yesterday’s set.

## Commercial vs safety limits

| Kind | Full Platform |
|------|----------------|
| Commercial entitlement limits (restaurants, items, categories, plan feature flags) | Unrestricted |
| Auth / session / CSRF / verified-email where already required for mutations | **Enforced** |
| Rate limits, abuse controls | **Enforced** |
| Database constraints, transactions, backups | **Enforced** |
| Print / device / connector operational safety | **Enforced** |
| Tenant isolation (cannot act as another customer’s owner) | **Enforced** |

Full Platform is unrestricted **commercial product** access on the owner’s own restaurants, not a bypass of platform safety.
