# ELIGIBILITY-MATRIX

**Program:** COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1

## Authority

Reuse the existing commercial hub flag `commercialStatus.countsInMrr`.

Do **not** create a second MRR eligibility system.

`countsInMrr` is set in `flagsForResolvedPlan` (`server/subscription-runtime/entitlementResolver.ts`) and owner-mode entitlements (`server/platform-owner-access/entitlements.ts`).

## Hub mapping (unchanged)

| Resolved plan / mode | `countsInMrr` | Enters MRR eligibility? |
|----------------------|---------------|-------------------------|
| BASIC | true | Yes — value from Charged Terms |
| PROFESSIONAL | true | Yes — value from Charged Terms |
| ENTERPRISE | true | Yes — value from Charged Terms |
| TRIAL | false | No |
| ADMIN | false | No |
| NONE | false | No |
| FULL_PLATFORM | false | No |
| SIMULATED_PLAN | false | No |

## Lifecycle → hub (unchanged)

| Lifecycle / account state | How the hub excludes | Extra MRR filter? |
|---------------------------|----------------------|-------------------|
| ACTIVE paid | Entitlements on → paid plan → `countsInMrr` true | No |
| Trial | Plan TRIAL → false | No |
| FROZEN | Entitlements off + canonical row → plan NONE → false | No |
| NONE (no customer subscription) | Plan NONE → false | No |
| Cancelled | Lifecycle disables entitlements → NONE → false | No |
| Expired | Lifecycle disables entitlements → NONE → false | No |
| Complimentary / zero-value | No dedicated plan code. If hub still says true, amount `<= 0` contributes 0 | Value rule, not a second eligibility system |

## Discrepancy check

ADR-036 exclude list vs hub:

| ADR-036 exclude | Hub already excludes? | Action |
|-----------------|----------------------|--------|
| TRIAL | Yes | Reuse |
| FROZEN | Yes (via entitlements off) | Reuse — documented, not rewritten |
| NONE | Yes | Reuse |
| PLATFORM_OWNER / ADMIN | Yes | Reuse |
| FULL_PLATFORM | Yes | Reuse |
| SIMULATED_PLAN | Yes | Reuse |
| Complimentary / zero-value | Via amount `<= 0` when otherwise eligible | Value classification `ZERO_VALUE` |
| Cancelled / expired | Yes | Reuse |

**Verdict:** Eligibility is already correct for the ADR-036 list. No entitlement rewrite.

## What CMS checks

```
countsInMrr === true
AND subscriptionId != null
AND Charged Terms row present
AND monthly-equivalent classification === INCLUDED
```

`subscriptionId` is a load key, not a new commercial rule. Missing id or missing terms → 0, not a catalog fallback.
