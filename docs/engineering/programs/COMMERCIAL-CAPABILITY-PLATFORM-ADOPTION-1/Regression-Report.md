# Regression Report — COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1

## Scope

Confirm operational validation did **not** regress certified planes.

## Results

| Plane | Check | Result |
|-------|-------|--------|
| Billing / Checkout | Pricing still calls `createCheckoutSession` / `createTapCheckout` | **PASS** (source) |
| Commercial Catalog | Publish/CC-16 path used; unknown keys rejected | **PASS** |
| Capability Discovery | CAP-01…46 catalog document intact | **PASS** |
| Subscription Runtime | Enforcement suite green | **PASS** (`subscriptionRuntimeEntitlement.enforcement.test.ts`) |
| Public Publishing | Prior public publishing behaviors still hold | **PASS** (E2E overlaps) |
| Platform Adoption | Public offerings + no `subscription.listPlans` on Pricing | **PASS** |

## Combined automated run (2026-07-30)

```
commercialCapabilityOperationalValidation.test.ts     8 PASS
commercialCapabilityPlatformAdoption.guards.test.ts   7 PASS
subscriptionRuntimeEntitlement.enforcement.test.ts    (included in 30)
commercialPlatformAdoption.guards.test.ts             (included in 30)
────────────────────────────────────────────────────
Total                                                 30/30 PASS
```

## Forbidden actions (honored)

- No architecture modification for this validation  
- No redesign / refactor / new capabilities  
- No commit / push / deploy  

## Verdict

**NO REGRESSION DETECTED** in Billing, Checkout, Commercial Catalog, Capability Discovery, or Subscription Runtime relative to certified baselines exercised by these suites.
