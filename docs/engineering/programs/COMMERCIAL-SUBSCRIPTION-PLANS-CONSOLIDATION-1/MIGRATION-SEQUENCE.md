# MIGRATION-SEQUENCE.md

| Phase | Status |
|-------|--------|
| **A** Forensics | **Done** |
| **B** Field ownership | **Done** |
| **C** Live Plan completeness | **Done** — no missing catalog fields |
| **D** Move catalog/configuration | **N/A** — Live Plan already holds catalog; no customer data to move |
| **E** Move application reads/writes | **Partial** — Checkout price source moved. Residuals listed below |
| **F** Remove legacy compatibility | **Not done** — `legacyPlanId` still required as handle |
| **G** Validate Checkout / Subscription / Entitlement | Checkout price + entitlements OK; DTO/webhook residuals remain |
| **H** MRR separately | **Required next** — COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1 |
| **I** Remove table | **Not done** — SAFE DELETE fails |

## Remaining Phase E items (later programs)

1. Webhook existence/name → Live Plan  
2. `getCurrentSubscription` plan DTO → Live Plan projection  
3. `listPlans` fallback removal  
4. Trial fallback removal  
5. CRS / admin notification names → Live Plan  
6. Admin invoice amount → Charged Terms or Live Plan offer  
7. Deprecated stats APIs → CMS Charged Terms  

Then identity cutover (`legacyPlanId` removal), then Phase I.

## Preferred next order

```
COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1
    → residual read removal (binding/identity program)
    → COMMERCIAL-SUBSCRIPTION-PLANS-SAFE-DELETE-1
```
