# UI-TRUTH-MATRIX.md

| Concept | Plan | UI Surface | Visible | Hidden | Locked | Direct URL | Server Enforcement | Canonical Source | Status |
|---------|------|------------|---------|--------|--------|------------|--------------------|------------------|--------|
| List price | All | Pricing | Y | | | `/pricing` | n/a (display) | Catalog | Display ≠ charge |
| Charge CTA | Paid | Pricing | Y | | Owner locked | `/pricing` | Checkout legacy | `subscription_plans` | LEGACY |
| Capabilities | All | Pricing / Editor | Y | Foundation/expo | Always-on cards | Admin catalog | Partial | Live bundle | Gap: flags_only |
| Limits | All | Editor | Y | Pricing | | Admin catalog | Create-path | Live limits | Pricing omit |
| Current plan | Customer | Dashboard / Pricing | Y | | | `/dashboard` | Hub | Entitlements | OK |
| Restaurant create | Customer | Dashboard | Y | | At cap | Dashboard | `checkLimit` | Live restaurants | OK |
| Devices | PRO+ | Dashboard | Conditional | If not entitled | | Dashboard | `requireFeature` | Hub | OK |
| Menu | All | Dashboard | Y | | Frozen | Dashboard | Frozen + item limit | Account + limits | Partial |
| Settings / templates | Paid-ish | Dashboard | Conditional | | | `/dashboard/templates/:id` | `isSubscriptionActive` | **Wrong path** | DUPLICATE |
| Reports | PRO+ | Dashboard | Conditional | | | Dashboard | UI only | Legacy `reports` | Gap |
| Billing history | — | Subscription | N | Y | | `/subscription` | — | — | MISSING |
| Frozen | Any expired | Pricing / QR | Banner | Dashboard | Mutations | `/pricing` | Frozen prefixes | Account state | OK |
| Owner simulation | Owner | Dashboard / Pricing | Y | Non-owner | Checkout | Dashboard | Owner entitlements | Access mode | OK |
| Diagnostics | — | — | N | Y | | `/commercial/diagnostics` | Auth | — | Hidden |
| Plan Editor | Admin | Platform Ops | Y | Regional prices | Code | `/admin/platform/commercial-catalog` | Admin + saveLive | Live Plan | OK |
