# CACHE-ISOLATION.md

Cache identity (`server/subscription-runtime/cache.ts`):

```
customer:{ownerId}:{second}
platform_owner:{ownerId}:{mode}:{simulatedPlanCode|-}:{second}
```

Owner Full Platform, Owner Simulated Basic/Professional/Enterprise, and customer Live Plan entries cannot collide.

Mode change invalidates **that owner’s** entitlement keys only (`invalidateEntitlementCache(ownerUserId)`). Customer caches are not globally wiped.
