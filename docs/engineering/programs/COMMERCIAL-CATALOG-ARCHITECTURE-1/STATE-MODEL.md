# STATE-MODEL.md

## Distinct planes (do not merge)

| Plane | Values | Authoritative for |
|-------|--------|-------------------|
| **Catalog** | Live Plan exists / hidden | What can be sold or simulated |
| **Offer** | Selected plan + cycle + currency | Checkout intent |
| **Subscription instance** | `trial` / `active` / `canceled` / `expired` + periods | Billing row |
| **Charged terms** | Binding amounts | Contracted recurring amount |
| **Entitlement resolution** | Plan + features + limits + `countsInMrr` | CanUse / checkLimit inputs |
| **Account state** | ACTIVE / FROZEN / NONE | Commercial operational access |
| **Owner mode** | FULL_PLATFORM / SIMULATED_PLAN | Control-account override |

## Account state (canonical)

Applies to the **commercial account (owner)**, not to a single capability.

| State | Meaning |
|-------|---------|
| **ACTIVE** | Commercially entitled to use Live Plan capabilities subject to limits. Dashboard and QR active experience allowed. |
| **FROZEN** | Historical association retained. Commercial management and active public menu **blocked**. Login valid. Redirect to Pricing. Renewal allowed. Data preserved. |
| **NONE** | No commercial entitlement. Not a Basic fallback. Not Frozen. |

Capability/limit decisions are evaluated **only if** account state permits (ACTIVE, or Owner exemption). FROZEN short-circuits to deny commercial mutations regardless of limit `null`.

## Expiration rule (preserved)

Customer subscription expiry → entitlements disabled → **FROZEN** → dashboard / menu / screens / QR active menu denied; login → Pricing.

**Exception:** PLATFORM_OWNER + FULL_PLATFORM is outside customer expiration. SIMULATED_PLAN follows the selected Live Plan, still not a billed subscription.

## Valid transitions (customer)

```
NONE ──checkout/trial──► ACTIVE
ACTIVE ──period end / entitlements off──► FROZEN
FROZEN ──renewal / paid reactivation──► ACTIVE
ACTIVE ──cancel at period end──► FROZEN (or NONE if product later defines immediate NONE)
Owner FULL_PLATFORM ──not──► FROZEN via customer expiry
```

## Invalid

- Catalog price edit → rewrite charged terms
- FROZEN → create restaurant because limit is Unlimited
- NONE → treat as Basic
- `role === admin` → commercial grant
- Owner simulation → checkout or MRR
- Check Revenue ← MRR or vice versa
