# OWNER-ACCESS-IMPACT.md

**Program:** COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1  
**Date:** 2026-08-14  
**Incident:** Platform owner sees expired-subscription messaging and cannot reliably use platform capabilities / renewal.

## Architecture used today (unchanged by this program)

```
Owner Account
  → account-level subscription (restaurantId = 0)
      pickUserLevelSubscription
  → getCommercialEntitlements → resolveOwnerEntitlements
  → restaurant operations
```

Files:

- `server/subscriptionResolver.ts` — `pickUserLevelSubscription`
- `server/commercial/ownerAccountSubscriptionAuthority.ts`
- `server/commercial/CommercialReadService.ts`
- `server/subscription-runtime/subscriptionRuntimeService.ts`

Protected platform account remains `ENV.ownerOpenId` (`server/platformAccount.ts`). Admin subscription mutations still refuse protected users (`subscriptionAudit.ts`).

## Does live-plans cause or worsen the incident?

**Not as the primary cause.** Expired messaging follows subscription **lifecycle** (`status` / `currentPeriodEnd`), which this program did not change.

**Possible worsening after a bad 0086 / hydrate:**

| Condition | Effect on owner |
|-----------|-----------------|
| Owner binding deleted (`planId` null) | Unbound → legacy matrix; if subscription is expired, still expired |
| Owner binding kept, live plan missing | **Fail-closed** (`NONE`) even if subscription row is active — **would worsen access** |
| CRS display still looks for `"snapshot"` source | Wrong plan **name** on bound live_plan; not an entitlement lock by itself |

## Preservation

- Account-level (`restaurantId = 0`) resolution is preserved.
- No new owner-only entitlement lock was introduced in code.
- `ownerHasEntitledAccountSubscription` still uses CRS → hub entitlements.

## Separate program

Treat the expired-owner incident as **unrelated** unless staging 0086 fail-closes the owner binding. Do **not** “fix” owner access inside this simplification. Recommended follow-up: inspect the owner’s `user_subscriptions` row (status, `currentPeriodEnd`, `restaurantId`) independently of catalog versioning.

**This incident does not by itself BLOCK live-plans certification**, but 0086 fail-closed/unreadable plan **must not** be applied against the owner row without a staging check.
