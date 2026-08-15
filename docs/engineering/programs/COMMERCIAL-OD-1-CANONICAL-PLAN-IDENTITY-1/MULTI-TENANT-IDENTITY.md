# MULTI-TENANT-IDENTITY

## Scope of `commercial_plans.id`

**Platform-global.**

`commercial_plans` has no `restaurantId`, `tenantId`, or owner column. The catalog is one platform catalog. A UUID uniquely identifies a Live Plan throughout the platform.

No composite identity (`tenantId + planId`) is required.

## What is tenant-scoped

Customer **subscription** rows, restaurant data, and Charged Terms are per-customer. Those are not plan identity.

## Environment

UUIDs are generated per catalog create. Staging and production catalogs are different deployments; they may share codes and have different UUIDs. That is correct: identity is per catalog instance, code is the portable business key.

## Tenancy

Not redesigned. Identity ≠ authorization. Tenant/RBAC/entitlement enforcement remains unchanged.
