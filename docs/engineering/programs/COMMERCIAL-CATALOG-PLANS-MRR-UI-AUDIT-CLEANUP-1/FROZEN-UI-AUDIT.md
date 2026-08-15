# FROZEN-UI-AUDIT.md

Account state (not a capability matrix).

| Check | Evidence | Status |
|-------|----------|--------|
| Login remains valid | Auth unchanged | PASS |
| Redirect to Pricing | `useFrozenCommercialRouteGuard`, `resolvePostAuthPath` | PASS |
| Dashboard inaccessible | Client redirect + Frozen mutation prefixes | PASS (UI); server still denies mutations |
| Commercial mutations denied | `assertCommercialAccountActive` + prefix list | PASS |
| Public QR Frozen experience | `loadQrOrderingRuntimeSources` `commercial_frozen` | PASS |
| Renewal available | Checkout not in Frozen blocklist; `/pricing` `/subscription` allowed | PASS |
| Data preserved | CE-17; no delete-on-freeze | PASS |
| Restoration | Re-enable entitlements → same restaurant/menu/QR identity | PASS (architecture) |

NONE: never-subscribed; not Frozen. Do not treat as Basic.
