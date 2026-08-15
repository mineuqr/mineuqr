# FULL PLATFORM CONTRACT

## Existing behavior (verified)

`resolveOwnerEntitlements` treats `ENV.ownerOpenId` as PLATFORM_OWNER **before** customer Live Plan features. FULL_PLATFORM / SIMULATED_PLAN resolve only through **owner access entitlements**, not through a customer plan row.

`allCurrentFeatures()` grants every key in `FEATURE_KEYS`.

## Contract

| Actor | Plan capability OFF | Result |
|-------|---------------------|--------|
| PLATFORM_OWNER / FULL_PLATFORM | Irrelevant | **Allowed** — hub already grants all FEATURE_KEYS once the four keys join that set |
| Ordinary customer | OFF | **Denied** |
| Ordinary customer who sets a plan named FULL_PLATFORM or injects keys | — | **Impossible** — customers cannot author owner mode or FEATURE_KEYS |

## Forbidden

- New bypass (`if (isOwner) return true` outside the hub).
- Admin role = FULL_PLATFORM.
- Restaurant owner role = these four capabilities.
- Client-supplied owner flags.

No new authorization path. Implementation only adds the four keys to Projection / FEATURE_KEYS so the **existing** owner grant covers them.
