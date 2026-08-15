# LOGIN-REDIRECT.md

## Rule

A FROZEN customer may authenticate. Authentication is not deleted or disabled.

Immediately after successful login:

```
FROZEN  →  /pricing
```

The user must not enter the normal commercial Dashboard.

## Implementation

`client/src/pages/SubscriberLogin.tsx` fetches `commercial.getEntitlements` after `syncAuthAfterLogin` and calls `resolvePostAuthPath`.

If `returnTo` is a commercial management path (`/dashboard`, `/dashboard/*`, `/statistics`) and state is FROZEN, the destination is `/pricing`.

Plans / subscription / billing paths remain reachable.

If entitlements cannot be fetched, login still succeeds and uses the requested path; the Dashboard route guard then redirects when meta resolves to FROZEN.

## Owner

Platform Owner is `ACTIVE` (`platform_owner_exempt`) and is not sent to Plans by Frozen.
