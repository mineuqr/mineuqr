# FINAL-REPORT.md

## A. STATUS

**SUBSCRIPTION PLANS CONSOLIDATION — BLOCKED**

Checkout **price source** is consolidated onto Live Plans. Entitlements, Public Pricing, and Plan Editor already used Live Plans. **SAFE DELETE is blocked** by MRR and residual identity/DTO/webhook/invoice/fallback reads. No table drop. No MRR rewrite. No third catalog.

## B. BEFORE

```
Live Plans ──► Public Pricing (26.40)
subscription_plans ──► Checkout (39.00) ──► Provider
subscription_plans ──► MRR
Live Plans ──► Bind ──► Charged Terms
Live Plans ──► Entitlements
```

Two commercial price books.

## C. AFTER

```
                 LIVE PLANS
              Commercial Catalog
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       Identity  Capabilities  Limits
                     │
                     ▼
                 Offer Price
                     │
              ┌──────┴──────┐
              ▼             ▼
         Public Pricing   CHECKOUT  (same offer)
                            │
                            ▼
                       SUBSCRIPTION
                            │
                            ▼
                      CHARGED TERMS
                            │
                            ▼
                      MRR (target)
```

`subscription_plans` remains for **MRR + residual compatibility reads**, not as catalog authority for new Checkout.

## D. FIELD OWNERSHIP

See [FIELD-OWNERSHIP-MATRIX.md](./FIELD-OWNERSHIP-MATRIX.md). Prices → Live Plan offer. Quotas/features already on Live Plan. Stripe ids → provider/delete. Integer `id` → temporary compatibility handle.

## E. CHECKOUT

**Yes — charge creation now uses Live Plan Offer List Price** (`resolveCheckoutOfferFromLivePlan`). Numeric `planId` remains a compatibility handle. Tap SAR / FX not redesigned. Webhooks may still read the legacy table for existence/email.

## F. SUBSCRIPTION

Binding already writes Charged Terms from Live Plan at bind. No customer contracts to migrate. Integer `user_subscriptions.planId` remains a handle.

## G. MRR

Still reads `subscription_plans` prices. **COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1** required. Not implemented here.

## H. ENTITLEMENTS

**No legacy runtime dependency.** Already Live Plan / hub.

## I. ADMIN/API

Plan Editor: Live Plans. Invoice, DTO, listPlans fallback, notifications, deprecated stats: **legacy reads remain**.

## J. DATABASE

Table and ORM remain. No formal FK. No destructive migration.

## K. TEST/SEED

Added Live Plan checkout offer tests + guards. Payment/subscription tests mock the resolver. Seeds not deleted. MRR/invoice/webhook tests still mock legacy accessors.

## L. SAFE DELETE

**NO**

Blockers: MRR, webhooks, current-subscription DTO, listPlans/trial fallbacks, admin invoice, notification names, CRS name, deprecated stats, ORM/scripts, active-architecture tests.

## M. ADR IMPACT

034: no amendment. 035: later amendment recommended (price-source cutover). 036: no amendment.

## N. VALIDATION

Affected tests: **27 passed** (`commercialCheckoutLivePlanOffer`, adoption guards, `payment-flow`, `subscription`). Architecture guard: Checkout mutations must not call `getSubscriptionPlanById`. No Tax/FX/Provider invented. No third plan table. No customer contracts changed. Full-repo build not run.

## O. GIT

Reported in the user-facing closeout. **No commit. No push. No deploy.**
