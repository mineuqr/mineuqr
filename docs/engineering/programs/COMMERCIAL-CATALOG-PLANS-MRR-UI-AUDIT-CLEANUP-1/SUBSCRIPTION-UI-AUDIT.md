# SUBSCRIPTION-UI-AUDIT.md

Page: `SubscriptionManagement.tsx` · `/subscription` (allowed when FROZEN).

| Surface | Class |
|---------|-------|
| Current plan | VISIBLE (legacy row + canonical label) |
| Billing period | VISIBLE (legacy subscription) |
| Charged amount | WRONG_SOURCE / incomplete — may show `plan.maxRestaurants` and legacy plan fields, not binding charged terms |
| Renewal / expiry | VISIBLE dates |
| Trial | VISIBLE if trial row |
| Frozen | Not a dedicated subscription badge; Pricing banner is the Frozen UX |
| Upgrade | CTA to Pricing |
| Downgrade | HIDDEN |
| Cancel | ORPHANED stub (TODO, no API) |
| Payment history | MISSING on this page |

`/subscription/success` and `/subscription/cancel` are checkout return routes.
